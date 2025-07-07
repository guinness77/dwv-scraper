# Monitoring Setup Guide - DWV Scraper

This guide outlines the monitoring and alerting setup for the DWV Scraper production deployment.

## Overview

Effective monitoring is crucial for maintaining the health and performance of the DWV Scraper application. This guide covers monitoring for both the frontend and backend components.

## Monitoring Stack

### 1. Application Performance Monitoring (APM)
- **Frontend**: Vercel Analytics / Google Analytics
- **Backend**: Supabase Dashboard / Custom logging
- **Edge Functions**: Supabase Function Logs

### 2. Infrastructure Monitoring
- **Database**: Supabase Dashboard
- **Storage**: Supabase Storage monitoring
- **CDN**: Platform-specific monitoring (Vercel/Netlify)

### 3. Business Metrics
- **Property Extraction**: Number of properties scraped
- **User Activity**: Active users, session duration
- **Error Rates**: Failed scraping attempts, authentication failures

## Monitoring Configuration

### 1. Supabase Monitoring

#### Database Monitoring
```sql
-- Create monitoring views
CREATE VIEW property_extraction_stats AS
SELECT 
    DATE(scraped_at) as extraction_date,
    COUNT(*) as properties_extracted,
    COUNT(DISTINCT listing_url) as unique_properties
FROM properties 
GROUP BY DATE(scraped_at)
ORDER BY extraction_date DESC;

-- Monitor failed scraping attempts
CREATE VIEW scraping_errors AS
SELECT 
    scraped_at,
    title,
    listing_url,
    status
FROM properties 
WHERE status = 'error' OR title IS NULL;
```

#### Edge Function Monitoring
```typescript
// Add logging to Edge Functions
const logEvent = (event: string, data: any) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    data,
    function: 'scrape-dwv-app'
  }));
};

// Usage in Edge Functions
try {
  const result = await scrapeDWVApp();
  logEvent('scraping_success', { 
    properties_found: result.properties.length,
    duration: Date.now() - startTime 
  });
} catch (error) {
  logEvent('scraping_error', { 
    error: error.message,
    duration: Date.now() - startTime 
  });
}
```

### 2. Frontend Monitoring

#### Error Tracking
```typescript
// Add error boundary to React app
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

// Usage in App.tsx
<ErrorBoundary
  FallbackComponent={ErrorFallback}
  onError={(error, errorInfo) => {
    // Log error to monitoring service
    console.error('Frontend Error:', error, errorInfo);
  }}
>
  <App />
</ErrorBoundary>
```

#### Performance Monitoring
```typescript
// Add performance monitoring
const reportWebVitals = (metric) => {
  console.log('Web Vital:', metric);
  // Send to monitoring service
};

// Usage in main.tsx
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(reportWebVitals);
getFID(reportWebVitals);
getFCP(reportWebVitals);
getLCP(reportWebVitals);
getTTFB(reportWebVitals);
```

### 3. Custom Monitoring Dashboard

#### Health Check Endpoint
```typescript
// Create health check Edge Function
Deno.serve(async (req: Request) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      edge_functions: 'running',
      scraping: 'operational'
    },
    metrics: {
      total_properties: 0,
      last_scraping: null,
      error_rate: 0
    }
  };

  try {
    // Check database connection
    const { data, error } = await supabase
      .from('properties')
      .select('count')
      .limit(1);
    
    if (error) {
      health.status = 'unhealthy';
      health.services.database = 'error';
    } else {
      health.metrics.total_properties = data?.length || 0;
    }

    // Check last scraping activity
    const { data: lastScraping } = await supabase
      .from('properties')
      .select('scraped_at')
      .order('scraped_at', { ascending: false })
      .limit(1);

    health.metrics.last_scraping = lastScraping?.[0]?.scraped_at;

  } catch (error) {
    health.status = 'unhealthy';
    health.error = error.message;
  }

  return new Response(JSON.stringify(health), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

## Alerting Configuration

### 1. Critical Alerts

#### High Error Rate
```yaml
# Alert when error rate > 5% in 5 minutes
alert: HighErrorRate
expr: rate(scraping_errors_total[5m]) > 0.05
for: 2m
labels:
  severity: critical
annotations:
  summary: "High error rate detected"
  description: "Error rate is {{ $value }} errors per second"
```

#### Authentication Failures
```yaml
# Alert when authentication failures > 3 in 10 minutes
alert: AuthenticationFailures
expr: increase(auth_failures_total[10m]) > 3
for: 1m
labels:
  severity: warning
annotations:
  summary: "Multiple authentication failures"
  description: "{{ $value }} authentication failures in the last 10 minutes"
```

#### Database Connection Issues
```yaml
# Alert when database is unreachable
alert: DatabaseDown
expr: up{job="supabase-db"} == 0
for: 1m
labels:
  severity: critical
annotations:
  summary: "Database is down"
  description: "Database connection lost"
```

### 2. Performance Alerts

#### Slow Response Times
```yaml
# Alert when API response time > 5 seconds
alert: SlowAPIResponse
expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 5
for: 2m
labels:
  severity: warning
annotations:
  summary: "Slow API response times"
  description: "95th percentile response time is {{ $value }} seconds"
```

#### High Memory Usage
```yaml
# Alert when memory usage > 80%
alert: HighMemoryUsage
expr: (memory_usage_bytes / memory_total_bytes) * 100 > 80
for: 5m
labels:
  severity: warning
annotations:
  summary: "High memory usage"
  description: "Memory usage is {{ $value }}%"
```

### 3. Business Alerts

#### No New Properties
```yaml
# Alert when no new properties scraped in 24 hours
alert: NoNewProperties
expr: increase(properties_scraped_total[24h]) == 0
for: 1h
labels:
  severity: warning
annotations:
  summary: "No new properties scraped"
  description: "No new properties have been scraped in the last 24 hours"
```

#### Low User Activity
```yaml
# Alert when user activity drops significantly
alert: LowUserActivity
expr: rate(active_users_total[1h]) < 0.1
for: 30m
labels:
  severity: info
annotations:
  summary: "Low user activity"
  description: "User activity has dropped significantly"
```

## Logging Strategy

### 1. Structured Logging
```typescript
// Create structured logger
interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  service: string;
  message: string;
  data?: any;
  userId?: string;
  sessionId?: string;
}

const logger = {
  info: (message: string, data?: any) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      service: 'dwv-scraper',
      message,
      data
    };
    console.log(JSON.stringify(entry));
  },
  
  warn: (message: string, data?: any) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      service: 'dwv-scraper',
      message,
      data
    };
    console.warn(JSON.stringify(entry));
  },
  
  error: (message: string, error?: Error, data?: any) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      service: 'dwv-scraper',
      message,
      data: {
        ...data,
        error: error?.message,
        stack: error?.stack
      }
    };
    console.error(JSON.stringify(entry));
  }
};
```

### 2. Log Aggregation
- Use Supabase Logs for Edge Functions
- Use platform-specific logging (Vercel/Netlify)
- Consider external log aggregation service (LogRocket, Sentry)

## Dashboard Configuration

### 1. Key Metrics Dashboard

#### Overview Panel
- Total properties scraped
- Properties scraped today
- Active users
- Error rate
- Response time

#### Scraping Performance Panel
- Properties scraped per hour
- Success rate by source
- Average scraping time
- Failed scraping attempts

#### User Activity Panel
- Daily active users
- Session duration
- Page views
- User retention

#### System Health Panel
- Database performance
- Edge Function response times
- Memory usage
- Error rates by service

### 2. Alert Dashboard
- Current alerts
- Alert history
- Alert resolution times
- Alert trends

## Maintenance and Optimization

### 1. Regular Reviews
- Weekly performance reviews
- Monthly capacity planning
- Quarterly security audits

### 2. Optimization Opportunities
- Database query optimization
- Edge Function performance tuning
- Frontend bundle size optimization
- Caching strategy improvements

### 3. Scaling Considerations
- Monitor resource usage trends
- Plan for increased load
- Consider auto-scaling solutions
- Optimize for cost efficiency

## Emergency Procedures

### 1. Incident Response
1. **Detection**: Automated alerts trigger
2. **Assessment**: Determine severity and impact
3. **Response**: Execute appropriate response plan
4. **Resolution**: Fix the issue
5. **Recovery**: Restore normal operations
6. **Review**: Post-incident analysis

### 2. Escalation Matrix
- **Level 1**: Automated recovery attempts
- **Level 2**: On-call engineer notification
- **Level 3**: Team lead escalation
- **Level 4**: Management escalation

### 3. Communication Plan
- Internal team notifications
- Stakeholder updates
- Customer communication (if needed)
- Status page updates

## Tools and Services

### Recommended Monitoring Tools
1. **Supabase Dashboard**: Built-in monitoring
2. **Vercel Analytics**: Frontend performance
3. **Sentry**: Error tracking
4. **LogRocket**: Session replay
5. **Uptime Robot**: External monitoring

### Cost Considerations
- Free tier limitations
- Scaling costs
- Data retention policies
- Optimization opportunities

## Conclusion

This monitoring setup provides comprehensive visibility into the DWV Scraper application's health, performance, and business metrics. Regular review and optimization of the monitoring strategy will ensure the application remains reliable and performant as it scales. 