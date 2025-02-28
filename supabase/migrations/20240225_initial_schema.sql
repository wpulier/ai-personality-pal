-- Create schema for AI Personality Pal

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table with auth user association
CREATE TABLE IF NOT EXISTS public.twins (
  id SERIAL PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Anonymous',
  bio TEXT NOT NULL,
  spotify_url TEXT,
  letterboxd_url TEXT,
  letterboxd_data JSONB DEFAULT '{"status": "not_provided"}',
  spotify_data JSONB DEFAULT '{"status": "not_provided"}',
  twin_personality JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id SERIAL PRIMARY KEY,
  twin_id INTEGER NOT NULL REFERENCES public.twins(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_user BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.twins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for twins table
-- 1. Users can view their own twins
CREATE POLICY "Users can view their own twins" 
  ON public.twins 
  FOR SELECT 
  USING (auth.uid() = auth_user_id);

-- 2. Users can create their own twins
CREATE POLICY "Users can create their own twins" 
  ON public.twins 
  FOR INSERT 
  WITH CHECK (auth.uid() = auth_user_id);

-- 3. Users can update their own twins
CREATE POLICY "Users can update their own twins" 
  ON public.twins 
  FOR UPDATE 
  USING (auth.uid() = auth_user_id);

-- 4. Users can delete their own twins
CREATE POLICY "Users can delete their own twins" 
  ON public.twins 
  FOR DELETE 
  USING (auth.uid() = auth_user_id);

-- Create RLS policies for messages table
-- 1. Users can view messages for their twins
CREATE POLICY "Users can view messages for their twins" 
  ON public.messages 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.twins 
      WHERE twins.id = messages.twin_id 
      AND twins.auth_user_id = auth.uid()
    )
  );

-- 2. Users can create messages for their twins
CREATE POLICY "Users can create messages for their twins" 
  ON public.messages 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.twins 
      WHERE twins.id = messages.twin_id 
      AND twins.auth_user_id = auth.uid()
    )
  );

-- 3. Users can delete messages for their twins
CREATE POLICY "Users can delete messages for their twins" 
  ON public.messages 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.twins 
      WHERE twins.id = messages.twin_id 
      AND twins.auth_user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on twins table
CREATE TRIGGER update_twins_updated_at
BEFORE UPDATE ON public.twins
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Add indexes for performance
CREATE INDEX idx_twins_auth_user_id ON public.twins(auth_user_id);
CREATE INDEX idx_messages_twin_id ON public.messages(twin_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at); 