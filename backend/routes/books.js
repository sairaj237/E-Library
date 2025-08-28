const express = require('express');
const pool = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get all books with search functionality
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, category, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM books WHERE 1=1';
    let params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (title ILIKE $${paramCount} OR author ILIKE $${paramCount} OR isbn ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (category) {
      paramCount++;
      query += ` AND category ILIKE $${paramCount}`;
      params.push(`%${category}%`);
    }

    query += ` ORDER BY title LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM books WHERE 1=1';
    let countParams = [];
    let countParamCount = 0;

    if (search) {
      countParamCount++;
      countQuery += ` AND (title ILIKE $${countParamCount} OR author ILIKE $${countParamCount} OR isbn ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    if (category) {
      countParamCount++;
      countQuery += ` AND category ILIKE $${countParamCount}`;
      countParams.push(`%${category}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalBooks = parseInt(countResult.rows[0].count);

    res.json({
      books: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalBooks / limit),
        totalBooks,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get book by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('SELECT * FROM books WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json({ book: result.rows[0] });
  } catch (error) {
    console.error('Get book error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new book (admin and librarian only)
router.post('/', authenticateToken, authorizeRoles('admin', 'librarian'), async (req, res) => {
  try {
    const {
      isbn,
      title,
      author,
      publisher,
      publication_year,
      category,
      total_copies,
      description
    } = req.body;

    if (!title || !author) {
      return res.status(400).json({ error: 'Title and author are required' });
    }

    const available_copies = total_copies || 1;

    const result = await pool.query(
      `INSERT INTO books (isbn, title, author, publisher, publication_year, category, total_copies, available_copies, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [isbn, title, author, publisher, publication_year, category, total_copies || 1, available_copies, description]
    );

    res.status(201).json({
      message: 'Book added successfully',
      book: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'ISBN already exists' });
    }
    console.error('Add book error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update book (admin and librarian only)
router.put('/:id', authenticateToken, authorizeRoles('admin', 'librarian'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      isbn,
      title,
      author,
      publisher,
      publication_year,
      category,
      total_copies,
      description
    } = req.body;

    if (!title || !author) {
      return res.status(400).json({ error: 'Title and author are required' });
    }

    // Get current book to calculate available copies
    const currentBook = await pool.query('SELECT * FROM books WHERE id = $1', [id]);
    if (currentBook.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const current = currentBook.rows[0];
    const issuedCopies = current.total_copies - current.available_copies;
    const newAvailableCopies = Math.max(0, (total_copies || current.total_copies) - issuedCopies);

    const result = await pool.query(
      `UPDATE books SET 
       isbn = $1, title = $2, author = $3, publisher = $4, 
       publication_year = $5, category = $6, total_copies = $7, 
       available_copies = $8, description = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 RETURNING *`,
      [
        isbn || current.isbn,
        title,
        author,
        publisher || current.publisher,
        publication_year || current.publication_year,
        category || current.category,
        total_copies || current.total_copies,
        newAvailableCopies,
        description || current.description,
        id
      ]
    );

    res.json({
      message: 'Book updated successfully',
      book: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'ISBN already exists' });
    }
    console.error('Update book error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete book (admin only)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if book has active transactions
    const activeTransactions = await pool.query(
      'SELECT COUNT(*) FROM transactions WHERE book_id = $1 AND status = $2',
      [id, 'issued']
    );

    if (parseInt(activeTransactions.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete book with active transactions' });
    }

    const result = await pool.query('DELETE FROM books WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json({
      message: 'Book deleted successfully',
      book: result.rows[0]
    });
  } catch (error) {
    console.error('Delete book error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get book categories
router.get('/categories/list', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT category FROM books WHERE category IS NOT NULL ORDER BY category'
    );

    res.json({
      categories: result.rows.map(row => row.category)
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

