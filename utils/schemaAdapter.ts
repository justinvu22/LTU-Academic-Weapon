import { UserActivity } from '../types/activity';

/**
 * SchemaAdapter - A utility that helps adapt to different data schemas and formats.
 * This allows the application to work with various data sources and evolving threat patterns.
 */

// Known schema versions or formats
export enum SchemaFormat {
  DEFAULT = 'default',
  LEGACY = 'legacy',
  CSV = 'csv',
  SIMPLE_JSON = 'simple_json',
  SIEM = 'siem',
  CUSTOM = 'custom'
}

interface SchemaMapping {
  id: string;
  username: string;
  timestamp: string;
  date?: string;
  riskScore: string;
  integration: string;
  activityType?: string;
  department?: string;
  location?: string;
  status?: string;
  values?: string;
  policiesBreached?: string;
}

// Default mapping for various schemas
const SCHEMA_MAPPINGS: Record<SchemaFormat, SchemaMapping> = {
  [SchemaFormat.DEFAULT]: {
    id: 'id',
    username: 'username',
    timestamp: 'timestamp',
    date: 'date',
    riskScore: 'riskScore',
    integration: 'integration',
    activityType: 'activityType',
    department: 'department',
    location: 'location',
    status: 'status',
    values: 'values',
    policiesBreached: 'policiesBreached'
  },
  [SchemaFormat.LEGACY]: {
    id: 'id',
    username: 'user',
    timestamp: 'time',
    riskScore: 'risk',
    integration: 'service',
    activityType: 'type',
    values: 'data',
    policiesBreached: 'breaches'
  },
  [SchemaFormat.SIEM]: {
    id: 'event_id',
    username: 'user_principal',
    timestamp: 'event_time',
    riskScore: 'severity_score',
    integration: 'source_service',
    activityType: 'event_category',
    department: 'organization_unit',
    location: 'geo_location',
    values: 'attributes',
    policiesBreached: 'security_policies'
  },
  [SchemaFormat.SIMPLE_JSON]: {
    id: 'id',
    username: 'user',
    timestamp: 'timestamp',
    riskScore: 'score',
    integration: 'source',
    values: 'details',
    policiesBreached: 'violations'
  },
  [SchemaFormat.CSV]: {
    id: 'activityId',
    username: 'user',
    timestamp: 'time',
    date: 'date',
    riskScore: 'riskScore',
    integration: 'integration',
    status: 'status',
    values: 'values',
    policiesBreached: 'policiesBreached'
  },
  [SchemaFormat.CUSTOM]: {
    // This will be populated dynamically
    id: '',
    username: '',
    timestamp: '',
    riskScore: '',
    integration: '',
    values: '',
    policiesBreached: ''
  }
};

/**
 * SchemaAdapter class - Adapts and normalizes different data schemas
 */
export class SchemaAdapter {
  private customMapping: SchemaMapping | null = null;

  constructor() {
    this.customMapping = null;
  }

  /**
   * Detect the schema format from a sample
   */
  detectSchemaFormat(sample: any): SchemaFormat {
    if (!sample) return SchemaFormat.DEFAULT;
    
    if (Array.isArray(sample)) {
      // Check first item in array
      if (sample.length === 0) return SchemaFormat.DEFAULT;
      sample = sample[0];
    }
    
    // Check if it's a simple string (possibly CSV header row)
    if (typeof sample === 'string') {
      return SchemaFormat.CSV;
    }
    
    // Check object fields to determine format
    const keys = Object.keys(sample);
    
    // Handle the activity_report.csv format which has specific field names
    if (
      keys.includes('activityId') && 
      keys.includes('user') && 
      keys.includes('date') && 
      keys.includes('time')
    ) {
      return SchemaFormat.CSV;
    }
    
    // SIEM typically has standardized field names
    if (
      keys.includes('event_id') && 
      keys.includes('event_time') && 
      (keys.includes('severity_score') || keys.includes('security_policies'))
    ) {
      return SchemaFormat.SIEM;
    }
    
    // Legacy format had specific field names
    if (
      keys.includes('user') && 
      keys.includes('time') && 
      keys.includes('risk') &&
      keys.includes('service')
    ) {
      return SchemaFormat.LEGACY;
    }
    
    // Simple JSON uses basic names
    if (
      keys.includes('user') && 
      keys.includes('score') && 
      keys.includes('source') &&
      !keys.includes('username')
    ) {
      return SchemaFormat.SIMPLE_JSON;
    }
    
    // Default format matches our app's internal schema
    if (
      keys.includes('username') && 
      keys.includes('riskScore') && 
      keys.includes('integration')
    ) {
      return SchemaFormat.DEFAULT;
    }
    
    // If we couldn't determine, set up a custom mapping
    return SchemaFormat.CUSTOM;
  }

  /**
   * Learn a custom schema mapping from a sample
   */
  learnCustomMapping(sample: any): SchemaMapping {
    if (!sample) return SCHEMA_MAPPINGS[SchemaFormat.DEFAULT];
    
    if (Array.isArray(sample)) {
      if (sample.length === 0) return SCHEMA_MAPPINGS[SchemaFormat.DEFAULT];
      sample = sample[0];
    }
    
    const keys = Object.keys(sample);
    const mapping = { ...SCHEMA_MAPPINGS[SchemaFormat.CUSTOM] };
    
    // Try to intelligently map fields based on common naming patterns
    
    // Find ID field
    const idFields = keys.filter(k => 
      k.toLowerCase().includes('id') || 
      k.toLowerCase() === 'key' || 
      k.toLowerCase() === 'uid'
    );
    if (idFields.length > 0) mapping.id = idFields[0];
    
    // Find username field
    const userFields = keys.filter(k => 
      k.toLowerCase().includes('user') || 
      k.toLowerCase().includes('account') ||
      k.toLowerCase().includes('actor')
    );
    if (userFields.length > 0) mapping.username = userFields[0];
    
    // Find timestamp field
    const timeFields = keys.filter(k => 
      k.toLowerCase().includes('time') || 
      k.toLowerCase().includes('date') ||
      k.toLowerCase().includes('timestamp')
    );
    if (timeFields.length > 0) mapping.timestamp = timeFields[0];
    
    // Find risk score field
    const riskFields = keys.filter(k => 
      k.toLowerCase().includes('risk') || 
      k.toLowerCase().includes('score') ||
      k.toLowerCase().includes('severity') ||
      k.toLowerCase().includes('priority')
    );
    if (riskFields.length > 0) mapping.riskScore = riskFields[0];
    
    // Find integration field
    const integrationFields = keys.filter(k => 
      k.toLowerCase().includes('app') || 
      k.toLowerCase().includes('service') ||
      k.toLowerCase().includes('integration') ||
      k.toLowerCase().includes('source') ||
      k.toLowerCase().includes('system')
    );
    if (integrationFields.length > 0) mapping.integration = integrationFields[0];
    
    // Find values/details field
    const valuesFields = keys.filter(k => 
      k.toLowerCase().includes('value') || 
      k.toLowerCase().includes('detail') ||
      k.toLowerCase().includes('data') ||
      k.toLowerCase().includes('attribute')
    );
    if (valuesFields.length > 0) mapping.values = valuesFields[0];
    
    // Find policies breached field
    const policyFields = keys.filter(k => 
      k.toLowerCase().includes('policy') || 
      k.toLowerCase().includes('breach') ||
      k.toLowerCase().includes('violation') ||
      k.toLowerCase().includes('alert')
    );
    if (policyFields.length > 0) mapping.policiesBreached = policyFields[0];
    
    // Save the custom mapping
    this.customMapping = mapping;
    
    return mapping;
  }

  /**
   * Convert a raw activity object to our application's UserActivity format
   */
  convertToStandardFormat(raw: any, schemaFormat?: SchemaFormat): UserActivity {
    // Detect schema if not provided
    if (!schemaFormat) {
      schemaFormat = this.detectSchemaFormat(raw);
    }
    
    // Get mapping for the schema
    let mapping = SCHEMA_MAPPINGS[schemaFormat];
    
    // If using custom schema, learn the mapping
    if (schemaFormat === SchemaFormat.CUSTOM) {
      mapping = this.customMapping || this.learnCustomMapping(raw);
    }
    
    // Create standardized activity object
    const activity: UserActivity = {
      id: this.getNestedProperty(raw, mapping.id) || `generated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username: this.getNestedProperty(raw, mapping.username) || 'unknown',
      timestamp: this.getNestedProperty(raw, mapping.timestamp) || new Date().toISOString(),
      riskScore: parseFloat(this.getNestedProperty(raw, mapping.riskScore)) || 0,
      integration: this.getNestedProperty(raw, mapping.integration) || 'unknown',
      values: {},
      policiesBreached: {}
    };
    
    // Handle optional fields if they exist in the mapping
    if (mapping.date && this.getNestedProperty(raw, mapping.date)) {
      activity.date = this.getNestedProperty(raw, mapping.date);
    } else if (activity.timestamp) {
      // Try to extract date from timestamp
      try {
        activity.date = new Date(activity.timestamp).toISOString().split('T')[0];
      } catch (e) {
        console.warn('Could not extract date from timestamp');
      }
    }
    
    if (mapping.activityType && this.getNestedProperty(raw, mapping.activityType)) {
      activity.activityType = this.getNestedProperty(raw, mapping.activityType);
    }
    
    if (mapping.department && this.getNestedProperty(raw, mapping.department)) {
      activity.department = this.getNestedProperty(raw, mapping.department);
    }
    
    if (mapping.location && this.getNestedProperty(raw, mapping.location)) {
      activity.location = this.getNestedProperty(raw, mapping.location);
    }
    
    if (mapping.status && this.getNestedProperty(raw, mapping.status)) {
      activity.status = this.getNestedProperty(raw, mapping.status);
    }
    
    // Handle values object (can be nested)
    if (mapping.values && this.getNestedProperty(raw, mapping.values)) {
      const values = this.getNestedProperty(raw, mapping.values);
      if (typeof values === 'object' && values !== null) {
        activity.values = values;
      } else if (typeof values === 'string') {
        try {
          activity.values = JSON.parse(values);
        } catch (e) {
          activity.values = { raw: values };
        }
      }
    }
    
    // Handle policies breached (can be complex)
    if (mapping.policiesBreached && this.getNestedProperty(raw, mapping.policiesBreached)) {
      let breaches = this.getNestedProperty(raw, mapping.policiesBreached);
      
      // Transform to our expected format depending on what we received
      if (typeof breaches === 'object' && breaches !== null) {
        // Object is already in the right format
        activity.policiesBreached = breaches;
      } else if (Array.isArray(breaches)) {
        // Convert array of breach names to object format
        const breachObject: Record<string, boolean> = {};
        breaches.forEach(breach => {
          if (typeof breach === 'string') {
            breachObject[breach] = true;
          }
        });
        activity.policiesBreached = breachObject;
      } else if (typeof breaches === 'string') {
        // Try to parse JSON first
        try {
          activity.policiesBreached = JSON.parse(breaches);
        } catch (e) {
          // If not JSON, try comma-separated list
          if (breaches.includes(',')) {
            const breachArray = breaches.split(',').map(b => b.trim());
            const breachObject: Record<string, boolean> = {};
            breachArray.forEach(breach => {
              breachObject[breach] = true;
            });
            activity.policiesBreached = breachObject;
          } else {
            // Single breach
            activity.policiesBreached = { [breaches]: true };
          }
        }
      }
    }
    
    // Clean up any undefined/null values
    Object.keys(activity).forEach(key => {
      if (activity[key as keyof UserActivity] === undefined || activity[key as keyof UserActivity] === null) {
        delete activity[key as keyof UserActivity];
      }
    });
    
    return activity;
  }

  /**
   * Get a nested property from an object using a dot-notation path
   */
  private getNestedProperty(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    
    // Handle dot notation for nested paths
    if (path.includes('.')) {
      const parts = path.split('.');
      let current = obj;
      
      for (const part of parts) {
        if (current === null || current === undefined) return undefined;
        current = current[part];
      }
      
      return current;
    }
    
    // Simple property
    return obj[path];
  }

  /**
   * Automatically normalize a batch of activities into our application's format
   */
  normalizeActivities(rawActivities: any[]): UserActivity[] {
    if (!rawActivities || !Array.isArray(rawActivities) || rawActivities.length === 0) {
      return [];
    }
    
    try {
      // Detect schema from the first item
      const schemaFormat = this.detectSchemaFormat(rawActivities[0]);
      console.log(`Detected schema format: ${schemaFormat}`);
      
      // Convert all items using the same schema
      return rawActivities.map(item => this.convertToStandardFormat(item, schemaFormat));
    } catch (error) {
      console.error('Error normalizing activities:', error);
      
      // Fallback: try to convert each item individually
      console.log('Attempting individual conversion as fallback');
      const normalized: UserActivity[] = [];
      
      for (const item of rawActivities) {
        try {
          normalized.push(this.convertToStandardFormat(item));
        } catch (itemError) {
          console.warn('Failed to normalize item:', itemError);
          // Skip this item
        }
      }
      
      return normalized;
    }
  }

  /**
   * Attempt to parse a string as various data formats (CSV, JSON, etc.)
   * and normalize to our application's structure
   */
  parseAndNormalizeData(data: string): UserActivity[] {
    try {
      // First try to parse as JSON
      try {
        const jsonData = JSON.parse(data);
        if (Array.isArray(jsonData)) {
          return this.normalizeActivities(jsonData);
        } else if (typeof jsonData === 'object') {
          // Check if it's an object with a data/items/records field
          const possibleArrayFields = ['data', 'items', 'records', 'activities', 'events', 'results'];
          for (const field of possibleArrayFields) {
            if (jsonData[field] && Array.isArray(jsonData[field])) {
              return this.normalizeActivities(jsonData[field]);
            }
          }
          // Single object, convert to array
          return this.normalizeActivities([jsonData]);
        }
      } catch (jsonError) {
        console.log('Data is not valid JSON, trying CSV format...');
      }
      
      // Try to parse as CSV
      if (data.includes(',') && data.includes('\n')) {
        const parsed = this.parseCSV(data);
        if (parsed.length > 0) {
          return this.normalizeActivities(parsed);
        }
      }
      
      // If all else fails, try to extract whatever we can
      console.warn('Could not recognize data format, attempting basic extraction');
      const extracted = this.extractDataFromText(data);
      if (extracted.length > 0) {
        return this.normalizeActivities(extracted);
      }
      
      console.error('Failed to parse data in any recognized format');
      return [];
    } catch (error) {
      console.error('Error parsing and normalizing data:', error);
      return [];
    }
  }

  /**
   * Parse CSV data into an array of objects
   */
  private parseCSV(csvData: string): any[] {
    // Split into lines
    const lines = csvData.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];
    
    // Get headers from first line
    const headers = lines[0].split(',').map(header => header.trim());
    
    // Convert each row into an object
    const results: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = this.parseCSVLine(line);
      
      // Skip if row is empty or has wrong number of columns
      if (values.length === 0) continue;
      
      const row: any = {};
      for (let j = 0; j < Math.min(headers.length, values.length); j++) {
        const value = values[j].trim();
        
        // Try to convert numeric and boolean values - store as appropriate types
        // instead of forcing to string
        if (value.toLowerCase() === 'true') {
          row[headers[j]] = true;
        } else if (value.toLowerCase() === 'false') {
          row[headers[j]] = false;
        } else if (!isNaN(Number(value)) && value !== '') {
          row[headers[j]] = Number(value);
        } else {
          row[headers[j]] = value;
        }
      }
      
      results.push(row);
    }
    
    return results;
  }

  /**
   * Parse a CSV line handling quoted values correctly
   */
  private parseCSVLine(line: string): string[] {
    if (!line) return [];
    
    const values: string[] = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        // Toggle quote status
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        // End of value
        values.push(currentValue);
        currentValue = '';
      } else {
        // Add character to current value
        currentValue += char;
      }
    }
    
    // Add the last value
    values.push(currentValue);
    
    // Clean up values - trim and remove enclosing quotes
    return values.map(value => {
      value = value.trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        return value.substring(1, value.length - 1);
      }
      return value;
    });
  }

  /**
   * Last resort function to try to extract activity data from unstructured text
   */
  private extractDataFromText(text: string): any[] {
    const activities: any[] = [];
    
    // Try to find patterns that look like data
    const userPattern = /user[:\s]+([^\s,;]+)/gi;
    const timePattern = /time[:\s]+([^\s,;]+)/gi;
    const datePattern = /date[:\s]+([^\s,;]+)/gi;
    const riskPattern = /(risk|score)[:\s]+([0-9.]+)/gi;
    const servicePattern = /(service|integration|app)[:\s]+([^\s,;]+)/gi;
    
    // Extract all matches
    let currentActivity: any = {};
    let foundAny = false;
    
    // Match user
    let userMatch = userPattern.exec(text);
    if (userMatch) {
      currentActivity.username = userMatch[1];
      foundAny = true;
    }
    
    // Match time
    let timeMatch = timePattern.exec(text);
    if (timeMatch) {
      currentActivity.timestamp = timeMatch[1];
      foundAny = true;
    }
    
    // Match date
    let dateMatch = datePattern.exec(text);
    if (dateMatch) {
      currentActivity.date = dateMatch[1];
      foundAny = true;
    }
    
    // Match risk
    let riskMatch = riskPattern.exec(text);
    if (riskMatch) {
      currentActivity.riskScore = parseFloat(riskMatch[2]);
      foundAny = true;
    }
    
    // Match service
    let serviceMatch = servicePattern.exec(text);
    if (serviceMatch) {
      currentActivity.integration = serviceMatch[2];
      foundAny = true;
    }
    
    if (foundAny) {
      activities.push(currentActivity);
    }
    
    return activities;
  }

  /**
   * Check if an object conforms to our UserActivity interface
   */
  validateActivity(activity: any): boolean {
    if (!activity || typeof activity !== 'object') return false;
    
    // Check required fields
    const requiredFields = ['id', 'username', 'timestamp', 'riskScore', 'integration'];
    for (const field of requiredFields) {
      if (!(field in activity)) return false;
    }
    
    // Validate types
    if (typeof activity.riskScore !== 'number') return false;
    
    return true;
  }

  /**
   * Sanitize and clean an activity to ensure it meets our requirements
   */
  sanitizeActivity(activity: any): UserActivity {
    const sanitized: UserActivity = {
      id: String(activity.id || `generated_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`),
      username: String(activity.username || 'unknown'),
      timestamp: activity.timestamp || new Date().toISOString(),
      riskScore: typeof activity.riskScore === 'number' ? activity.riskScore : 0,
      integration: String(activity.integration || 'unknown'),
      values: {},
      policiesBreached: {}
    };
    
    // Ensure values is an object
    if (activity.values && typeof activity.values === 'object') {
      sanitized.values = activity.values;
    }
    
    // Ensure policiesBreached is an object
    if (activity.policiesBreached) {
      if (typeof activity.policiesBreached === 'object') {
        sanitized.policiesBreached = activity.policiesBreached;
      } else if (typeof activity.policiesBreached === 'string') {
        try {
          sanitized.policiesBreached = JSON.parse(activity.policiesBreached);
        } catch (e) {
          sanitized.policiesBreached = { [activity.policiesBreached]: true };
        }
      }
    }
    
    // Add optional fields if present
    if (activity.date) sanitized.date = String(activity.date);
    if (activity.activityType) sanitized.activityType = String(activity.activityType);
    if (activity.department) sanitized.department = String(activity.department);
    if (activity.location) sanitized.location = String(activity.location);
    if (activity.status) sanitized.status = String(activity.status);
    
    return sanitized;
  }
}

// Export a singleton instance for convenience
const schemaAdapter = new SchemaAdapter();
export default schemaAdapter; 