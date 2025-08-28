'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { transactionsAPI, booksAPI, authAPI } from '../../lib/api';
import { 
  Clock, 
  BookOpen, 
  User, 
  Calendar,
  Filter,
  Plus,
  ArrowLeft,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

export default function TransactionsPage() {
  const { user, loading: authLoading, canManageBooks } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalTransactions: 0,
    limit: 10
  });
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [issueForm, setIssueForm] = useState({
    user_id: '',
    book_id: '',
    due_date: ''
  });
  const [returnForm, setReturnForm] = useState({
    transaction_id: '',
    fine_amount: 0
  });
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [overdueBooks, setOverdueBooks] = useState([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
      if (canManageBooks()) {
        fetchBooksAndUsers();
        fetchOverdueBooks();
      }
    }
  }, [user, filter, pagination.currentPage]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.currentPage,
        limit: pagination.limit,
        status: filter !== 'all' ? filter : undefined
      };

      const response = await transactionsAPI.getTransactions(params);
      setTransactions(response.data.transactions);
      setPagination(prev => ({
        ...prev,
        ...response.data.pagination
      }));
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBooksAndUsers = async () => {
    try {
      const [booksResponse, usersResponse] = await Promise.all([
        booksAPI.getBooks({ limit: 1000 }),
        authAPI.getUsers()
      ]);
      
      setBooks(booksResponse.data.books.filter(book => book.available_copies > 0));
      setUsers(usersResponse.data.users.filter(u => u.role === 'student'));
    } catch (error) {
      console.error('Error fetching books and users:', error);
    }
  };

  const fetchOverdueBooks = async () => {
    try {
      const response = await transactionsAPI.getOverdueBooks();
      setOverdueBooks(response.data.overdueBooks);
    } catch (error) {
      console.error('Error fetching overdue books:', error);
    }
  };

  const handleIssueBook = async (e) => {
    e.preventDefault();
    try {
      await transactionsAPI.issueBook(issueForm);
      setShowIssueForm(false);
      setIssueForm({ user_id: '', book_id: '', due_date: '' });
      fetchTransactions();
      fetchBooksAndUsers();
    } catch (error) {
      alert('Error issuing book: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  const handleReturnBook = async (e) => {
    e.preventDefault();
    try {
      await transactionsAPI.returnBook(returnForm);
      setShowReturnForm(false);
      setReturnForm({ transaction_id: '', fine_amount: 0 });
      fetchTransactions();
      fetchOverdueBooks();
    } catch (error) {
      alert('Error returning book: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'issued':
        return 'bg-yellow-100 text-yellow-800';
      case 'returned':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (dueDate, status) => {
    return status === 'issued' && new Date(dueDate) < new Date();
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Transactions
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {user.role === 'student' 
                  ? 'View your book borrowing history' 
                  : 'Manage book issue and return transactions'}
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
              {canManageBooks() && (
                <>
                  <button
                    onClick={() => setShowIssueForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Issue Book
                  </button>
                  <button
                    onClick={() => setShowReturnForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Return Book
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Overdue Books Alert */}
          {canManageBooks() && overdueBooks.length > 0 && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Overdue Books Alert
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>There are {overdueBooks.length} overdue books that need attention.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="mt-6 bg-white shadow rounded-lg p-6">
            <div className="flex items-center space-x-4">
              <Filter className="h-5 w-5 text-gray-400" />
              <div className="flex space-x-4">
                {['all', 'issued', 'returned'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      filter === status
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-md">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading transactions...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center">
                <Clock className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filter !== 'all' 
                    ? `No ${filter} transactions found.` 
                    : 'No transactions have been recorded yet.'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <li key={transaction.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <BookOpen className="h-8 w-8 text-indigo-600" />
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center">
                              <p className="text-lg font-medium text-gray-900">{transaction.title}</p>
                              {isOverdue(transaction.due_date, transaction.status) && (
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Overdue
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">by {transaction.author}</p>
                            <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                              <span className="flex items-center">
                                <User className="mr-1 h-4 w-4" />
                                {transaction.full_name}
                                {transaction.student_id && ` (${transaction.student_id})`}
                              </span>
                              <span className="flex items-center">
                                <Calendar className="mr-1 h-4 w-4" />
                                Issued: {new Date(transaction.issue_date).toLocaleDateString()}
                              </span>
                              <span className="flex items-center">
                                <Calendar className="mr-1 h-4 w-4" />
                                Due: {new Date(transaction.due_date).toLocaleDateString()}
                              </span>
                              {transaction.return_date && (
                                <span className="flex items-center">
                                  <Calendar className="mr-1 h-4 w-4" />
                                  Returned: {new Date(transaction.return_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {transaction.fine_amount > 0 && (
                              <div className="mt-1 text-sm text-red-600">
                                Fine: ${transaction.fine_amount}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                            {transaction.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Issue Book Modal */}
      {showIssueForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Issue Book</h3>
              <form onSubmit={handleIssueBook} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Student</label>
                  <select
                    value={issueForm.user_id}
                    onChange={(e) => setIssueForm(prev => ({ ...prev, user_id: e.target.value }))}
                    required
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">Select a student</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.student_id})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Book</label>
                  <select
                    value={issueForm.book_id}
                    onChange={(e) => setIssueForm(prev => ({ ...prev, book_id: e.target.value }))}
                    required
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">Select a book</option>
                    {books.map((book) => (
                      <option key={book.id} value={book.id}>
                        {book.title} by {book.author} (Available: {book.available_copies})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={issueForm.due_date}
                    onChange={(e) => setIssueForm(prev => ({ ...prev, due_date: e.target.value }))}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowIssueForm(false)}
                    className="px-4 py-2 bg-white text-gray-500 text-base font-medium rounded-md shadow-sm border border-gray-300 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-indigo-700"
                  >
                    Issue Book
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Return Book Modal */}
      {showReturnForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Return Book</h3>
              <form onSubmit={handleReturnBook} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Transaction</label>
                  <select
                    value={returnForm.transaction_id}
                    onChange={(e) => setReturnForm(prev => ({ ...prev, transaction_id: e.target.value }))}
                    required
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">Select a transaction</option>
                    {transactions.filter(t => t.status === 'issued').map((transaction) => (
                      <option key={transaction.id} value={transaction.id}>
                        {transaction.title} - {transaction.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fine Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={returnForm.fine_amount}
                    onChange={(e) => setReturnForm(prev => ({ ...prev, fine_amount: parseFloat(e.target.value) || 0 }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowReturnForm(false)}
                    className="px-4 py-2 bg-white text-gray-500 text-base font-medium rounded-md shadow-sm border border-gray-300 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-green-700"
                  >
                    Return Book
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

