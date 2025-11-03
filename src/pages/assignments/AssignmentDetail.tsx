import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { ArrowLeft, Clock, FileText, Upload, Edit, Trash2, CheckCircle, X, File as FileIcon, Image as ImageIcon, Video as VideoIcon, Music, FileArchive } from 'lucide-react';
import { formatDistanceToNow, isPast, format } from 'date-fns';
import { useForm } from 'react-hook-form';
import type { Assignment, Submission } from '../../lib/supabase';

type SubmissionFormData = {
  content: string;
};

type FileInfo = {
  url: string;
  name: string;
  type: string;
  size: number;
};

const AssignmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<FileInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubmissionFormData>();

  // Helper function to get file icon
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
    if (fileType.startsWith('video/')) return <VideoIcon className="h-5 w-5" />;
    if (fileType.startsWith('audio/')) return <Music className="h-5 w-5" />;
    if (fileType === 'application/pdf') return <FileText className="h-5 w-5" />;
    if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) return <FileArchive className="h-5 w-5" />;
    return <FileIcon className="h-5 w-5" />;
  };

  // Helper function to format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  useEffect(() => {
    const fetchAssignmentAndSubmission = async () => {
      try {
        setLoading(true);
        
        // Fetch assignment
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('assignments')
          .select('*')
          .eq('id', id)
          .single();
        
        if (assignmentError) throw assignmentError;
        
        // Fetch user's submission for this assignment
        const { data: submissionData, error: submissionError } = await supabase
          .from('submissions')
          .select('*')
          .eq('assignment_id', id)
          .eq('user_id', user?.id)
          .maybeSingle();
        
        if (submissionError) throw submissionError;
        
        setAssignment(assignmentData);
        setSubmission(submissionData);
        
        if (submissionData) {
          reset({
            content: submissionData.content,
          });
          // Load file info if exists
          if (submissionData.file_url && submissionData.file_name) {
            setUploadedFile({
              url: submissionData.file_url,
              name: submissionData.file_name,
              type: submissionData.file_type || '',
              size: submissionData.file_size || 0,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching assignment details:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAssignmentAndSubmission();
  }, [id, user, reset]);

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size must be less than 50MB');
      return;
    }

    try {
      setUploading(true);
      
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      
      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(fileName);

      setUploadedFile({
        url: publicUrl,
        name: file.name,
        type: file.type,
        size: file.size,
      });

      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('Error uploading file:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to upload file';
      
      if (error instanceof Error) {
        if (error.message.includes('bucket') || error.message.includes('not found')) {
          errorMessage = 'Storage bucket not found. Please set up storage in Supabase dashboard first. See SETUP_STORAGE.md for instructions.';
        } else if (error.message.includes('permission') || error.message.includes('policy')) {
          errorMessage = 'Permission denied. Please check storage policies in Supabase dashboard.';
        } else if (error.message.includes('size')) {
          errorMessage = 'File is too large. Maximum size is 50MB.';
        } else {
          errorMessage = `Upload failed: ${error.message}`;
        }
      }
      
      toast.error(errorMessage, { autoClose: 8000 });
    } finally {
      setUploading(false);
    }
  };

  // Handle file removal
  const handleFileRemove = async () => {
    if (!uploadedFile) return;

    try {
      // Extract file path from URL
      const urlParts = uploadedFile.url.split('/');
      const fileName = urlParts.slice(-2).join('/'); // Get user_id/filename

      // Delete from storage
      const { error } = await supabase.storage
        .from('attachments')
        .remove([fileName]);

      if (error) throw error;

      setUploadedFile(null);
      toast.success('File removed successfully');
    } catch (error) {
      console.error('Error removing file:', error);
      toast.error('Failed to remove file');
    }
  };

  const onSubmit = async (data: SubmissionFormData) => {
    try {
      setSubmitting(true);
      
      if (submission) {
        // Update existing submission
        const { error } = await supabase
          .from('submissions')
          .update({
            content: data.content,
            file_url: uploadedFile?.url || null,
            file_name: uploadedFile?.name || null,
            file_type: uploadedFile?.type || null,
            file_size: uploadedFile?.size || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', submission.id);
        
        if (error) throw error;
        
        toast.success('Submission updated successfully');
      } else {
        // Create new submission
        const { data: newSubmission, error } = await supabase
          .from('submissions')
          .insert({
            assignment_id: id,
            user_id: user?.id,
            content: data.content,
            file_url: uploadedFile?.url || null,
            file_name: uploadedFile?.name || null,
            file_type: uploadedFile?.type || null,
            file_size: uploadedFile?.size || null,
            status: 'draft',
          })
          .select()
          .single();
        
        if (error) throw error;
        
        setSubmission(newSubmission);
        toast.success('Submission created successfully');
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving submission:', error);
      const message = error instanceof Error ? error.message : 'Failed to save submission';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAssignment = async () => {
    if (!submission) {
      toast.error('You need to create a submission first');
      return;
    }
    
    if (!window.confirm('Are you sure you want to submit this assignment? You won\'t be able to edit it after submission.')) {
      return;
    }
    
    try {
      setSubmitting(true);
      
      const { error } = await supabase
        .from('submissions')
        .update({
          status: 'submitted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', submission.id);
      
      if (error) throw error;
      
      setSubmission({
        ...submission,
        status: 'submitted',
      });
      
      toast.success('Assignment submitted successfully');
    } catch (error) {
      console.error('Error submitting assignment:', error);
      const message = error instanceof Error ? error.message : 'Failed to submit assignment';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubmission = async () => {
    if (!submission) return;
    
    if (submission.status === 'submitted') {
      toast.error('You cannot delete a submitted assignment');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this submission?')) {
      return;
    }
    
    try {
      setSubmitting(true);
      
      const { error } = await supabase
        .from('submissions')
        .delete()
        .eq('id', submission.id);
      
      if (error) throw error;
      
      setSubmission(null);
      setUploadedFile(null);
      reset({ content: '' });
      toast.success('Submission deleted successfully');
    } catch (error) {
      console.error('Error deleting submission:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete submission';
      toast.error(message);
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

  if (error || !assignment) {
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
            <h3 className="text-sm font-medium text-red-800">Error loading assignment</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error || 'Assignment not found'}</p>
            </div>
            <div className="mt-4">
              <Link
                to="/assignments"
                className="text-sm font-medium text-red-600 hover:text-red-500"
              >
                Go back to assignments
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isOverdue = isPast(new Date(assignment.due_date));
  const canSubmit = submission && submission.status === 'draft' && !isOverdue;
  const canEdit = !submission || (submission.status === 'draft' && !isOverdue);

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate('/assignments')}
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Assignments
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h1 className="text-xl font-semibold text-gray-900">{assignment.title}</h1>
          <div className="mt-1 flex items-center text-sm text-gray-500">
            <Clock className="h-4 w-4 mr-1 text-gray-400" />
            <span>
              Due {format(new Date(assignment.due_date), 'PPP')} ({formatDistanceToNow(new Date(assignment.due_date), { addSuffix: true })})
            </span>
            {isOverdue && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Overdue
              </span>
            )}
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="prose max-w-none">
            <p className="whitespace-pre-wrap">{assignment.description}</p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Your Submission</h2>
          <div className="flex space-x-2">
            {submission && submission.status === 'submitted' && (
              <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-green-100 text-green-800">
                <CheckCircle className="h-4 w-4 mr-1" />
                Submitted
              </span>
            )}
            {submission && submission.status === 'draft' && (
              <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-yellow-100 text-yellow-800">
                <FileText className="h-4 w-4 mr-1" />
                Draft
              </span>
            )}
          </div>
        </div>

        <div className="px-6 py-4">
          {isEditing || (!submission && canEdit) ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                  Submission Content
                </label>
                <textarea
                  id="content"
                  rows={8}
                  {...register('content', { required: 'Content is required' })}
                  className={`mt-1 block w-full rounded-md shadow-sm ${
                    errors.content ? 'border-red-300' : 'border-gray-300'
                  } focus:border-blue-500 focus:ring-blue-500`}
                ></textarea>
                {errors.content && (
                  <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
                )}
              </div>

              {/* File Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attachment (Optional)
                </label>
                
                {!uploadedFile ? (
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-gray-500" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">
                          All file types supported (Images, Videos, Audio, PDFs, Documents, etc.) - Max 50MB
                        </p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        accept="*/*"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-300">
                    <div className="flex items-center space-x-3">
                      <div className="text-blue-600">
                        {getFileIcon(uploadedFile.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {uploadedFile.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(uploadedFile.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleFileRemove}
                      className="ml-4 text-red-600 hover:text-red-800"
                      title="Remove file"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                )}

                {uploading && (
                  <div className="mt-2 flex items-center text-sm text-blue-600">
                    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    if (submission) {
                      reset({
                        content: submission.content,
                      });
                      // Restore file info if exists
                      if (submission.file_url && submission.file_name) {
                        setUploadedFile({
                          url: submission.file_url,
                          name: submission.file_name,
                          type: submission.file_type || '',
                          size: submission.file_size || 0,
                        });
                      } else {
                        setUploadedFile(null);
                      }
                    } else {
                      reset({ content: '' });
                      setUploadedFile(null);
                    }
                  }}
                  className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
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
                      Saving...
                    </span>
                  ) : (
                    'Save as Draft'
                  )}
                </button>
              </div>
            </form>
          ) : submission ? (
            <div>
              <div className="prose max-w-none mb-6">
                <p className="whitespace-pre-wrap">{submission.content}</p>
              </div>
              
              {submission.file_url && (
                <div className="mt-4 border rounded-md p-4 bg-gray-50">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-2" />
                    <a
                      href={submission.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-500"
                    >
                      View Attached File
                    </a>
                  </div>
                </div>
              )}
              
              <div className="mt-6 flex justify-end space-x-3">
                {canEdit && (
                  <>
                    <button
                      onClick={handleDeleteSubmission}
                      disabled={submitting}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </button>
                    <button
                      onClick={() => setIsEditing(true)}
                      disabled={submitting}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                  </>
                )}
                
                {canSubmit && (
                  <button
                    onClick={handleSubmitAssignment}
                    disabled={submitting}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    {submitting ? 'Submitting...' : 'Submit Assignment'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No submission yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                {isOverdue
                  ? "This assignment is overdue and can no longer be submitted."
                  : "Start working on your submission now."}
              </p>
              {!isOverdue && (
                <div className="mt-6">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Create Submission
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignmentDetail;