import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { ArrowLeft, Edit, Trash2, BookOpen } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Note } from '../../lib/supabase';

const NoteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNote = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('notes')
          .select(`
            *,
            category:categories(*)
          `)
          .eq('id', id)
          .eq('user_id', user?.id)
          .single();
        
        if (error) throw error;
        
        setNote(data);
      } catch (error: any) {
        console.error('Error fetching note:', error);
        setError(error.message);
        toast.error('Failed to load note');
      } finally {
        setLoading(false);
      }
    };
    
    fetchNote();
  }, [id, user]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);
      
      if (error) throw error;
      
      toast.success('Note deleted successfully');
      navigate('/notes');
    } catch (error: any) {
      console.error('Error deleting note:', error);
      toast.error(error.message || 'Failed to delete note');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !note) {
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
            <h3 className="text-sm font-medium text-red-800">Error loading note</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error || 'Note not found'}</p>
            </div>
            <div className="mt-4">
              <Link
                to="/notes"
                className="text-sm font-medium text-red-600 hover:text-red-500"
              >
                Go back to notes
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate('/notes')}
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Notes
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-900">{note.title}</h1>
          <div className="flex space-x-2">
            <Link
              to={`/notes/${note.id}/edit`}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Link>
            <button
              onClick={handleDelete}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="flex items-center text-sm text-gray-500 mb-4">
            {note.category && (
              <div className="flex items-center mr-4">
                <BookOpen className="h-4 w-4 mr-1 text-gray-400" />
                <span>{note.category.name}</span>
              </div>
            )}
            <div>
              Updated {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
            </div>
          </div>

          <div className="prose max-w-none">
            <p className="whitespace-pre-wrap">{note.content}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteDetail;