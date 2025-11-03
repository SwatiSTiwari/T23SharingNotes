/*
  # Add Feedback System

  1. New Tables
    - `feedback` - Stores user feedback submissions

  2. Security
    - Enable RLS on feedback table
    - Add policies for users to create and view their own feedback
    - Add policy for admins to view all feedback
*/

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'general', 'complaint')),
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
  ON feedback
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create feedback
CREATE POLICY "Users can create feedback"
  ON feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending feedback
CREATE POLICY "Users can update their own pending feedback"
  ON feedback
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Users can delete their own pending feedback
CREATE POLICY "Users can delete their own pending feedback"
  ON feedback
  FOR DELETE
  USING (auth.uid() = user_id AND status = 'pending');

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
