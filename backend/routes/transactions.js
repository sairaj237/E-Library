const express = require('express');
const pool = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Issue a book (librarian and admin only)
router.post('/issue', authenticateToken, authorizeRoles('admin', 'librarian'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { user_id, book_id, due_date } = req.body;

    if (!user_id || !book_id || !due_date) {
      return res.status(400).json({ error: 'User ID, Book ID, and due date are required' });
    }

    // Check if user exists and is a student
    const userResult = await client.query(
      'SELECT * FROM users WHERE id = $1',
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if book exists and is available
    const bookResult = await client.query(
      'SELECT * FROM books WHERE id = $1',
      [book_id]
    );

    if (bookResult.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const book = bookResult.rows[0];
    if (book.available_copies <= 0) {
      return res.status(400).json({ error: 'Book is not available' });
    }

    // Check if user already has this book issued
    const existingTransaction = await client.query(
      'SELECT * FROM transactions WHERE user_id = $1 AND book_id = $2 AND status = $3',
      [user_id, book_id, 'issued']
    );

    if (existingTransaction.rows.length > 0) {
      return res.status(400).json({ error: 'User already has this book issued' });
    }

    // Create transaction
    const transactionResult = await client.query(
      `INSERT INTO transactions (user_id, book_id, due_date, issued_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [user_id, book_id, due_date, req.user.id]
    );

    // Update book available copies
    await client.query(
      'UPDATE books SET available_copies = available_copies - 1 WHERE id = $1',
      [book_id]
    );

    await client.query('COMMIT');

    // Get complete transaction details
    const completeTransaction = await pool.query(
      `SELECT t.*, u.username, u.full_name, b.title, b.author, b.isbn
       FROM transactions t
       JOIN users u ON t.user_id = u.id
       JOIN books b ON t.book_id = b.id
       WHERE t.id = $1`,
      [transactionResult.rows[0].id]
    );

    res.status(201).json({
      message: 'Book issued successfully',
      transaction: completeTransaction.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Issue book error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Return a book (librarian and admin only)
router.post('/return', authenticateToken, authorizeRoles('admin', 'librarian'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { transaction_id, fine_amount = 0 } = req.body;

    if (!transaction_id) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    // Get transaction details
    const transactionResult = await client.query(
      'SELECT * FROM transactions WHERE id = $1 AND status = $2',
      [transaction_id, 'issued']
    );

    if (transactionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Active transaction not found' });
    }

    const transaction = transactionResult.rows[0];

    // Update transaction
    const updatedTransaction = await client.query(
      `UPDATE transactions SET 
       return_date = CURRENT_DATE, 
       status = 'returned', 
       fine_amount = $1, 
       returned_to = $2,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING *`,
      [fine_amount, req.user.id, transaction_id]
    );

    // Update book available copies
    await client.query(
      'UPDATE books SET available_copies = available_copies + 1 WHERE id = $1',
      [transaction.book_id]
    );

    await client.query('COMMIT');

    // Get complete transaction details
    const completeTransaction = await pool.query(
      `SELECT t.*, u.username, u.full_name, b.title, b.author, b.isbn
       FROM transactions t
       JOIN users u ON t.user_id = u.id
       JOIN books b ON t.book_id = b.id
       WHERE t.id = $1`,
      [transaction_id]
    );

    res.json({
      message: 'Book returned successfully',
      transaction: completeTransaction.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Return book error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Get all transactions with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, user_id, book_id, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT t.*, u.username, u.full_name, u.student_id, b.title, b.author, b.isbn,
             ib.username as issued_by_username, rb.username as returned_to_username
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      JOIN books b ON t.book_id = b.id
      LEFT JOIN users ib ON t.issued_by = ib.id
      LEFT JOIN users rb ON t.returned_to = rb.id
      WHERE 1=1
    `;
    
    let params = [];
    let paramCount = 0;

    // If user is a student, only show their transactions
    if (req.user.role === 'student') {
      paramCount++;
      query += ` AND t.user_id = $${paramCount}`;
      params.push(req.user.id);
    } else if (user_id) {
      paramCount++;
      query += ` AND t.user_id = $${paramCount}`;
      params.push(user_id);
    }

    if (status) {
      paramCount++;
      query += ` AND t.status = $${paramCount}`;
      params.push(status);
    }

    if (book_id) {
      paramCount++;
      query += ` AND t.book_id = $${paramCount}`;
      params.push(book_id);
    }

    query += ` ORDER BY t.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) FROM transactions t
      WHERE 1=1
    `;
    let countParams = [];
    let countParamCount = 0;

    if (req.user.role === 'student') {
      countParamCount++;
      countQuery += ` AND t.user_id = $${countParamCount}`;
      countParams.push(req.user.id);
    } else if (user_id) {
      countParamCount++;
      countQuery += ` AND t.user_id = $${countParamCount}`;
      countParams.push(user_id);
    }

    if (status) {
      countParamCount++;
      countQuery += ` AND t.status = $${countParamCount}`;
      countParams.push(status);
    }

    if (book_id) {
      countParamCount++;
      countQuery += ` AND t.book_id = $${countParamCount}`;
      countParams.push(book_id);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalTransactions = parseInt(countResult.rows[0].count);

    res.json({
      transactions: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalTransactions / limit),
        totalTransactions,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get overdue books
router.get('/overdue', authenticateToken, authorizeRoles('admin', 'librarian'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, u.username, u.full_name, u.student_id, u.email, b.title, b.author, b.isbn
       FROM transactions t
       JOIN users u ON t.user_id = u.id
       JOIN books b ON t.book_id = b.id
       WHERE t.status = 'issued' AND t.due_date < CURRENT_DATE
       ORDER BY t.due_date ASC`
    );

    res.json({
      overdueBooks: result.rows
    });
  } catch (error) {
    console.error('Get overdue books error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get transaction by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    let query = `
      SELECT t.*, u.username, u.full_name, u.student_id, b.title, b.author, b.isbn,
             ib.username as issued_by_username, rb.username as returned_to_username
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      JOIN books b ON t.book_id = b.id
      LEFT JOIN users ib ON t.issued_by = ib.id
      LEFT JOIN users rb ON t.returned_to = rb.id
      WHERE t.id = $1
    `;

    // If user is a student, only allow viewing their own transactions
    if (req.user.role === 'student') {
      query += ' AND t.user_id = $2';
      const result = await pool.query(query, [id, req.user.id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      return res.json({ transaction: result.rows[0] });
    }

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ transaction: result.rows[0] });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

