# DWV Scraper - Deployment Guide

This guide provides comprehensive instructions for deploying the DWV Scraper application to production.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Supabase CLI installed (`npm install -g supabase`)
- Git repository access
- Supabase project created

### 1. Environment Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd dwv-scraper

# Copy environment template
cp deployment/environment-template.env .env

# Edit .env with your actual values
nano .env
```

### 2. Supabase Backend Deployment

```bash
# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Apply database migrations
supabase db push

# Deploy Edge Functions
supabase functions deploy test-dwv-auth
supabase functions deploy scrape-dwv-app
supabase functions deploy scrape-properties
supabase functions deploy health-check
```

### 3. Frontend Deployment

#### Option A: Vercel (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to Vercel
vercel --prod
```

#### Option B: Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy to Netlify
netlify deploy --prod --dir=dist
```

## 📋 Detailed Deployment Steps

### Phase 1: Supabase Project Setup

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and API keys

2. **Configure Environment Variables**
   ```bash
   # In your Supabase project dashboard:
   # Settings > API > Project API keys
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. **Set Up Database**
   ```bash
   # Apply migrations
   supabase db push
   
   # Verify tables created
   supabase db diff
   ```

### Phase 2: Edge Functions Deployment

1. **Deploy Core Functions**
   ```bash
   # Deploy authentication test
   supabase functions deploy test-dwv-auth
   
   # Deploy main scraper
   supabase functions deploy scrape-dwv-app
   
   # Deploy URL scraper
   supabase functions deploy scrape-properties
   
   # Deploy health check
   supabase functions deploy health-check
   ```

2. **Configure Function Environment Variables**
   ```bash
   # Set DWV credentials
   supabase secrets set DWV_EMAIL=your-email@example.com
   supabase secrets set DWV_PASSWORD=your-password
   supabase secrets set DWV_BASE_URL=https://app.dwv.com.br
   
   # Set scraping configuration
   supabase secrets set SCRAPING_RATE_LIMIT=30
   supabase secrets set SCRAPING_TIMEOUT=30
   ```

3. **Test Functions**
   ```bash
   # Test health check
   curl https://your-project-ref.supabase.co/functions/v1/health-check
   
   # Test authentication
   curl -X POST https://your-project-ref.supabase.co/functions/v1/test-dwv-auth
   ```

### Phase 3: Frontend Deployment

1. **Build Application**
   ```bash
   # Install dependencies
   npm ci
   
   # Build for production
   npm run build
   
   # Verify build
   ls -la dist/
   ```

2. **Deploy to Platform**

#### Vercel Deployment
```bash
# Initialize Vercel project
vercel

# Set environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Deploy to production
vercel --prod
```

#### Netlify Deployment
```bash
# Initialize Netlify project
netlify init

# Set environment variables
netlify env:set VITE_SUPABASE_URL https://your-project-ref.supabase.co
netlify env:set VITE_SUPABASE_ANON_KEY your-anon-key

# Deploy to production
netlify deploy --prod --dir=dist
```

### Phase 4: Post-Deployment Verification

1. **Health Check**
   ```bash
   # Test system health
   curl https://your-domain.com/api/health-check
   ```

2. **Functional Testing**
   - Test authentication with DWV App
   - Test property scraping
   - Test data display in frontend

3. **Performance Testing**
   - Check page load times
   - Verify API response times
   - Monitor error rates

## 🔧 Configuration Files

### Environment Variables
See `deployment/environment-template.env` for all available configuration options.

### Vercel Configuration
The `deployment/vercel.json` file configures:
- Build settings
- Routing rules
- Security headers
- Caching policies

### Netlify Configuration
The `deployment/netlify.toml` file configures:
- Build commands
- Redirect rules
- Headers and security
- Environment contexts

## 📊 Monitoring Setup

### 1. Health Check Endpoint
The health check function provides:
- System status overview
- Service health indicators
- Performance metrics
- Error reporting

### 2. Supabase Dashboard
Monitor:
- Database performance
- Edge Function logs
- API usage
- Storage usage

### 3. External Monitoring
Consider setting up:
- Uptime monitoring (Uptime Robot)
- Error tracking (Sentry)
- Performance monitoring (Vercel Analytics)

## 🔒 Security Configuration

### 1. Environment Variables
- Store sensitive data in environment variables
- Never commit credentials to version control
- Use different credentials for staging/production

### 2. CORS Configuration
```typescript
// Configure allowed origins
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://your-domain.com',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

### 3. Rate Limiting
```typescript
// Implement rate limiting
const rateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Environment Variables Not Set**
   ```bash
   # Check if variables are set
   supabase secrets list
   
   # Set missing variables
   supabase secrets set VARIABLE_NAME=value
   ```

2. **CORS Errors**
   - Verify CORS origins in Edge Functions
   - Check frontend URL configuration
   - Ensure HTTPS is used in production

3. **Authentication Failures**
   - Verify DWV credentials
   - Check DWV App accessibility
   - Review authentication logs

4. **Build Failures**
   ```bash
   # Clear cache and rebuild
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

### Debug Commands
```bash
# Check Supabase status
supabase status

# View function logs
supabase functions logs test-dwv-auth

# Test database connection
supabase db reset

# Check environment variables
supabase secrets list
```

## 📈 Performance Optimization

### 1. Frontend Optimization
- Enable gzip compression
- Optimize bundle size
- Implement caching strategies
- Use CDN for static assets

### 2. Backend Optimization
- Optimize database queries
- Implement connection pooling
- Use caching for frequently accessed data
- Monitor Edge Function performance

### 3. Monitoring and Alerts
- Set up performance monitoring
- Configure error alerts
- Monitor resource usage
- Track business metrics

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 📞 Support

### Documentation
- [Architecture Guide](docs/architecture.md)
- [Technical Documentation](docs/technical.md)
- [API Reference](docs/api.md)

### Contact
- Technical Issues: [GitHub Issues](https://github.com/your-repo/issues)
- Deployment Questions: [Documentation](docs/)
- Emergency: [Contact Information](deployment/deployment-plan.md)

## 🎯 Success Metrics

### Technical Metrics
- [ ] 99.9% uptime achieved
- [ ] < 3 second page load times
- [ ] < 2 second API response times
- [ ] < 1% error rate

### Business Metrics
- [ ] Successful property extraction
- [ ] User engagement metrics
- [ ] Data quality scores
- [ ] System scalability

## 🔄 Maintenance

### Regular Tasks
- Weekly performance reviews
- Monthly security audits
- Quarterly capacity planning
- Annual architecture reviews

### Updates
- Keep dependencies updated
- Monitor for security vulnerabilities
- Review and optimize performance
- Update documentation

---

**Note**: This deployment guide should be updated as the application evolves. Always test changes in a staging environment before deploying to production. 