-- Library Management System Database Schema Initialization

-- Users table with role-based access
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'librarian', 'student')),
    full_name VARCHAR(100) NOT NULL,
    student_id VARCHAR(20) UNIQUE, -- Only for students
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Books table
CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    isbn VARCHAR(20) UNIQUE,
    title VARCHAR(200) NOT NULL,
    author VARCHAR(100) NOT NULL,
    publisher VARCHAR(100),
    publication_year INTEGER,
    category VARCHAR(50),
    total_copies INTEGER NOT NULL DEFAULT 1,
    available_copies INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Book transactions (issue/return)
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    return_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'returned', 'overdue')),
    fine_amount DECIMAL(10,2) DEFAULT 0.00,
    issued_by INTEGER REFERENCES users(id), -- Librarian who issued the book
    returned_to INTEGER REFERENCES users(id), -- Librarian who received the return
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_author ON books(author);
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_book_id ON transactions(book_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_due_date ON transactions(due_date);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password_hash, role, full_name) VALUES 
('admin', 'admin@library.com', '$2b$10$rQZ8kHp0rQZ8kHp0rQZ8kOqJ8kHp0rQZ8kHp0rQZ8kHp0rQZ8kHp0r', 'admin', 'System Administrator');

-- Insert sample librarian (password: librarian123)
INSERT INTO users (username, email, password_hash, role, full_name) VALUES 
('librarian1', 'librarian@library.com', '$2b$10$rQZ8kHp0rQZ8kHp0rQZ8kOqJ8kHp0rQZ8kHp0rQZ8kHp0rQZ8kHp0r', 'librarian', 'John Librarian');

-- Insert sample student (password: student123)
INSERT INTO users (username, email, password_hash, role, full_name, student_id) VALUES 
('student1', 'student@library.com', '$2b$10$rQZ8kHp0rQZ8kHp0rQZ8kOqJ8kHp0rQZ8kHp0rQZ8kHp0rQZ8kHp0r', 'student', 'Jane Student', 'STU001');

-- Insert sample books
INSERT INTO books (isbn, title, author, publisher, publication_year, category, total_copies, available_copies, description) VALUES 
('978-0-123456-78-9', 'Introduction to Computer Science', 'John Smith', 'Tech Publishers', 2023, 'Computer Science', 5, 5, 'A comprehensive guide to computer science fundamentals'),
('978-0-987654-32-1', 'Advanced Mathematics', 'Mary Johnson', 'Academic Press', 2022, 'Mathematics', 3, 3, 'Advanced mathematical concepts and applications'),
('978-0-456789-01-2', 'World History', 'Robert Brown', 'History Books Inc', 2021, 'History', 4, 4, 'A detailed exploration of world history'),
('978-0-234567-89-0', 'Physics Principles', 'Sarah Wilson', 'Science Publications', 2023, 'Physics', 6, 6, 'Fundamental principles of physics'),
('978-0-345678-90-1', 'English Literature', 'David Miller', 'Literary Press', 2020, 'Literature', 2, 2, 'Classic and modern English literature');

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

