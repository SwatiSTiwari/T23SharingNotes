import React from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  FileText,
  Bell,
  LogOut,
  User,
  Menu,
  X,
  Home,
} from 'lucide-react';

const Layout: React.FC = () => {
  const { user, signOut, loading } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const navItems = [
    { path: '/dashboard', icon: <Home size={20} />, label: 'Dashboard' },
    { path: '/notes', icon: <BookOpen size={20} />, label: 'Notes' },
    {
      path: '/assignments',
      icon: <FileText size={20} />,
      label: 'Assignments',
    },
    {
      path: '/announcements',
      icon: <Bell size={20} />,
      label: 'Announcements',
    },
    { path: '/profile', icon: <User size={20} />, label: 'Profile' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="bg-white shadow-sm py-4 px-6 flex justify-between items-center md:hidden">
        <Link to="/dashboard" className="text-xl font-bold text-blue-600">
          Academic content sharing web app
        </Link>
        <button onClick={toggleMenu} className="text-gray-600">
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      <div className="flex flex-1">
        {/* Sidebar for desktop */}
        <aside className="hidden md:flex md:w-64 flex-col bg-white shadow-md">
          <div className="p-6">
            <Link to="/dashboard" className="text-2xl font-bold text-blue-600">
              T23Sharing
            </Link>
          </div>
          <nav className="flex-1 px-4 py-2">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                      location.pathname === item.path
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {item.icon}
                    <span className="ml-3">{item.label}</span>
                  </Link>
                </li>
              ))}
              <li>
                <button
                  onClick={signOut}
                  className="w-full flex items-center px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <LogOut size={20} />
                  <span className="ml-3">Sign Out</span>
                </button>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="fixed inset-0 z-50 bg-white md:hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <Link
                to="/dashboard"
                className="text-xl font-bold text-blue-600"
                onClick={closeMenu}
              >
                T23Sharing
              </Link>
              <button onClick={closeMenu} className="text-gray-600">
                <X size={24} />
              </button>
            </div>
            <nav className="p-6">
              <ul className="space-y-4">
                {navItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center py-2 ${
                        location.pathname === item.path
                          ? 'text-blue-600 font-medium'
                          : 'text-gray-600'
                      }`}
                      onClick={closeMenu}
                    >
                      {item.icon}
                      <span className="ml-3">{item.label}</span>
                    </Link>
                  </li>
                ))}
                <li>
                  <button
                    onClick={() => {
                      closeMenu();
                      signOut();
                    }}
                    className="flex items-center py-2 text-gray-600 w-full text-left"
                  >
                    <LogOut size={20} />
                    <span className="ml-3">Sign Out</span>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
