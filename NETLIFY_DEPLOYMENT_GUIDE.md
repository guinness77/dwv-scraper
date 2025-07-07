# 🚀 DWV Scraper - Netlify Deployment Guide

## 📋 Prerequisites

Before deploying to Netlify, ensure you have:

- ✅ Node.js 20+ installed
- ✅ Git repository connected
- ✅ Supabase project created
- ✅ Netlify account

## 🔗 Step 1: Connect to Netlify

### Option A: Using Netlify CLI (Recommended)

1. **Login to Netlify:**
   ```bash
   npx netlify-cli login
   ```

2. **Initialize your project:**
   ```bash
   npx netlify-cli init
   ```

3. **Follow the prompts:**
   - Choose "Create & configure a new site"
   - Select your team
   - Choose a site name (e.g., "dwv-scraper")
   - Confirm the build settings

### Option B: Using Netlify Dashboard

1. Go to [app.netlify.com](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub repository
4. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** `20`

## ⚙️ Step 2: Configure Environment Variables

### In Netlify Dashboard:

1. Go to your site settings
2. Navigate to "Environment variables"
3. Add the following variables:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### To get your Supabase credentials:

1. Go to [supabase.com](https://supabase.com)
2. Open your project
3. Go to Settings → API
4. Copy the URL and anon key

## 🏗️ Step 3: Deploy Your Site

### Automatic Deployment (Recommended)

1. **Push to your main branch:**
   ```bash
   git add .
   git commit -m "Ready for Netlify deployment"
   git push origin main
   ```

2. **Netlify will automatically build and deploy**

### Manual Deployment

1. **Build your project:**
   ```bash
   npm run build
   ```

2. **Deploy to Netlify:**
   ```bash
   npx netlify-cli deploy --prod --dir=dist
   ```

## 🔧 Step 4: Configure Supabase Backend

### Deploy Supabase Functions

1. **Install Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase:**
   ```bash
   supabase login
   ```

3. **Link your project:**
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. **Deploy functions:**
   ```bash
   supabase functions deploy scrape-dwv-app
   supabase functions deploy scrape-properties
   ```

## 🌐 Step 5: Configure Custom Domain (Optional)

1. In Netlify dashboard, go to "Domain settings"
2. Click "Add custom domain"
3. Follow the DNS configuration instructions

## 📊 Step 6: Monitor Your Deployment

### Check Build Status

1. Go to your Netlify dashboard
2. Check the "Deploys" tab
3. Verify build success

### Test Your Application

1. Visit your deployed site
2. Test the DWV authentication
3. Test property scraping functionality
4. Verify all features work correctly

## 🔍 Troubleshooting

### Common Issues

**Build Fails:**
- Check Node.js version (should be 20+)
- Verify all dependencies are installed
- Check for TypeScript errors

**Environment Variables Not Working:**
- Ensure variables start with `VITE_`
- Redeploy after adding variables
- Check variable names match exactly

**Supabase Connection Issues:**
- Verify Supabase URL and key
- Check CORS settings in Supabase
- Ensure functions are deployed

### Debug Commands

```bash
# Check build locally
npm run build

# Test locally
npm run dev

# Check Netlify status
npx netlify-cli status

# View deployment logs
npx netlify-cli logs
```

## 🚀 Production Checklist

- [ ] Site deployed successfully
- [ ] Environment variables configured
- [ ] Supabase functions deployed
- [ ] Authentication working
- [ ] Scraping functionality tested
- [ ] Custom domain configured (if needed)
- [ ] SSL certificate active
- [ ] Performance optimized
- [ ] Error monitoring set up

## 📞 Support

If you encounter issues:

1. Check the Netlify build logs
2. Verify Supabase function logs
3. Test locally first
4. Check environment variables
5. Review the troubleshooting section above

## 🎯 Next Steps

After successful deployment:

1. **Set up monitoring** for performance and errors
2. **Configure backups** for your database
3. **Set up CI/CD** for automatic deployments
4. **Optimize performance** based on usage
5. **Add analytics** to track user behavior

---

**Your DWV Scraper is now ready for production! 🎉** 