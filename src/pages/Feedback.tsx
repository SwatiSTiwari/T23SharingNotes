import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { MessageSquare, Send, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Feedback } from '../lib/supabase';

type FeedbackFormData = {
  subject: string;
  message: string;
  type: 'bug' | 'feature' | 'general' | 'complaint';
};

const FeedbackPage: React.FC = () => {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FeedbackFormData>({
    defaultValues: {
      type: 'general',
    },
  });

  useEffect(() => {
    fetchFeedbacks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setFeedbacks(data || []);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      toast.error('Failed to load feedback history');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: FeedbackFormData) => {
    try {
      setSubmitting(true);

      const { error } = await supabase.from('feedback').insert({
        user_id: user?.id,
        subject: data.subject,
        message: data.message,
        type: data.type,
        status: 'pending',
      });

      if (error) throw error;

      toast.success('Feedback submitted successfully!');
      reset();
      setShowForm(false);
      fetchFeedbacks();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      const message = error instanceof Error ? error.message : 'Failed to submit feedback';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </span>
        );
      case 'reviewed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            Reviewed
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Resolved
          </span>
        );
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      bug: 'bg-red-100 text-red-800',
      feature: 'bg-purple-100 text-purple-800',
      general: 'bg-gray-100 text-gray-800',
      complaint: 'bg-orange-100 text-orange-800',
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[type as keyof typeof colors]}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
          <p className="mt-1 text-sm text-gray-500">
            Share your thoughts, report bugs, or request features
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          {showForm ? 'Cancel' : 'New Feedback'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Submit Feedback</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Feedback Type
              </label>
              <select
                id="type"
                {...register('type', { required: 'Type is required' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="general">General Feedback</option>
                <option value="bug">Bug Report</option>
                <option value="feature">Feature Request</option>
                <option value="complaint">Complaint</option>
              </select>
              {errors.type && (
                <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                Subject
              </label>
              <input
                id="subject"
                type="text"
                {...register('subject', { required: 'Subject is required' })}
                className={`mt-1 block w-full rounded-md shadow-sm ${
                  errors.subject ? 'border-red-300' : 'border-gray-300'
                } focus:border-blue-500 focus:ring-blue-500`}
                placeholder="Brief description of your feedback"
              />
              {errors.subject && (
                <p className="mt-1 text-sm text-red-600">{errors.subject.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                Message
              </label>
              <textarea
                id="message"
                rows={6}
                {...register('message', { required: 'Message is required' })}
                className={`mt-1 block w-full rounded-md shadow-sm ${
                  errors.message ? 'border-red-300' : 'border-gray-300'
                } focus:border-blue-500 focus:ring-blue-500`}
                placeholder="Provide details about your feedback..."
              ></textarea>
              {errors.message && (
                <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {submitting ? (
                  <>
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
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Feedback
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-medium text-gray-900">Your Feedback History</h2>
        </div>

        {feedbacks.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No feedback yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Share your thoughts by submitting feedback above.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {feedbacks.map((feedback) => (
              <li key={feedback.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {getTypeBadge(feedback.type)}
                      {getStatusBadge(feedback.status)}
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {feedback.subject}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                      {feedback.message}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      Submitted {formatDistanceToNow(new Date(feedback.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FeedbackPage;
