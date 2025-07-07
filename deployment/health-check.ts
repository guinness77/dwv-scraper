// Health Check Edge Function for DWV Scraper
// This function provides system health status and metrics

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  version: string
  uptime: number
  services: {
    database: 'connected' | 'error' | 'timeout'
    edge_functions: 'running' | 'error'
    scraping: 'operational' | 'error' | 'rate_limited'
    authentication: 'working' | 'error'
  }
  metrics: {
    total_properties: number
    properties_scraped_today: number
    last_scraping_activity: string | null
    error_rate: number
    response_time: number
    memory_usage: number
  }
  environment: {
    node_env: string
    supabase_url: string
    deployment_platform: string
  }
  errors?: string[]
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: 0,
    services: {
      database: 'connected',
      edge_functions: 'running',
      scraping: 'operational',
      authentication: 'working'
    },
    metrics: {
      total_properties: 0,
      properties_scraped_today: 0,
      last_scraping_activity: null,
      error_rate: 0,
      response_time: 0,
      memory_usage: 0
    },
    environment: {
      node_env: Deno.env.get('NODE_ENV') || 'production',
      supabase_url: Deno.env.get('VITE_SUPABASE_URL') || 'not_set',
      deployment_platform: Deno.env.get('DEPLOYMENT_PLATFORM') || 'supabase'
    },
    errors: []
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      health.status = 'unhealthy'
      health.errors?.push('Missing Supabase configuration')
      health.services.database = 'error'
    } else {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      // Test database connection
      try {
        const { data: dbTest, error: dbError } = await supabase
          .from('properties')
          .select('count')
          .limit(1)
        
        if (dbError) {
          health.status = 'unhealthy'
          health.services.database = 'error'
          health.errors?.push(`Database error: ${dbError.message}`)
        } else {
          // Get total properties count
          const { count } = await supabase
            .from('properties')
            .select('*', { count: 'exact', head: true })
          
          health.metrics.total_properties = count || 0

          // Get properties scraped today
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          
          const { count: todayCount } = await supabase
            .from('properties')
            .select('*', { count: 'exact', head: true })
            .gte('scraped_at', today.toISOString())
          
          health.metrics.properties_scraped_today = todayCount || 0

          // Get last scraping activity
          const { data: lastScraping } = await supabase
            .from('properties')
            .select('scraped_at')
            .order('scraped_at', { ascending: false })
            .limit(1)
          
          health.metrics.last_scraping_activity = lastScraping?.[0]?.scraped_at || null

          // Calculate error rate (properties with errors in last 24 hours)
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)
          
          const { count: errorCount } = await supabase
            .from('properties')
            .select('*', { count: 'exact', head: true })
            .gte('scraped_at', yesterday.toISOString())
            .or('status.eq.error,title.is.null')
          
          const { count: totalRecent } = await supabase
            .from('properties')
            .select('*', { count: 'exact', head: true })
            .gte('scraped_at', yesterday.toISOString())
          
          health.metrics.error_rate = totalRecent > 0 ? (errorCount || 0) / totalRecent : 0
        }
      } catch (dbError) {
        health.status = 'unhealthy'
        health.services.database = 'timeout'
        health.errors?.push(`Database timeout: ${dbError.message}`)
      }

      // Test authentication service
      try {
        const dwvEmail = Deno.env.get('DWV_EMAIL')
        const dwvPassword = Deno.env.get('DWV_PASSWORD')
        
        if (!dwvEmail || !dwvPassword) {
          health.services.authentication = 'error'
          health.errors?.push('DWV credentials not configured')
        } else {
          // Test authentication endpoint (without actually logging in)
          const authTestResponse = await fetch(`${Deno.env.get('DWV_BASE_URL')}/login`, {
            method: 'HEAD',
            timeout: 5000
          })
          
          if (!authTestResponse.ok) {
            health.services.authentication = 'error'
            health.errors?.push('DWV authentication endpoint unreachable')
          }
        }
      } catch (authError) {
        health.services.authentication = 'error'
        health.errors?.push(`Authentication test failed: ${authError.message}`)
      }
    }

    // Check memory usage
    const memoryUsage = performance.memory || { usedJSHeapSize: 0, totalJSHeapSize: 0 }
    health.metrics.memory_usage = memoryUsage.usedJSHeapSize / memoryUsage.totalJSHeapSize

    // Calculate response time
    health.metrics.response_time = Date.now() - startTime

    // Determine overall status
    const errorCount = health.errors?.length || 0
    const criticalErrors = health.services.database === 'error' || health.services.database === 'timeout'
    
    if (criticalErrors) {
      health.status = 'unhealthy'
    } else if (errorCount > 0) {
      health.status = 'degraded'
    }

    // Set appropriate status code
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503

    return new Response(JSON.stringify(health, null, 2), {
      status: statusCode,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    })

  } catch (error) {
    health.status = 'unhealthy'
    health.errors?.push(`Health check failed: ${error.message}`)
    
    return new Response(JSON.stringify(health, null, 2), {
      status: 503,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
    })
  }
}) 