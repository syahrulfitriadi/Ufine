-- =============================================
-- Add avatar_url column to profiles table
-- Stores compressed base64 profile picture
-- =============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
