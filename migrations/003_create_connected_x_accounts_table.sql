-- Create connected_x_accounts table
CREATE TABLE public.connected_x_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    oauth_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    x_user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    expires_in INT NOT NULL,
    granted_scopes TEXT[] NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Function to auto-update changed_at
CREATE OR REPLACE FUNCTION update_changed_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.changed_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function on any update
CREATE TRIGGER update_changed_at_trigger
BEFORE UPDATE ON public.connected_x_accounts
FOR EACH ROW
EXECUTE FUNCTION update_changed_at_column();
