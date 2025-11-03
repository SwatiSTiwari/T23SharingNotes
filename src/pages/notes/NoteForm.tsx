import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { ArrowLeft, Upload, X, FileText, File as FileIcon, Image as ImageIcon, Video as VideoIcon, Music, FileArchive } from 'lucide-react';
import type { Category } from '../../lib/supabase';

type NoteFormData = {
  title: string;
  content: string;
  category_id: string;
};

type FileInfo = {
  url: string;
  name: string;
  type: string;
  size: number;
};

const NoteForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [uploadedFile, setUploadedFile] = useState<FileInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<NoteFormData>();

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
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('type', 'note');
        
        if (error) throw error;
        
        setCategories(data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast.error('Failed to load categories');
      }
    };

    const fetchNote = async () => {
      if (!id) return;
      
      try {
        setInitialLoading(true);
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('id', id)
          .eq('user_id', user?.id)
          .single();
        
        if (error) throw error;
        
        if (!data) {
          toast.error('Note not found');
          navigate('/notes');
          return;
        }
        
        reset({
          title: data.title,
          content: data.content,
          category_id: data.category_id || '',
        });

        // Load file info if exists
        if (data.file_url && data.file_name) {
          setUploadedFile({
            url: data.file_url,
            name: data.file_name,
            type: data.file_type || '',
            size: data.file_size || 0,
          });
        }
      } catch (error) {
        console.error('Error fetching note:', error);
        toast.error('Failed to load note');
        navigate('/notes');
      } finally {
        setInitialLoading(false);
      }
    };

    fetchCategories();
    if (isEditing) {
      fetchNote();
    }
  }, [id, user, navigate, reset, isEditing]);

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
      toast.error('Failed to upload file');
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

  const onSubmit = async (data: NoteFormData) => {
    try {
      setLoading(true);
      
      if (isEditing) {
        // Update existing note
        const { error } = await supabase
          .from('notes')
          .update({
            title: data.title,
            content: data.content,
            category_id: data.category_id || null,
            file_url: uploadedFile?.url || null,
            file_name: uploadedFile?.name || null,
            file_type: uploadedFile?.type || null,
            file_size: uploadedFile?.size || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('user_id', user?.id);
        
        if (error) throw error;
        
        toast.success('Note updated successfully');
      } else {
        // Create new note
        const { error } = await supabase
          .from('notes')
          .insert({
            title: data.title,
            content: data.content,
            category_id: data.category_id || null,
            file_url: uploadedFile?.url || null,
            file_name: uploadedFile?.name || null,
            file_type: uploadedFile?.type || null,
            file_size: uploadedFile?.size || null,
            user_id: user?.id,
          });
        
        if (error) throw error;
        
        toast.success('Note created successfully');
      }
      
      navigate('/notes');
    } catch (error) {
      console.error('Error saving note:', error);
      const message = error instanceof Error ? error.message : 'Failed to save note';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Note' : 'Create New Note'}
        </h1>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              id="title"
              type="text"
              {...register('title', { required: 'Title is required' })}
              className={`mt-1 block w-full rounded-md shadow-sm ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              } focus:border-blue-500 focus:ring-blue-500`}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              id="category"
              {...register('category_id')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">
              Content
            </label>
            <textarea
              id="content"
              rows={10}
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

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/notes')}
              className="mr-3 inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
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
                'Save Note'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NoteForm;