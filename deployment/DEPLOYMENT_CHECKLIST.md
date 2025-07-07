# DWV Scraper - Deployment Checklist

This comprehensive checklist provides step-by-step instructions for deploying the DWV Scraper application to production environments. Follow these steps carefully to ensure a successful deployment.

## Table of Contents

- [Netlify Deployment Checklist](#netlify-deployment-checklist)
- [Supabase Edge Functions Deployment Checklist](#supabase-edge-functions-deployment-checklist)
- [Environment Variables Setup Checklist](#environment-variables-setup-checklist)
- [Deployment Verification Checklist](#deployment-verification-checklist)
- [Troubleshooting Guide](#troubleshooting-guide)
- [Monitoring and Maintenance](#monitoring-and-maintenance)

## Netlify Deployment Checklist

### 1. Prerequisites

- [ ] Node.js 20+ installed locally
- [ ] Git repository updated with latest code
- [ ] Netlify account created
- [ ] Netlify CLI installed (optional but recommended)
  ```bash
  npm install -g netlify-cli
  ```

### 2. Prepare Your Project

- [ ] Run tests locally to ensure everything works
  ```bash
  npm run test
  ```
- [ ] Build the project locally to check for errors
  ```bash
  npm run build
  ```
- [ ] Ensure all dependencies are correctly listed in package.json
- [ ] Commit and push all changes to your repository
  ```bash
  git add .
  git commit -m "Ready for production deployment"
  git push origin main
  ```

### 3. Connect to Netlify

#### Option A: Using Netlify CLI (Recommended)

- [ ] Login to Netlify
  ```bash
  netlify login
  ```
- [ ] Initialize your project
  ```bash
  netlify init
  ```
- [ ] Follow the prompts to create a new site
  - Choose "Create & configure a new site"
  - Select your team
  - Choose a site name (e.g., "dwv-scraper")
  - Confirm the build settings

#### Option B: Using Netlify Dashboard

- [ ] Go to [app.netlify.com](https://app.netlify.com)
- [ ] Click "Add new site" → "Import an existing project"
- [ ] Connect your GitHub repository
- [ ] Configure build settings:
  - Build command: `npm run build`
  - Publish directory: `dist`
  - Node version: `20`

### 4. Configure Build Settings

- [ ] Verify the following build settings in Netlify:
  - Build command: `npm run build`
  - Publish directory: `dist`
  - Node.js version: `20` (or higher)
- [ ] Add any required build plugins
- [ ] Set up branch deploy settings (if needed)

### 5. Deploy Your Site

- [ ] Trigger a manual deploy from the Netlify dashboard
  - Go to "Deploys" tab
  - Click "Trigger deploy" → "Deploy site"
- [ ] Monitor the build process for any errors
- [ ] Once deployed, note the Netlify URL (e.g., `https://your-site.netlify.app`)

### 6. Configure Custom Domain (Optional)

- [ ] Go to "Domain settings" in Netlify dashboard
- [ ] Click "Add custom domain"
- [ ] Follow the DNS configuration instructions
- [ ] Verify domain ownership
- [ ] Enable HTTPS

## Supabase Edge Functions Deployment Checklist

### 1. Prerequisites

- [ ] Supabase project created
- [ ] Supabase CLI installed
  ```bash
  npm install -g supabase
  ```
- [ ] Supabase credentials available

### 2. Prepare Your Supabase Project

- [ ] Login to Supabase CLI
  ```bash
  supabase login
  ```
- [ ] Link your Supabase project
  ```bash
  supabase link --project-ref your-project-ref
  ```
- [ ] Apply database migrations
  ```bash
  supabase db push
  ```
  or manually run the SQL file:
  ```bash
  supabase db execute < supabase/migrations/20250702141500_dusty_hall.sql
  ```

### 3. Configure Environment Variables

- [ ] Set up environment variables in Supabase
  ```bash
  supabase secrets set DWV_EMAIL=your_email@example.com
  supabase secrets set DWV_PASSWORD=your_password
  supabase secrets set AUTH_TOKEN_EXPIRY=86400
  ```

### 4. Deploy Edge Functions

- [ ] Deploy the test-dwv-auth function
  ```bash
  supabase functions deploy test-dwv-auth
  ```
- [ ] Deploy the scrape-dwv-app function
  ```bash
  supabase functions deploy scrape-dwv-app
  ```
- [ ] Deploy the scrape-properties function
  ```bash
  supabase functions deploy scrape-properties
  ```
- [ ] Verify functions are deployed
  ```bash
  supabase functions list
  ```

### 5. Configure CORS Settings

- [ ] Go to Supabase Dashboard → Settings → API
- [ ] Under "CORS (Cross-Origin Resource Sharing)", add your Netlify domain:
  - Add your Netlify URL (e.g., `https://your-site.netlify.app`)
  - If using a custom domain, add that as well (e.g., `https://your-domain.com`)
- [ ] Ensure the "Authorization" header is allowed in the CORS configuration
- [ ] Save CORS settings

### 6. Test Edge Functions

- [ ] Test the test-dwv-auth function
  ```bash
  curl -X GET "https://your-project-ref.supabase.co/functions/v1/test-dwv-auth"
  ```
- [ ] Verify the function returns a successful response
- [ ] Check function logs in Supabase Dashboard

## Environment Variables Setup Checklist

### 1. Netlify Environment Variables

- [ ] Go to Netlify Dashboard → Site settings → Environment variables
- [ ] Add the following variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | The URL of your Supabase project | Yes |
| `VITE_SUPABASE_ANON_KEY` | The anonymous key for your Supabase project | Yes |
| `DWV_EMAIL` | Your DWV App login email | Yes |
| `DWV_PASSWORD` | Your DWV App login password | Yes |
| `AUTH_TOKEN_EXPIRY` | Token expiry time in seconds (default: 86400 - 24 hours) | Optional |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for Supabase (for admin operations) | Optional |

- [ ] Save the environment variables
- [ ] Redeploy your site to apply the environment variables

### 2. Supabase Environment Variables

- [ ] Set the following secrets in Supabase:

| Secret | Description | Required |
|--------|-------------|----------|
| `DWV_EMAIL` | Your DWV App login email | Yes |
| `DWV_PASSWORD` | Your DWV App login password | Yes |
| `AUTH_TOKEN_EXPIRY` | Token expiry time in seconds (default: 86400) | Optional |

- [ ] Use the following commands to set these secrets:
  ```bash
  supabase secrets set DWV_EMAIL=your_email@example.com
  supabase secrets set DWV_PASSWORD=your_password
  supabase secrets set AUTH_TOKEN_EXPIRY=86400
  ```

### 3. Verify Environment Variables

- [ ] Check Netlify environment variables are applied
  - Go to "Deploys" tab
  - Click on the latest deploy
  - Check build logs for environment variable usage
- [ ] Check Supabase function logs to verify secrets are accessible

## Deployment Verification Checklist

### 1. Frontend Verification

- [ ] Access your deployed Netlify site
- [ ] Verify the site loads without errors
- [ ] Check browser console for any JavaScript errors
- [ ] Verify all pages and components render correctly
- [ ] Test responsive design on different screen sizes

### 2. Authentication Verification

- [ ] Test DWV authentication functionality
  - Go to the "Teste de Autenticação" tab
  - Click "Testar Autenticação DWV"
  - Verify authentication succeeds
- [ ] Check authentication token storage and expiry
- [ ] Verify session persistence works correctly

### 3. Scraping Functionality Verification

- [ ] Test property scraping from DWV App
  - Go to the "DWV App (Autenticado)" tab
  - Click "Extrair Imóveis do DWV App"
  - Verify properties are extracted and displayed
- [ ] Test automatic search functionality
  - Go to the "Busca Automática" tab
  - Configure search parameters
  - Verify search results are displayed
- [ ] Test manual extraction
  - Go to the "Extração Manual" tab
  - Enter a property URL
  - Verify the property is extracted correctly

### 4. Database Verification

- [ ] Check Supabase database for stored properties
- [ ] Verify data structure matches expected schema
- [ ] Test querying and filtering functionality
- [ ] Verify data persistence across sessions

### 5. End-to-End Testing

- [ ] Perform a complete workflow test:
  1. Authenticate with DWV
  2. Extract properties
  3. View and filter properties
  4. Test all UI interactions
- [ ] Verify all steps work without errors

## Troubleshooting Guide

### CORS Issues

CORS (Cross-Origin Resource Sharing) issues are common when deploying applications that make cross-origin requests. Here's how to identify and fix CORS issues:

#### Identifying CORS Issues

- Look for errors in the browser console like:
  ```
  Access to fetch at 'https://your-project-ref.supabase.co/functions/v1/test-dwv-auth' from origin 'https://your-site.netlify.app' has been blocked by CORS policy
  ```
- API requests fail with status code 0 or no response
- Functions work when tested directly but fail when called from the frontend

#### Fixing CORS Issues

1. **Supabase Edge Functions CORS Configuration**:
   - [ ] Ensure the `corsHeaders` in `supabase/functions/_shared/cors.ts` include the correct settings:
     ```typescript
     export const corsHeaders = {
       'Access-Control-Allow-Origin': '*', // In production, replace with your specific domain
       'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
       'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
     };
     ```
   - [ ] For production, replace the wildcard `'*'` with your specific domain:
     ```typescript
     'Access-Control-Allow-Origin': 'https://your-site.netlify.app',
     ```
   - [ ] If using multiple domains, deploy separate functions or use environment variables to configure CORS

2. **Supabase Dashboard CORS Settings**:
   - [ ] Go to Supabase Dashboard → Settings → API
   - [ ] Under "CORS (Cross-Origin Resource Sharing)", add your Netlify domain
   - [ ] Ensure all required headers are allowed
   - [ ] Save settings and redeploy functions if necessary

3. **Netlify Headers Configuration**:
   - [ ] Create or update `netlify.toml` in your project root:
     ```toml
     [[headers]]
       for = "/*"
         [headers.values]
         Access-Control-Allow-Origin = "*"
         Access-Control-Allow-Methods = "GET, POST, PUT, DELETE, OPTIONS"
         Access-Control-Allow-Headers = "Content-Type, Authorization"
     ```
   - [ ] Redeploy your site to apply the headers

### Authentication Issues

- [ ] Verify DWV credentials are correct
- [ ] Check if DWV App is accessible
- [ ] Review token expiration settings
- [ ] Check function logs for authentication errors
- [ ] Verify cookies are being properly stored and sent
- [ ] Test authentication with the test-dwv-auth function directly

### Deployment Failures

#### Netlify Build Failures

- [ ] Check Node.js version (should be 20+)
- [ ] Verify all dependencies are installed
- [ ] Check for TypeScript or ESLint errors
- [ ] Review build logs for specific error messages
- [ ] Test build locally before deploying

#### Supabase Function Deployment Failures

- [ ] Verify Supabase CLI is up to date
- [ ] Check for syntax errors in function code
- [ ] Verify project linking is correct
- [ ] Check for missing dependencies
- [ ] Review function logs for specific error messages

### Environment Variable Issues

- [ ] Verify variables are correctly named
- [ ] Ensure frontend variables start with `VITE_`
- [ ] Check for typos in variable names
- [ ] Redeploy after adding or changing variables
- [ ] Verify variables are accessible in the code

## Monitoring and Maintenance

### 1. Setup Monitoring

- [ ] Configure Netlify Analytics (if available)
- [ ] Set up error tracking with a service like Sentry
  ```bash
  npm install @sentry/browser
  ```
- [ ] Implement health check endpoints
- [ ] Configure uptime monitoring
- [ ] Set up performance monitoring

### 2. Regular Maintenance Tasks

#### Weekly Tasks

- [ ] Review application logs for errors
- [ ] Check for failed scraping attempts
- [ ] Monitor authentication success rate
- [ ] Verify database performance
- [ ] Test critical functionality

#### Monthly Tasks

- [ ] Update dependencies
  ```bash
  npm update
  ```
- [ ] Review and optimize database queries
- [ ] Check for security vulnerabilities
  ```bash
  npm audit
  ```
- [ ] Perform full application testing
- [ ] Review and update documentation

#### Quarterly Tasks

- [ ] Perform security audits
- [ ] Review and optimize infrastructure
- [ ] Update deployment scripts
- [ ] Test disaster recovery procedures
- [ ] Review and update monitoring thresholds

### 3. Backup Procedures

- [ ] Configure automated database backups
  - Go to Supabase Dashboard → Database → Backups
  - Enable daily backups
- [ ] Test backup restoration process
- [ ] Document backup and restore procedures
- [ ] Implement off-site backup storage
- [ ] Set up backup monitoring and alerts

### 4. Scaling Considerations

- [ ] Monitor resource usage
- [ ] Identify performance bottlenecks
- [ ] Plan for increased traffic
- [ ] Consider database scaling options
- [ ] Evaluate function execution limits

### 5. Incident Response

- [ ] Create an incident response plan
- [ ] Define severity levels and response times
- [ ] Establish communication channels
- [ ] Document rollback procedures
- [ ] Conduct post-incident reviews

---

This deployment checklist provides a comprehensive guide for deploying the DWV Scraper application. Follow these steps carefully to ensure a successful deployment and maintain the application effectively over time.