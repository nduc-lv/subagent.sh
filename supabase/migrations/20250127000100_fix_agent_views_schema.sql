-- Fix agent_views table schema
-- Add missing columns that are expected by the application

-- Add referrer column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'agent_views' 
                   AND column_name = 'referrer') THEN
        ALTER TABLE public.agent_views ADD COLUMN referrer TEXT;
        RAISE NOTICE 'Added referrer column to agent_views table';
    ELSE
        RAISE NOTICE 'referrer column already exists in agent_views table';
    END IF;
END $$;

-- Add session_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'agent_views' 
                   AND column_name = 'session_id') THEN
        ALTER TABLE public.agent_views ADD COLUMN session_id TEXT;
        RAISE NOTICE 'Added session_id column to agent_views table';
    ELSE
        RAISE NOTICE 'session_id column already exists in agent_views table';
    END IF;
END $$;

-- Verify the schema is correct by selecting table structure
-- This will show in the migration log what columns exist
DO $$
DECLARE
    col_record RECORD;
BEGIN
    RAISE NOTICE 'Current agent_views table structure:';
    FOR col_record IN 
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agent_views'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  - %: % (nullable: %)', col_record.column_name, col_record.data_type, col_record.is_nullable;
    END LOOP;
END $$;