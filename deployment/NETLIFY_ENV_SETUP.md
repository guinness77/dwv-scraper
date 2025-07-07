# Netlify Environment Variables Setup Guide

This guide provides detailed instructions for setting up environment variables in Netlify for the DWV Scraper project.

## Table of Contents

1. [Required Environment Variables](#required-environment-variables)
2. [Finding Your Supabase Credentials](#finding-your-supabase-credentials)
3. [Setting Up Environment Variables in Netlify](#setting-up-environment-variables-in-netlify)
4. [Troubleshooting Environment Variable Issues](#troubleshooting-environment-variable-issues)
5. [Redeploying After Setting Environment Variables](#redeploying-after-setting-environment-variables)

## Required Environment Variables

The DWV Scraper project requires the following environment variables to be set in Netlify:

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | The URL of your Supabase project | Yes |
| `VITE_SUPABASE_ANON_KEY` | The anonymous key for your Supabase project | Yes |
| `DWV_EMAIL` | Your DWV App login email | Yes |
| `DWV_PASSWORD` | Your DWV App login password | Yes |
| `AUTH_TOKEN_EXPIRY` | Token expiry time in seconds (default: 86400 - 24 hours) | Optional |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for Supabase (for admin operations) | Optional |

> **Note:** Variables prefixed with `VITE_` are exposed to the frontend code. Make sure you only expose what's necessary.

## Finding Your Supabase Credentials

To find your Supabase credentials:

1. Log in to your [Supabase Dashboard](https://app.supabase.io/)
2. Select your project
3. Go to **Project Settings** > **API**
4. Under **Project API keys**, you'll find:
   - **Project URL**: This is your `VITE_SUPABASE_URL`
   - **anon public**: This is your `VITE_SUPABASE_ANON_KEY`
   - **service_role**: This is your `SUPABASE_SERVICE_ROLE_KEY` (keep this secret)

![Supabase API Keys Screenshot]

> **Important:** Never commit these keys to your repository. Always use environment variables.

## Setting Up Environment Variables in Netlify

### Step 1: Access Environment Variables Settings

1. Log in to your [Netlify Dashboard](https://app.netlify.com/)
2. Select your DWV Scraper site
3. Go to **Site settings** > **Environment variables**

![Netlify Site Settings Screenshot]

### Step 2: Add Environment Variables

1. Click the **Add a variable** button
2. You can add variables individually or in bulk:

#### Individual Method:
1. Enter the key (e.g., `VITE_SUPABASE_URL`)
2. Enter the value (e.g., `https://your-project-ref.supabase.co`)
3. Click **Save**
4. Repeat for each variable

![Netlify Add Variable Screenshot]

#### Bulk Method:
1. Click **Import from .env**
2. Paste your variables in the format:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   DWV_EMAIL=your-email@example.com
   DWV_PASSWORD=your-password
   AUTH_TOKEN_EXPIRY=86400
   ```
3. Click **Import**

![Netlify Bulk Import Screenshot]

### Step 3: Verify Environment Variables

After adding all variables, you should see them listed in the Environment variables section:

![Netlify Environment Variables List Screenshot]

## Troubleshooting Environment Variable Issues

### Common Issues and Solutions

1. **Variables Not Available in Frontend**
   - **Issue**: Environment variables aren't accessible in your frontend code
   - **Solution**: Ensure variables used in the frontend are prefixed with `VITE_`
   - **Example**: Use `VITE_SUPABASE_URL` instead of `SUPABASE_URL`

2. **Changes Not Taking Effect**
   - **Issue**: Updated environment variables aren't reflected in your deployed site
   - **Solution**: Redeploy your site after changing environment variables
   - **Steps**: Go to **Deploys** > **Trigger deploy** > **Deploy site**

3. **Build Fails After Adding Variables**
   - **Issue**: Build process fails after adding new environment variables
   - **Solution**: Check your code for proper fallbacks when variables are missing
   - **Example**:
     ```typescript
     const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
     if (!supabaseUrl) {
       console.error('Missing VITE_SUPABASE_URL environment variable');
     }
     ```

4. **Sensitive Data Exposure**
   - **Issue**: Sensitive variables like passwords are exposed in frontend code
   - **Solution**: Only use `VITE_` prefix for variables that are safe to expose
   - **Best Practice**: Keep sensitive variables like `DWV_PASSWORD` server-side only

5. **Variable Name Typos**
   - **Issue**: Code references a variable with a slightly different name
   - **Solution**: Double-check variable names for exact matches
   - **Example**: `VITE_SUPABASE_URL` vs `VITE_SUPABASE_URL_`

### Debugging Environment Variables

To check if your environment variables are properly set:

1. Add a temporary debug component to your app:
   ```jsx
   <div style={{ display: 'none' }}>
     SUPABASE URL: {import.meta.env.VITE_SUPABASE_URL ? 'Set' : 'Not Set'}
   </div>
   ```

2. Check browser console for any environment-related errors

3. Use Netlify CLI to check environment variables locally:
   ```bash
   npx netlify-cli env:list
   ```

## Redeploying After Setting Environment Variables

After setting or updating environment variables, you need to redeploy your site for the changes to take effect.

### Method 1: Redeploy from Netlify Dashboard

1. Go to your site in the Netlify Dashboard
2. Navigate to the **Deploys** tab
3. Click **Trigger deploy** > **Deploy site**

![Netlify Trigger Deploy Screenshot]

### Method 2: Redeploy via Git Push

1. Make a small change to your repository (e.g., update a comment)
2. Commit and push the change:
   ```bash
   git add .
   git commit -m "Trigger redeploy for environment variables update"
   git push origin main
   ```
3. Netlify will automatically detect the change and start a new deployment

### Method 3: Redeploy via Netlify CLI

1. Install Netlify CLI if you haven't already:
   ```bash
   npm install -g netlify-cli
   ```

2. Authenticate:
   ```bash
   netlify login
   ```

3. Trigger a new deploy:
   ```bash
   netlify deploy --prod
   ```

### Verifying Deployment

After redeployment:

1. Check the deployment status in the Netlify Dashboard
2. Once deployed, visit your site and verify functionality
3. Test features that depend on the environment variables you've set

---

## Next Steps

After successfully setting up environment variables:

1. Complete the [Production Checklist](NETLIFY_DEPLOYMENT_GUIDE.md#-production-checklist)
2. Set up [Monitoring and Analytics](NETLIFY_DEPLOYMENT_GUIDE.md#-next-steps)
3. Configure [Custom Domain](NETLIFY_DEPLOYMENT_GUIDE.md#-step-5-configure-custom-domain-optional) if needed

For more detailed deployment instructions, refer to the [Netlify Deployment Guide](NETLIFY_DEPLOYMENT_GUIDE.md).

---

**Note:** This guide assumes you have already created a Netlify site and connected it to your GitHub repository. If you haven't done this yet, please refer to the [Netlify Deployment Guide](NETLIFY_DEPLOYMENT_GUIDE.md) for complete setup instructions.

[Supabase API Keys Screenshot]: # "Insert screenshot of Supabase API keys page"
[Netlify Site Settings Screenshot]: # "Insert screenshot of Netlify site settings navigation"
[Netlify Add Variable Screenshot]: # "Insert screenshot of adding a single environment variable"
[Netlify Bulk Import Screenshot]: # "Insert screenshot of bulk importing environment variables"
[Netlify Environment Variables List Screenshot]: # "Insert screenshot of the list of environment variables"
[Netlify Trigger Deploy Screenshot]: # "Insert screenshot of triggering a deploy in Netlify"