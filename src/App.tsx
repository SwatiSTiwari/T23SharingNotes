import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

// Main Pages
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Feedback from './pages/Feedback';

// Notes Pages
import Notes from './pages/notes/Notes';
import NoteForm from './pages/notes/NoteForm';
import NoteDetail from './pages/notes/NoteDetail';

// Assignments Pages
import Assignments from './pages/assignments/Assignments';
import AssignmentDetail from './pages/assignments/AssignmentDetail';

// Announcements Pages
import Announcements from './pages/announcements/Announcements';
import AnnouncementForm from './pages/announcements/AnnouncementForm';
import AnnouncementDetail from './pages/announcements/AnnouncementDetail';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastContainer position="top-right" autoClose={3000} />
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Protected Routes */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />
            
            {/* Notes Routes */}
            <Route path="notes" element={<Notes />} />
            <Route path="notes/new" element={<NoteForm />} />
            <Route path="notes/:id" element={<NoteDetail />} />
            <Route path="notes/:id/edit" element={<NoteForm />} />
            
            {/* Assignments Routes */}
            <Route path="assignments" element={<Assignments />} />
            <Route path="assignments/:id" element={<AssignmentDetail />} />
            
            {/* Announcements Routes */}
            <Route path="announcements" element={<Announcements />} />
            <Route path="announcements/new" element={<AnnouncementForm />} />
            <Route path="announcements/:id" element={<AnnouncementDetail />} />
            <Route path="announcements/:id/edit" element={<AnnouncementForm />} />
            
            {/* Feedback Route */}
            <Route path="feedback" element={<Feedback />} />
          </Route>
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;