-- Fix user_id type in notifications table
-- Run this in your Supabase SQL editor

-- First, drop the existing table (if you don't have important data)
DROP TABLE IF EXISTS crm_notifications CASCADE;

-- Recreate with proper user_id type (matching your crm_users table)
CREATE TABLE crm_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,  -- Changed from UUID to TEXT to match your users
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) CHECK (type IN ('info', 'success', 'warning', 'error')) DEFAULT 'info',
    icon VARCHAR(50),
    action_link VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Recreate indexes
CREATE INDEX idx_crm_notifications_user_id ON crm_notifications(user_id);
CREATE INDEX idx_crm_notifications_is_read ON crm_notifications(is_read);
CREATE INDEX idx_crm_notifications_created_at ON crm_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE crm_notifications ENABLE ROW LEVEL SECURITY;

-- Recreate policies
CREATE POLICY "Users can view their own notifications"
    ON crm_notifications FOR SELECT
    USING (user_id = current_user OR user_id IN (SELECT username FROM crm_users WHERE id::text = auth.uid()::text));

CREATE POLICY "Users can update their own notifications"
    ON crm_notifications FOR UPDATE
    USING (user_id = current_user OR user_id IN (SELECT username FROM crm_users WHERE id::text = auth.uid()::text));

CREATE POLICY "System can insert notifications"
    ON crm_notifications FOR INSERT
    WITH CHECK (true);

-- Recreate trigger
CREATE TRIGGER update_crm_notifications_updated_at BEFORE UPDATE ON crm_notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Now you can insert a test notification
-- INSERT INTO crm_notifications (user_id, title, message, type, icon, action_link)
-- VALUES ('selman1', 'Test Bildirimi', 'Bu bir test bildirimidir', 'info', 'Bell', '/');