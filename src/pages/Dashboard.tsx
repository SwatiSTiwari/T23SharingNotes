import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { BookOpen, FileText, Bell, Calendar } from 'lucide-react';
import type { Assignment, Note, Announcement } from '../lib/supabase';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<Assignment[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch recent notes
        const { data: notes, error: notesError } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(3);
        
        if (notesError) throw notesError;
        
        // Fetch upcoming assignments
        const { data: assignments, error: assignmentsError } = await supabase
          .from('assignments')
          .select('*')
          .gte('due_date', new Date().toISOString())
          .order('due_date', { ascending: true })
          .limit(3);
        
        if (assignmentsError) throw assignmentsError;
        
        // Fetch recent announcements
        const { data: announcements, error: announcementsError } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(3);
        
        if (announcementsError) throw announcementsError;
        
        setRecentNotes(notes || []);
        setUpcomingAssignments(assignments || []);
        setRecentAnnouncements(announcements || []);
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.user_metadata?.first_name || 'Student'}</h1>
        <p className="mt-1 text-sm text-gray-500">Here's an overview of your learning journey</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <h2 className="ml-3 text-lg font-semibold text-gray-900">Notes</h2>
          </div>
          <p className="mt-2 text-sm text-gray-500">You have {recentNotes.length} recent notes</p>
          <Link
            to="/notes"
            className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            View all notes
            <svg
              className="ml-1 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
        </div>

        <div className="bg-green-50 rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-green-600" />
            <h2 className="ml-3 text-lg font-semibold text-gray-900">Assignments</h2>
          </div>
          <p className="mt-2 text-sm text-gray-500">You have {upcomingAssignments.length} upcoming assignments</p>
          <Link
            to="/assignments"
            className="mt-4 inline-flex items-center text-sm font-medium text-green-600 hover:text-green-500"
          >
            View all assignments
            <svg
              className="ml-1 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
        </div>

        <div className="bg-purple-50 rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <Bell className="h-8 w-8 text-purple-600" />
            <h2 className="ml-3 text-lg font-semibold text-gray-900">Announcements</h2>
          </div>
          <p className="mt-2 text-sm text-gray-500">You have {recentAnnouncements.length} recent announcements</p>
          <Link
            to="/announcements"
            className="mt-4 inline-flex items-center text-sm font-medium text-purple-600 hover:text-purple-500"
          >
            View all announcements
            <svg
              className="ml-1 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Notes */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Recent Notes</h3>
              <Link
                to="/notes"
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                View all
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {recentNotes.length > 0 ? (
              recentNotes.map((note) => (
                <Link
                  key={note.id}
                  to={`/notes/${note.id}`}
                  className="block hover:bg-gray-50"
                >
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">{note.title}</p>
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">{note.content}</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-6 py-4 text-center">
                <p className="text-sm text-gray-500">No notes yet</p>
                <Link
                  to="/notes/new"
                  className="mt-2 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  Create your first note
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Assignments */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Upcoming Assignments</h3>
              <Link
                to="/assignments"
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                View all
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {upcomingAssignments.length > 0 ? (
              upcomingAssignments.map((assignment) => (
                <Link
                  key={assignment.id}
                  to={`/assignments/${assignment.id}`}
                  className="block hover:bg-gray-50"
                >
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{assignment.title}</p>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                        <p className="text-xs text-gray-500">
                          Due {formatDistanceToNow(new Date(assignment.due_date), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">{assignment.description}</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-6 py-4 text-center">
                <p className="text-sm text-gray-500">No upcoming assignments</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Announcements */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Recent Announcements</h3>
            <Link
              to="/announcements"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              View all
            </Link>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {recentAnnouncements.length > 0 ? (
            recentAnnouncements.map((announcement) => (
              <Link
                key={announcement.id}
                to={`/announcements/${announcement.id}`}
                className="block hover:bg-gray-50"
              >
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{announcement.title}</p>
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{announcement.content}</p>
                </div>
              </Link>
            ))
          ) : (
            <div className="px-6 py-4 text-center">
              <p className="text-sm text-gray-500">No recent announcements</p>
              <Link
                to="/announcements/new"
                className="mt-2 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                Create an announcement
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;