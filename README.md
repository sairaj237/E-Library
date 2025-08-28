# Library Management System

A library management system with role-based authentication and full CRUD operations for books and transactions.

## Features

### Authentication & Authorization
- Role-based login system (Admin, Librarian, Student)
- Protected routes based on user roles

### Book Management
- Add, edit, and delete books
- Search and filter books
- Track book inventory

### Transaction Management
- Issue and return books
- Track due dates and calculate fines
- View transaction history

## Technology Stack

### Backend
- Express.js
- PostgreSQL
- JWT Authentication

### Frontend
- Next.js
- React
- Tailwind CSS

## Project Structure

```
library-management-system/
├── backend/                 # Express.js API server
│   ├── config/             # Configuration files
│   ├── middleware/         # Authentication middleware
│   ├── routes/             # API endpoints
│   └── server.js           # Main server file
├── frontend/               # Next.js application
│   ├── app/                # Pages and layouts
│   ├── contexts/           # React contexts
│   └── lib/                # Utility functions
├── database_schema.sql     # Database schema
└── init_schema.sql         # Initial data
```

## Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/library-management-system.git
   cd library-management-system
   ```

2. Set up the backend
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Update .env with your database credentials
   ```

3. Set up the frontend
   ```bash
   cd ../frontend
   npm install
   cp .env.local.example .env.local
   ```

4. Initialize the database
   - Create a new PostgreSQL database
   - Run `database_schema.sql` and `init_schema.sql`

5. Start the development servers
   ```bash
   # In backend directory
   npm run dev
   
   # In frontend directory (new terminal)
   npm run dev
   ```

6. Access the application
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get current user profile
- `POST /api/auth/register` - Register new user (admin only)
- `GET /api/auth/users` - Get all users (admin only)

### Books
- `GET /api/books` - Get all books with search/filter
- `GET /api/books/:id` - Get specific book
- `POST /api/books` - Add new book (admin/librarian)
- `PUT /api/books/:id` - Update book (admin/librarian)
- `DELETE /api/books/:id` - Delete book (admin only)
- `GET /api/books/categories/list` - Get all categories

### Transactions
- `GET /api/transactions` - Get transactions with filters
- `GET /api/transactions/:id` - Get specific transaction
- `POST /api/transactions/issue` - Issue book (admin/librarian)
- `POST /api/transactions/return` - Return book (admin/librarian)
- `GET /api/transactions/overdue` - Get overdue books (admin/librarian)

## 🎨 UI/UX Features

### Design System
- **Consistent color palette** with indigo primary colors
- **Professional typography** using Inter font family
- **Responsive grid layouts** adapting to all screen sizes
- **Interactive components** with hover states and transitions
- **Accessible forms** with proper labels and validation

### User Experience
- **Intuitive navigation** with clear breadcrumbs and menu structure
- **Real-time feedback** for all user actions
- **Loading states** and error handling
- **Modal dialogs** for complex operations
- **Search and filter** functionality with instant results

## 🔒 Security Features

- **JWT-based authentication** with secure token storage
- **Role-based access control** preventing unauthorized actions
- **Password hashing** using bcrypt with salt rounds
- **SQL injection protection** through parameterized queries
- **CORS configuration** for secure cross-origin requests
- **Input validation** on both frontend and backend

## 📱 Responsive Design

The application is fully responsive and optimized for:
- **Desktop computers** (1024px and above)
- **Tablets** (768px to 1023px)
- **Mobile phones** (320px to 767px)
- **Touch interfaces** with appropriate button sizes
- **Keyboard navigation** support for accessibility

## 🚀 Deployment Options

### Development
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- Database: Local PostgreSQL instance

### Production Considerations
- Environment variable configuration for production
- Database connection pooling for scalability
- HTTPS configuration for secure communication
- Static asset optimization and CDN integration
- Error logging and monitoring setup

## 📊 Sample Data

The system includes sample data for immediate testing:
- **5 books** across different categories (Computer Science, Mathematics, History, Physics, Literature)
- **3 user accounts** representing all roles
- **Complete book metadata** including ISBN, publisher, and descriptions
- **Category structure** for organized browsing

## 🤝 Contributing

This library management system is designed to be extensible and maintainable:
- **Modular architecture** with clear separation of concerns
- **Comprehensive error handling** throughout the application
- **Consistent code style** and documentation
- **Test-ready structure** for future unit and integration tests


---



