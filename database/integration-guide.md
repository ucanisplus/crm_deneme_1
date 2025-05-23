# CRM Features Integration Guide

## Database Setup

1. **Run the SQL Schema**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of `database/schema.sql`
   - Execute the SQL to create all tables

## Backend Integration

The backend (`crm_deneme_backend-main`) has been updated with new API endpoints for:

### Notifications
- `GET /api/notifications/:userId` - Get all notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/mark-all-read/:userId` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

### User Preferences
- `GET /api/preferences/:userId` - Get preferences
- `PUT /api/preferences/:userId` - Update preferences

### User Profile
- `GET /api/profile/:userId` - Get profile
- `PUT /api/profile/:userId` - Update profile

### Search History
- `POST /api/search-history` - Save search
- `GET /api/search-history/:userId` - Get history

### Activity Logs
- `POST /api/activity-log` - Log activity

### Favorites
- `GET /api/favorites/:userId` - Get favorites
- `POST /api/favorites` - Add favorite
- `DELETE /api/favorites/:id` - Remove favorite

## Frontend Integration

The frontend uses the API service in `lib/crmApi.js` to communicate with the backend.

### Environment Variables

Add these to your `.env.local` file:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:4000/api

# Supabase (optional for direct access)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Usage Examples

#### Notifications Page
The notifications page (`app/bildirimler/page.tsx`) automatically:
- Fetches notifications from the API
- Falls back to mock data if API fails
- Updates notification status in real-time

#### Profile Page
The profile page (`app/profil/page.tsx`) allows users to:
- View and edit profile information
- Change preferences
- Manage security settings

#### Search Page
The search page (`app/arama/page.tsx`) provides:
- Real-time search functionality
- Search history tracking
- Quick access shortcuts

## Testing

1. Start the backend:
   ```bash
   cd crm_deneme_backend-main
   npm install
   npm run dev
   ```

2. Start the frontend:
   ```bash
   cd crm_deneme_1
   npm install
   npm run dev
   ```

3. Create test data:
   - Use the SQL editor to insert test notifications
   - Or use the API endpoints directly

## Production Deployment

1. **Database**: Ensure all tables are created in production Supabase
2. **Backend**: Deploy to Vercel with environment variables
3. **Frontend**: Deploy to Vercel with correct API URL

## Security Notes

- All tables have Row Level Security (RLS) enabled
- Users can only access their own data
- API endpoints should validate user authentication
- Consider adding JWT verification in production