import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { ArrowLeft, Edit, Trash2, Bell, MessageCircle, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useForm } from 'react-hook-form';
import type { Announcement, Comment, Profile } from '../../lib/supabase';

type AnnouncementWithExtras = Announcement & {
  user: Profile;
  category: {
    id: string;
    name: string;
  } | null;
};

type CommentWithUser = Comment & {
  user: Profile;
};

type CommentFormData = {
  content: string;
};

const AnnouncementDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [announcement, setAnnouncement] = useState<AnnouncementWithExtras | null>(null);
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommentFormData>();

  useEffect(() => {
    const fetchAnnouncementAndComments = async () => {
      try {
        setLoading(true);
        
        // Fetch announcement with user and category information
        const { data: announcementData, error: announcementError } = await supabase
          .from('announcements')
          .select(`
            *,
            user:profiles(*),
            category:categories(*)
          `)
          .eq('id', id)
          .single();
        
        if (announcementError) throw announcementError;
        
        // Fetch comments with user information
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select(`
            *,
            user:profiles(*)
          `)
          .eq('announcement_id', id)
          .order('created_at', { ascending: true });
        
        if (commentsError) throw commentsError;
        
        setAnnouncement(announcementData);
        setComments(commentsData || []);
      } catch (error: any) {
        console.error('Error fetching announcement details:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnnouncementAndComments();
  }, [id]);

  const handleDeleteAnnouncement = async () => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);
      
      if (error) throw error;
      
      toast.success('Announcement deleted successfully');
      navigate('/announcements');
    } catch (error: any) {
      console.error('Error deleting announcement:', error);
      toast.error(error.message || 'Failed to delete announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user?.id);
      
      if (error) throw error;
      
      setComments(comments.filter(comment => comment.id !== commentId));
      toast.success('Comment deleted successfully');
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      toast.error(error.message || 'Failed to delete comment');
    }
  };

  const onSubmitComment = async (data: CommentFormData) => {
    try {
      setSubmitting(true);
      
      const { data: newComment, error } = await supabase
        .from('comments')
        .insert({
          announcement_id: id,
          user_id: user?.id,
          content: data.content,
        })
        .select(`
          *,
          user:profiles(*)
        `)
        .single();
      
      if (error) throw error;
      
      setComments([...comments, newComment]);
      reset({ content: '' });
      toast.success('Comment added successfully');
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast.error(error.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !announcement) {
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
            <h3 className="text-sm font-medium text-red-800">Error loading announcement</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error || 'Announcement not found'}</p>
            </div>
            <div className="mt-4">
              <Link
                to="/announcements"
                className="text-sm font-medium text-red-600 hover:text-red-500"
              >
                Go back to announcements
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
          onClick={() => navigate('/announcements')}
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Announcements
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-900">{announcement.title}</h1>
          {user?.id === announcement.user_id && (
            <div className="flex space-x-2">
              <Link
                to={`/announcements/${announcement.id}/edit`}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Link>
              <button
                onClick={handleDeleteAnnouncement}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </button>
            </div>
          )}
        </div>

        <div className="px-6 py-4">
          <div className="flex items-center text-sm text-gray-500 mb-4">
            <div className="flex items-center mr-4">
              <img
                src={announcement.user.avatar_url || `https://ui-avatars.com/api/?name=${announcement.user.first_name}+${announcement.user.last_name}&background=random`}
                alt={`${announcement.user.first_name} ${announcement.user.last_name}`}
                className="h-6 w-6 rounded-full mr-2"
              />
              <span>{announcement.user.first_name} {announcement.user.last_name}</span>
            </div>
            {announcement.category && (
              <div className="flex items-center mr-4">
                <Bell className="h-4 w-4 mr-1 text-gray-400" />
                <span>{announcement.category.name}</span>
              </div>
            )}
            <div>
              Posted {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
            </div>
          </div>

          <div className="prose max-w-none">
            <p className="whitespace-pre-wrap">{announcement.content}</p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-medium text-gray-900">Comments</h2>
        </div>

        <div className="px-6 py-4">
          <form onSubmit={handleSubmit(onSubmitComment)} className="mb-6">
            <div>
              <label htmlFor="comment" className="sr-only">
                Add a comment
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <textarea
                  id="comment"
                  rows={3}
                  placeholder="Add a comment..."
                  {...register('content', { required: 'Comment cannot be empty' })}
                  className={`block w-full rounded-md shadow-sm ${
                    errors.content ? 'border-red-300' : 'border-gray-300'
                  } focus:border-blue-500 focus:ring-blue-500`}
                ></textarea>
              </div>
              {errors.content && (
                <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
              )}
            </div>
            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {submitting ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Posting...
                  </span>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Post Comment
                  </>
                )}
              </button>
            </div>
          </form>

          {comments.length > 0 ? (
            <ul className="space-y-4">
              {comments.map((comment) => (
                <li key={comment.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between">
                    <div className="flex items-center">
                      <img
                        src={comment.user.avatar_url || `https://ui-avatars.com/api/?name=${comment.user.first_name}+${comment.user.last_name}&background=random`}
                        alt={`${comment.user.first_name} ${comment.user.last_name}`}
                        className="h-6 w-6 rounded-full mr-2"
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {comment.user.first_name} {comment.user.last_name}
                      </span>
                      <span className="ml-2 text-xs text-gray-500">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {user?.id === comment.user_id && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-6">
              <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No comments yet</h3>
              <p className="mt-1 text-sm text-gray-500">Be the first to comment on this announcement.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementDetail;