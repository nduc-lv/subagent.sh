-- Create deployments table for tracking production deployments
CREATE TABLE IF NOT EXISTS deployments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  version text NOT NULL,
  environment text NOT NULL DEFAULT 'production',
  status text NOT NULL DEFAULT 'deployed',
  url text,
  commit_sha text,
  deployed_at timestamptz DEFAULT now(),
  deployed_by text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_deployments_environment ON deployments(environment);
CREATE INDEX IF NOT EXISTS idx_deployments_deployed_at ON deployments(deployed_at DESC);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);

-- Enable RLS
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;

-- Create policies (only service role can access)
CREATE POLICY "Service role can manage deployments" ON deployments
  FOR ALL USING (auth.role() = 'service_role');

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_deployments_updated_at
  BEFORE UPDATE ON deployments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();