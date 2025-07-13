# Supabase Edge Function Environment Variables Setup

## Required Environment Variables for Edge Functions

The following environment variables must be set in your Supabase project for the edge functions to work:

### 1. DWV App Credentials
```
DWV_EMAIL=fer.scarduelli@gmail.com
DWV_PASSWORD=dwv@junttus
```

### 2. Supabase Configuration
```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## How to Set Environment Variables

### Method 1: Supabase Dashboard (Recommended)
1. Go to https://app.supabase.io/
2. Select your project
3. Navigate to: Project Settings → Edge Functions → Environment Variables
4. Click "Add variable" for each of the 4 variables above
5. Save each variable

### Method 2: Supabase CLI (if authenticated)
```bash
supabase secrets set DWV_EMAIL=fer.scarduelli@gmail.com
supabase secrets set DWV_PASSWORD=dwv@junttus
supabase secrets set SUPABASE_URL=https://your-project-ref.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Method 3: Environment File (for local development)
Create `.env` file in the `supabase/functions/` directory:
```
DWV_EMAIL=fer.scarduelli@gmail.com
DWV_PASSWORD=dwv@junttus
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## After Setting Environment Variables

1. Redeploy your edge functions (if using CLI):
   ```bash
   supabase functions deploy dwv-background-process
   ```

2. Or wait for automatic deployment if using GitHub integration

## Verification

Test the background process after setting environment variables. The enhanced logging will show:
- ✅ Configuration validated successfully
- 📋 Process result with actual data

If you still see errors, check the Supabase Edge Function logs for detailed error messages.