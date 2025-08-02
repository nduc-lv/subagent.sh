-- Storage configuration for the Subagents platform

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('agent-assets', 'agent-assets', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif']),
    ('user-avatars', 'user-avatars', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('agent-files', 'agent-files', false, 104857600, ARRAY['application/zip', 'application/x-tar', 'application/gzip', 'text/plain', 'application/json']);

-- Storage policies for agent-assets bucket
CREATE POLICY "Agent assets are publicly viewable" ON storage.objects
    FOR SELECT USING (bucket_id = 'agent-assets');

CREATE POLICY "Authenticated users can upload agent assets" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'agent-assets' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update their own agent assets" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'agent-assets' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own agent assets" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'agent-assets' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Storage policies for user-avatars bucket
CREATE POLICY "User avatars are publicly viewable" ON storage.objects
    FOR SELECT USING (bucket_id = 'user-avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'user-avatars' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update their own avatar" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'user-avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own avatar" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'user-avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Storage policies for agent-files bucket (private)
CREATE POLICY "Agent files viewable by owner and downloaders" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'agent-files' 
        AND (
            auth.uid()::text = (storage.foldername(name))[1]
            OR EXISTS (
                SELECT 1 FROM public.agent_downloads ad
                JOIN public.agents a ON ad.agent_id = a.id
                WHERE a.author_id::text = (storage.foldername(name))[1]
                AND ad.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Agent owners can upload files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'agent-files' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Agent owners can update their files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'agent-files' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Agent owners can delete their files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'agent-files' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );