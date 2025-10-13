-- CRM Database Schema for new features
-- Run these SQL commands in your Supabase SQL editor

-- 1. Notifications Table
CREATE TABLE IF NOT EXISTS crm_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) CHECK (type IN ('info', 'success', 'warning', 'error')) DEFAULT 'info',
    icon VARCHAR(50),
    action_link VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_crm_notifications_user_id ON crm_notifications(user_id);
CREATE INDEX idx_crm_notifications_is_read ON crm_notifications(is_read);
CREATE INDEX idx_crm_notifications_created_at ON crm_notifications(created_at DESC);

-- 2. User Preferences Table
CREATE TABLE IF NOT EXISTS crm_user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    system_notifications BOOLEAN DEFAULT TRUE,
    language VARCHAR(5) DEFAULT 'tr',
    theme VARCHAR(10) DEFAULT 'light',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. User Profiles Extended Table (for additional profile info)
CREATE TABLE IF NOT EXISTS crm_user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    phone VARCHAR(20),
    department VARCHAR(100),
    profile_picture_url TEXT,
    last_login TIMESTAMP WITH TIME ZONE,
    last_login_ip VARCHAR(45),
    last_login_device VARCHAR(255),
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Search History Table
CREATE TABLE IF NOT EXISTS crm_search_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    search_term VARCHAR(255) NOT NULL,
    search_category VARCHAR(50),
    results_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for search history
CREATE INDEX idx_crm_search_history_user_id ON crm_search_history(user_id);
CREATE INDEX idx_crm_search_history_created_at ON crm_search_history(created_at DESC);

-- 5. User Activity Logs Table
CREATE TABLE IF NOT EXISTS crm_activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    activity_description TEXT,
    module VARCHAR(50),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for activity logs
CREATE INDEX idx_crm_activity_logs_user_id ON crm_activity_logs(user_id);
CREATE INDEX idx_crm_activity_logs_created_at ON crm_activity_logs(created_at DESC);

-- 6. Quick Access/Favorites Table
CREATE TABLE IF NOT EXISTS crm_user_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    link VARCHAR(255) NOT NULL,
    icon VARCHAR(50),
    category VARCHAR(50),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for favorites
CREATE INDEX idx_crm_user_favorites_user_id ON crm_user_favorites(user_id);

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE crm_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_user_favorites ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "Users can view their own notifications"
    ON crm_notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON crm_notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
    ON crm_notifications FOR INSERT
    WITH CHECK (true);

-- Policies for user preferences
CREATE POLICY "Users can view their own preferences"
    ON crm_user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
    ON crm_user_preferences FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
    ON crm_user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policies for user profiles
CREATE POLICY "Users can view their own profile"
    ON crm_user_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
    ON crm_user_profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
    ON crm_user_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policies for search history
CREATE POLICY "Users can view their own search history"
    ON crm_search_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search history"
    ON crm_search_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policies for activity logs
CREATE POLICY "Users can view their own activity logs"
    ON crm_activity_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity logs"
    ON crm_activity_logs FOR INSERT
    WITH CHECK (true);

-- Policies for favorites
CREATE POLICY "Users can manage their own favorites"
    ON crm_user_favorites FOR ALL
    USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_crm_notifications_updated_at BEFORE UPDATE ON crm_notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_user_preferences_updated_at BEFORE UPDATE ON crm_user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_user_profiles_updated_at BEFORE UPDATE ON crm_user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing (optional - remove in production)
-- INSERT INTO crm_notifications (user_id, title, message, type, icon, action_link)
-- VALUES 
-- ('your-user-id', 'Yeni Galvaniz Talebi', 'ABC Firması yeni bir galvaniz talebi oluşturdu.', 'info', 'Package', '/satis/galvaniz-talebi'),
-- ('your-user-id', 'Maliyet Hesaplama Tamamlandı', 'Panel çit üretimi için maliyet hesaplaması başarıyla tamamlandı.', 'success', 'TrendingUp', '/uretim/hesaplamalar/maliyet');