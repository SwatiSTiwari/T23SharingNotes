import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { ArrowLeft, Edit, Trash2, BookOpen, Download, FileText, File as FileIcon, Image as ImageIcon, Video as VideoIcon, Music, FileArchive, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Note } from '../../lib/supabase';

const NoteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to get file icon
  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <FileIcon className="h-5 w-5" />;
    if (fileType.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
    if (fileType.startsWith('video/')) return <VideoIcon className="h-5 w-5" />;
    if (fileType.startsWith('audio/')) return <Music className="h-5 w-5" />;
    if (fileType === 'application/pdf') return <FileText className="h-5 w-5" />;
    if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) return <FileArchive className="h-5 w-5" />;
    return <FileIcon className="h-5 w-5" />;
  };

  // Helper function to format file size
  const formatFileSize = (bytes: number | null) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Check if file can be previewed in browser
  const canPreviewInBrowser = (fileType: string | null) => {
    if (!fileType) return false;
    return (
      fileType.startsWith('image/') ||
      fileType.startsWith('video/') ||
      fileType.startsWith('audio/') ||
      fileType === 'application/pdf' ||
      fileType === 'text/plain'
    );
  };

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
      } catch (error) {
        console.error('Error fetching note:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        setError(message);
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
    } catch (error) {
      console.error('Error deleting note:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete note';
      toast.error(message);
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

          {/* File Attachment Section */}
          {note.file_url && note.file_name && (
            <div className="mt-6 border-t pt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Attachment</h3>
              <div className="bg-gray-50 rounded-lg border border-gray-300 overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="text-blue-600 flex-shrink-0">
                      {getFileIcon(note.file_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {note.file_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(note.file_size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {canPreviewInBrowser(note.file_type) ? (
                      <a
                        href={note.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Open
                      </a>
                    ) : (
                      <a
                        href={note.file_url}
                        download={note.file_name}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </a>
                    )}
                  </div>
                </div>

                {/* Preview Section for Images, Videos, Audio, and PDFs */}
                {note.file_type && (
                  <>
                    {note.file_type.startsWith('image/') && (
                      <div className="border-t border-gray-200 p-4 bg-white">
                        <img
                          src={note.file_url}
                          alt={note.file_name}
                          className="max-w-full h-auto rounded-lg shadow-sm"
                        />
                      </div>
                    )}

                    {note.file_type.startsWith('video/') && (
                      <div className="border-t border-gray-200 p-4 bg-black">
                        <video
                          controls
                          className="max-w-full h-auto rounded-lg"
                          preload="metadata"
                        >
                          <source src={note.file_url} type={note.file_type} />
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    )}

                    {note.file_type.startsWith('audio/') && (
                      <div className="border-t border-gray-200 p-4 bg-white">
                        <audio controls className="w-full">
                          <source src={note.file_url} type={note.file_type} />
                          Your browser does not support the audio tag.
                        </audio>
                      </div>
                    )}

                    {note.file_type === 'application/pdf' && (
                      <div className="border-t border-gray-200 p-4 bg-gray-100">
                        <iframe
                          src={note.file_url}
                          className="w-full h-[600px] rounded-lg border-0"
                          title={note.file_name}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoteDetail;