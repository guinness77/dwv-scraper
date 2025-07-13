/**
 * Background Process Manager for DWV App
 * Handles automated authentication, data extraction, and database storage
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHeadlessAuth } from './dwv-headless-auth.ts';
import { createDataExtractor } from './dwv-data-extractor.ts';

export interface ProcessResult {
  success: boolean;
  message: string;
  propertiesExtracted: number;
  propertiesSaved: number;
  error?: string;
  debugInfo?: any;
}

export interface ProcessConfig {
  credentials: {
    email: string;
    password: string;
  };
  supabase: {
    url: string;
    serviceKey: string;
  };
  options: {
    maxRetries: number;
    retryDelay: number;
    batchSize: number;
    enableLogging: boolean;
  };
}

export class DWVBackgroundProcessor {
  private config: ProcessConfig;
  private supabase: any;
  private isRunning = false;
  private lastRun: Date | null = null;

  constructor(config: ProcessConfig) {
    this.config = config;
    this.supabase = createClient(config.supabase.url, config.supabase.serviceKey);
  }

  /**
   * Main background process execution
   */
  async executeProcess(): Promise<ProcessResult> {
    if (this.isRunning) {
      return {
        success: false,
        message: 'Process is already running',
        propertiesExtracted: 0,
        propertiesSaved: 0,
        error: 'Process already in progress'
      };
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      this.log('🚀 Starting background process...');
      
      // Step 1: Authenticate with DWV App
      this.log('🔐 Authenticating with DWV App...');
      const authResult = await this.authenticateWithRetry();
      
      if (!authResult.success || !authResult.session) {
        throw new Error(`Authentication failed: ${authResult.message}`);
      }
      
      this.log('✅ Authentication successful');
      
      // Step 2: Extract data
      this.log('🔍 Extracting property data...');
      const extractionResult = await this.extractDataWithRetry(authResult.session.cookies);
      
      if (!extractionResult.success) {
        throw new Error(`Data extraction failed: ${extractionResult.error}`);
      }
      
      this.log(`✅ Extracted ${extractionResult.properties.length} properties`);
      
      // Step 3: Store data in database
      this.log('💾 Storing data in database...');
      const storageResult = await this.storeDataWithRetry(extractionResult.properties);
      
      this.log(`✅ Stored ${storageResult.saved} new properties`);
      
      // Step 4: Update process metadata
      await this.updateProcessMetadata({
        lastRun: new Date(),
        propertiesExtracted: extractionResult.properties.length,
        propertiesSaved: storageResult.saved,
        success: true
      });
      
      const duration = Date.now() - startTime;
      this.lastRun = new Date();
      
      return {
        success: true,
        message: `Process completed successfully in ${duration}ms`,
        propertiesExtracted: extractionResult.properties.length,
        propertiesSaved: storageResult.saved,
        debugInfo: {
          duration,
          authMethod: authResult.session?.sessionId,
          extractionSources: extractionResult.source,
          duplicatesRemoved: extractionResult.properties.length - storageResult.saved
        }
      };
      
    } catch (error) {
      this.log(`❌ Process failed: ${error.message}`);
      
      // Update process metadata with error
      await this.updateProcessMetadata({
        lastRun: new Date(),
        propertiesExtracted: 0,
        propertiesSaved: 0,
        success: false,
        error: error.message
      });
      
      return {
        success: false,
        message: `Process failed: ${error.message}`,
        propertiesExtracted: 0,
        propertiesSaved: 0,
        error: error.message
      };
      
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Authenticate with retry mechanism
   */
  private async authenticateWithRetry(): Promise<any> {
    for (let attempt = 1; attempt <= this.config.options.maxRetries; attempt++) {
      try {
        this.log(`🔐 Authentication attempt ${attempt}/${this.config.options.maxRetries}`);
        
        const auth = createHeadlessAuth(this.config.credentials);
        const result = await auth.authenticate();
        
        if (result.success) {
          return result;
        } else {
          this.log(`⚠️ Authentication attempt ${attempt} failed: ${result.message}`);
          
          if (attempt === this.config.options.maxRetries) {
            throw new Error(`Authentication failed after ${this.config.options.maxRetries} attempts: ${result.message}`);
          }
          
          // Wait before retry
          await this.delay(this.config.options.retryDelay * attempt);
        }
        
      } catch (error) {
        this.log(`❌ Authentication attempt ${attempt} error: ${error.message}`);
        
        if (attempt === this.config.options.maxRetries) {
          throw error;
        }
        
        await this.delay(this.config.options.retryDelay * attempt);
      }
    }
  }

  /**
   * Extract data with retry mechanism
   */
  private async extractDataWithRetry(sessionCookies: string): Promise<any> {
    for (let attempt = 1; attempt <= this.config.options.maxRetries; attempt++) {
      try {
        this.log(`🔍 Data extraction attempt ${attempt}/${this.config.options.maxRetries}`);
        
        const extractor = createDataExtractor(sessionCookies);
        const result = await extractor.extractAllData();
        
        if (result.success && result.properties.length > 0) {
          return result;
        } else {
          this.log(`⚠️ Extraction attempt ${attempt} returned no data: ${result.message}`);
          
          if (attempt === this.config.options.maxRetries) {
            throw new Error(`Data extraction failed after ${this.config.options.maxRetries} attempts: ${result.error || 'No data found'}`);
          }
          
          await this.delay(this.config.options.retryDelay * attempt);
        }
        
      } catch (error) {
        this.log(`❌ Extraction attempt ${attempt} error: ${error.message}`);
        
        if (attempt === this.config.options.maxRetries) {
          throw error;
        }
        
        await this.delay(this.config.options.retryDelay * attempt);
      }
    }
  }

  /**
   * Store data with retry and batch processing
   */
  private async storeDataWithRetry(properties: any[]): Promise<{saved: number, errors: number}> {
    let totalSaved = 0;
    let totalErrors = 0;
    
    // Check for existing properties to avoid duplicates
    const existingTitles = await this.getExistingTitles(properties.map(p => p.title));
    const newProperties = properties.filter(p => !existingTitles.includes(p.title));
    
    this.log(`📊 Found ${newProperties.length} new properties out of ${properties.length} total`);
    
    if (newProperties.length === 0) {
      return { saved: 0, errors: 0 };
    }
    
    // Process in batches
    const batches = this.createBatches(newProperties, this.config.options.batchSize);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      this.log(`💾 Processing batch ${i + 1}/${batches.length} (${batch.length} properties)`);
      
      try {
        const { data, error } = await this.supabase
          .from('properties')
          .insert(batch)
          .select();
        
        if (error) {
          this.log(`❌ Batch ${i + 1} failed: ${error.message}`);
          totalErrors += batch.length;
        } else {
          this.log(`✅ Batch ${i + 1} saved: ${data?.length || 0} properties`);
          totalSaved += data?.length || 0;
        }
        
        // Delay between batches
        if (i < batches.length - 1) {
          await this.delay(1000);
        }
        
      } catch (error) {
        this.log(`❌ Batch ${i + 1} error: ${error.message}`);
        totalErrors += batch.length;
      }
    }
    
    return { saved: totalSaved, errors: totalErrors };
  }

  /**
   * Get existing property titles to avoid duplicates
   */
  private async getExistingTitles(titles: string[]): Promise<string[]> {
    try {
      if (!titles || titles.length === 0) return [];
      
      const { data, error } = await this.supabase
        .from('properties')
        .select('title')
        .in('title', titles);
      
      if (error) {
        this.log(`⚠️ Error checking existing titles: ${error.message}`);
        return [];
      }
      
      return data?.map((item: any) => item.title) || [];
      
    } catch (error) {
      this.log(`❌ Error checking existing titles: ${error.message}`);
      return [];
    }
  }

  /**
   * Create batches for processing
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Update process metadata in database
   */
  private async updateProcessMetadata(metadata: any): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('process_metadata')
        .upsert({
          process_name: 'dwv_scraper',
          ...metadata,
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        this.log(`⚠️ Failed to update process metadata: ${error.message}`);
      }
      
    } catch (error) {
      this.log(`❌ Error updating process metadata: ${error.message}`);
    }
  }

  /**
   * Logging utility
   */
  private log(message: string): void {
    if (this.config.options.enableLogging) {
      console.log(`[${new Date().toISOString()}] ${message}`);
    }
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get process status
   */
  getStatus(): {isRunning: boolean, lastRun: Date | null} {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun
    };
  }
}

/**
 * Create background processor instance
 */
export function createBackgroundProcessor(config: ProcessConfig): DWVBackgroundProcessor {
  return new DWVBackgroundProcessor(config);
}