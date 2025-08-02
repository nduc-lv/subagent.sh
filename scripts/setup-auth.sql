-- Supabase Auth Setup Script
-- Run this in your Supabase SQL editor to set up authentication

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) PRIMARY KEY,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  bio text,
  website_url text,
  github_username text,
  twitter_username text,
  location text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create RLS policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" 
  ON profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert their own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url, github_username)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'user_name',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'user_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Update RLS policies for other tables to work with authentication

-- Agents table policies
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published agents" ON agents;
DROP POLICY IF EXISTS "Users can insert their own agents" ON agents;
DROP POLICY IF EXISTS "Users can update their own agents" ON agents;

CREATE POLICY "Anyone can view published agents" 
  ON agents FOR SELECT 
  USING (status = 'published' OR auth.uid() = author_id);

CREATE POLICY "Users can insert their own agents" 
  ON agents FOR INSERT 
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own agents" 
  ON agents FOR UPDATE 
  USING (auth.uid() = author_id);

-- Collections table policies
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view public collections and their own" ON collections;
DROP POLICY IF EXISTS "Users can insert their own collections" ON collections;
DROP POLICY IF EXISTS "Users can update their own collections" ON collections;
DROP POLICY IF EXISTS "Users can delete their own collections" ON collections;

CREATE POLICY "Users can view public collections and their own" 
  ON collections FOR SELECT 
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own collections" 
  ON collections FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections" 
  ON collections FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections" 
  ON collections FOR DELETE 
  USING (auth.uid() = user_id);

-- Bookmarks table policies
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can insert their own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON bookmarks;

CREATE POLICY "Users can view their own bookmarks" 
  ON bookmarks FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bookmarks" 
  ON bookmarks FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks" 
  ON bookmarks FOR DELETE 
  USING (auth.uid() = user_id);

-- Reviews table policies
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active reviews" ON reviews;
DROP POLICY IF EXISTS "Users can insert their own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON reviews;

CREATE POLICY "Anyone can view active reviews" 
  ON reviews FOR SELECT 
  USING (status = 'active');

CREATE POLICY "Users can insert their own reviews" 
  ON reviews FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" 
  ON reviews FOR UPDATE 
  USING (auth.uid() = user_id);

-- Votes table policies
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all votes" ON votes;
DROP POLICY IF EXISTS "Users can insert their own votes" ON votes;
DROP POLICY IF EXISTS "Users can update their own votes" ON votes;

CREATE POLICY "Users can view all votes" 
  ON votes FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert their own votes" 
  ON votes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes" 
  ON votes FOR UPDATE 
  USING (auth.uid() = user_id);

-- Collection agents table policies
ALTER TABLE collection_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view collection agents for accessible collections" ON collection_agents;
DROP POLICY IF EXISTS "Users can manage their own collection agents" ON collection_agents;

CREATE POLICY "Users can view collection agents for accessible collections" 
  ON collection_agents FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM collections 
      WHERE collections.id = collection_agents.collection_id 
      AND (collections.is_public = true OR collections.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage their own collection agents" 
  ON collection_agents FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM collections 
      WHERE collections.id = collection_agents.collection_id 
      AND collections.user_id = auth.uid()
    )
  );

-- Enable realtime for profiles table (optional)
-- ALTER PUBLICATION supabase_realtime ADD TABLE profiles;