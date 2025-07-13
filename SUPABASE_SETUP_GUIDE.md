# Supabase Setup Guide for DWV Scraper

## Step 1: Create Supabase Project

1. Go to [https://app.supabase.io](https://app.supabase.io)
2. Sign in or create an account
3. Click "New Project"
4. Choose your organization
5. Fill in project details:
   - **Name**: `dwv-scraper` (or any name you prefer)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your location
6. Click "Create new project"
7. Wait for project to be created (takes 1-2 minutes)

## Step 2: Get Your Supabase Credentials

Once your project is ready:

1. Go to **Project Settings** (gear icon in sidebar)
2. Click **API** in the left menu
3. Copy the following values:

### For React App (.env file):
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### For Edge Functions (Supabase Dashboard):
```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **Important**: The `service_role` key is different from the `anon` key!

## Step 3: Update Local .env File

Replace the placeholder values in your `.env` file with the real values from Step 2.

## Step 4: Create Database Tables

1. In Supabase Dashboard, go to **SQL Editor**
2. Run this SQL to create the properties table:

```sql
-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  price TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  property_url TEXT,
  bedrooms INTEGER,
  bathrooms INTEGER,
  area TEXT,
  status TEXT DEFAULT 'available',
  source TEXT DEFAULT 'dwv',
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_properties_scraped_at ON properties(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_source ON properties(source);

-- Enable Row Level Security (RLS)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust as needed for production)
CREATE POLICY "Allow all operations on properties" ON properties
FOR ALL USING (true) WITH CHECK (true);
```

## Step 5: Set Edge Function Environment Variables

Your Edge Functions need these 4 environment variables to work properly:

| Variable Name | Value |
|---------------|-------|
| `DWV_EMAIL` | `fer.scarduelli@gmail.com` |
| `DWV_PASSWORD` | `dwv@junttus` |
| `SUPABASE_URL` | `https://qaolmpvgrjuqobrgnlaq.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### Method 1: CLI Approach (Recommended)

The Supabase CLI is the most reliable method for setting environment variables:

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link to your project**:
   ```bash
   supabase link --project-ref qaolmpvgrjuqobrgnlaq
   ```

4. **Set environment variables**:
   ```bash
   supabase secrets set DWV_EMAIL=fer.scarduelli@gmail.com
   supabase secrets set DWV_PASSWORD=dwv@junttus
   supabase secrets set SUPABASE_URL=https://qaolmpvgrjuqobrgnlaq.supabase.co
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhb2xtcHZncmp1cW9icmdubGFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDM2MzUyNiwiZXhwIjoyMDY1OTM5NTI2fQ.kzXvJhBTwJ_HH3mBXrWqTax_mGlMp8RzyUrYkIRlpng
   ```

### Method 2: Dashboard Approach

If you prefer using the Supabase Dashboard:

1. Go to [https://app.supabase.io](https://app.supabase.io)
2. Select your project (`dwv-scraper`)
3. Navigate to: **Settings** → **Edge Functions** → **Environment Variables**
   - *Alternative path*: **Project Settings** → **Functions** → **Environment Variables**
4. Click **"Add variable"** for each of the 4 variables above
5. Save each variable after entering the name and value

⚠️ **Note**: Dashboard interface may vary. If you can't find "Environment Variables", look for "Secrets" or "Function Settings".

### Method 3: Local Development Alternative

For local development and testing:

1. Create a `.env` file in the `supabase/functions/` directory:
   ```bash
   # supabase/functions/.env
   DWV_EMAIL=fer.scarduelli@gmail.com
   DWV_PASSWORD=dwv@junttus
   SUPABASE_URL=https://qaolmpvgrjuqobrgnlaq.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhb2xtcHZncmp1cW9icmdubGFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDM2MzUyNiwiZXhwIjoyMDY1OTM5NTI2fQ.kzXvJhBTwJ_HH3mBXrWqTax_mGlMp8RzyUrYkIRlpng
   ```

2. This file is automatically loaded when running functions locally with `supabase functions serve`

### Troubleshooting

**Dashboard Access Issues:**
- If "Edge Functions" menu is missing, try "Functions" or "Database" → "Functions"
- Clear browser cache and try again
- Use incognito/private browsing mode
- Try the CLI method as an alternative

**CLI Authentication Problems:**
- Run `supabase logout` then `supabase login` again
- Check if you have the correct permissions for the project
- Verify project reference with `supabase projects list`

**Environment Variable Conflicts:**
- Variables set via CLI override dashboard settings
- Local `.env` files only work for local development
- Production functions use dashboard/CLI-set variables

**Interface Navigation Problems:**
- Supabase interface updates frequently - look for "Environment Variables", "Secrets", or "Function Settings"
- Try searching for "environment" in the dashboard search bar
- Contact Supabase support if interface has changed significantly

### Verification Steps

1. **Check if variables are set** (CLI method):
   ```bash
   supabase secrets list
   ```

2. **Test function deployment**:
   ```bash
   supabase functions deploy dwv-background-process
   ```

3. **Monitor function logs** in Supabase Dashboard:
   - Go to **Edge Functions** → **dwv-background-process** → **Logs**
   - Look for configuration validation messages

4. **Success indicators**:
   - ✅ No "undefined" errors in function logs
   - ✅ DWV authentication succeeds
   - ✅ Background process returns actual data

5. **Error patterns to watch for**:
   - ❌ "Environment variable X is undefined"
   - ❌ "Authentication failed" (check DWV credentials)
   - ❌ "Database connection failed" (check SUPABASE_URL and SERVICE_ROLE_KEY)

**Next Step**: After setting environment variables, redeploy your functions to ensure they pick up the new configuration.

## Step 6: Deploy Edge Functions

Run these commands in your terminal:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy all functions
supabase functions deploy dwv-background-process
supabase functions deploy scrape-dwv-app
supabase functions deploy scrape-properties
supabase functions deploy test-dwv-auth
```

## Step 7: Test the Setup

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:5173](http://localhost:5173)

3. The app should now load properly and show the DWV scraper interface

4. Click "Executar Processo" in the Background Process panel to test the DWV authentication

## Troubleshooting

### Common Issues:

1. **Blank page**: Check browser console for errors, usually missing environment variables
2. **"Invalid API key"**: Double-check your SUPABASE_ANON_KEY in .env
3. **Database errors**: Make sure you ran the SQL commands in Step 4
4. **Edge function errors**: Verify environment variables are set correctly in Supabase dashboard

### Debug Steps:

1. Check browser console (F12) for JavaScript errors
2. Check Supabase Edge Function logs in the dashboard
3. Verify all environment variables are set correctly
4. Test database connection in Supabase SQL Editor

## Security Notes

- Never commit your `.env` file to version control
- The `.env` file is already in `.gitignore`
- Use different credentials for production
- Consider implementing proper Row Level Security policies for production use

## Next Steps

Once setup is complete, you can:
- Test DWV authentication
- Run background property extraction
- View extracted properties in the interface
- Set up automated scheduling for property updates