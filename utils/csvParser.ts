import Papa from 'papaparse';
import { UserActivity } from '../types/activity';

/**
 * Check if code is running in browser
 */
const isBrowser = () => typeof window !== 'undefined';

/**
 * Optimized CSV parser for large files (up to 10MB)
 * Uses chunked processing to prevent UI freezing
 */
export async function parseCSV(fileOrText: File | string, formatOptions?: any): Promise<UserActivity[]> {
  // Skip if not in browser
  if (!isBrowser()) {
    console.warn('CSV parsing can only run in browser');
    return [];
  }

  // Handle text input instead of file
  if (typeof fileOrText === 'string') {
    return parseCSVFromText(fileOrText, formatOptions);
  }

  const file = fileOrText;
  return new Promise((resolve, reject) => {
    try {
      console.log(`Starting optimized chunked parsing of ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      
      // For very large files, use a smaller chunk size to avoid memory issues
      const isLargeFile = file.size > 5 * 1024 * 1024; // > 5MB
      const chunkSize = isLargeFile ? 256 * 1024 : 1024 * 1024; // 256KB for large files, 1MB otherwise
      
      console.log(`Using chunk size: ${chunkSize / 1024}KB (${isLargeFile ? 'large file mode' : 'standard mode'})`);
      
      // Configure chunked parsing for better performance with large files
      const config = {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        delimiter: formatOptions?.delimiter || ',',
        
        // Process in chunks to avoid freezing UI
        chunkSize: chunkSize,
        
        chunk: (results: Papa.ParseResult<any>, parser: Papa.Parser) => {
          console.log(`Parsed chunk with ${results.data.length} rows`);
          
          // For very large files, immediately process each chunk to reduce memory usage
          if (isLargeFile && results.data.length > 0) {
            try {
              // Log headers from the first chunk
              if (!('_processedFirstChunk' in parser)) {
                console.log('CSV Headers:', Object.keys(results.data[0]));
                console.log('First row sample:', results.data[0]);
                (parser as any)._processedFirstChunk = true;
              }
            } catch (e) {
              console.warn('Error examining chunk data:', e);
            }
          }
        },
        
        // When complete, process all the data
        complete: (results: Papa.ParseResult<any>) => {
          console.log(`CSV parsing complete. ${results?.data ? `Parsing ${results.data.length} rows` : 'No valid data found'}`);
          
          try {
            // Validate and process the parsed data
            if (!results || !results.data || !Array.isArray(results.data) || results.data.length === 0) {
              throw new Error('No valid data found in the CSV file');
            }
            
            // Log first few records to debug format
            if (results.data.length > 0) {
              console.log('CSV first row sample:', results.data[0]);
              console.log('CSV column headers:', Object.keys(results.data[0]));
              
              // Check specifically for user, date, time fields
              const sampleRow = results.data[0];
              console.log('User field present:', 'user' in sampleRow);
              console.log('Date field present:', 'date' in sampleRow);
              console.log('Time field present:', 'time' in sampleRow);
            }
            
            const activities = processResults(results.data);
            console.log(`Successfully processed ${activities.length} activities`);
            resolve(activities);
          } catch (processingError) {
            console.error('Error processing parsed data:', processingError);
            reject(processingError);
          }
        },
        
        // Handle errors
        error: (error: any) => {
          console.error('CSV parsing error:', error);
          reject(error);
        }
      };
      
      // Start parsing with the optimized configuration
      Papa.parse(file, config);
      
    } catch (error) {
      console.error('Error initializing CSV parser:', error);
      
      // Fall back to simplified parser if Papa parse fails
      try {
        console.log('Falling back to simplified CSV parser');
        simplifiedParseCSV(file).then(resolve).catch(reject);
      } catch (fallbackError) {
        reject(fallbackError);
      }
    }
  });
}

/**
 * Parse CSV data from a text string
 */
async function parseCSVFromText(text: string, formatOptions?: any): Promise<UserActivity[]> {
  return new Promise((resolve, reject) => {
    try {
      console.log(`Parsing CSV from text (${text.length} characters)`);
      
      // Configure parsing options
      const config = {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        
        // Apply custom format options if provided
        delimiter: formatOptions?.delimiter || ',',
        
        // When complete, process all the data
        complete: (results: Papa.ParseResult<any>) => {
          console.log(`CSV text parsing complete. ${results?.data ? `Parsing ${results.data.length} rows` : 'No valid data found'}`);
          
          try {
            // Validate and process the parsed data
            if (!results || !results.data || !Array.isArray(results.data) || results.data.length === 0) {
              throw new Error('No valid data found in the CSV text');
            }
            
            const activities = processResults(results.data);
            console.log(`Successfully processed ${activities.length} activities from text`);
            resolve(activities);
          } catch (processingError) {
            console.error('Error processing parsed text data:', processingError);
            reject(processingError);
          }
        }
      };
      
      // Start parsing the text
      Papa.parse(text, config);
      
    } catch (error) {
      console.error('Error parsing CSV text:', error);
      reject(error);
    }
  });
}

/**
 * Simplified CSV parser as fallback
 * More memory efficient for large files
 */
export async function simplifiedParseCSV(file: File): Promise<UserActivity[]> {
  return new Promise((resolve, reject) => {
    // Create a streaming file reader
    const reader = new FileReader();
    const activities: any[] = [];
    const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
    let offset = 0;
    let lineBuffer = '';
    let headerLine = '';
    let headers: string[] = [];
    
    // Process a chunk of file data
    const processChunk = (chunk: string) => {
      const lines = (lineBuffer + chunk).split('\n');
      lineBuffer = lines.pop() || ''; // Keep the last incomplete line for the next chunk
      
      if (!headerLine && lines.length > 0) {
        // Extract header from the first line
        headerLine = lines.shift() || '';
        headers = headerLine.split(',').map(h => h.trim());
      }
      
      // Process each line
      for (const line of lines) {
        if (!line.trim()) continue; // Skip empty lines
        
        // Parse the CSV line safely
        const values = parseCSVLine(line);
        if (values.length === 0) continue;
        
        // Create object from header and values
        const activity: Record<string, any> = {};
        headers.forEach((key, index) => {
          if (index < values.length) {
            activity[key] = values[index];
          }
        });
        
        activities.push(activity);
        
        // Log progress for every 1000 rows
        if (activities.length % 1000 === 0) {
          console.log(`Processed ${activities.length} rows...`);
        }
      }
    };
    
    // Parse CSV line respecting quotes
    const parseCSVLine = (line: string): string[] => {
      if (!line || typeof line !== 'string') {
        return [];
      }
      
      const values: string[] = [];
      let inQuotes = false;
      let currentValue = '';
      
      try {
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(currentValue.trim());
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        
        // Add the last value
        values.push(currentValue.trim());
        
        // Clean up quotes
        return values.map(value => {
          if (value.startsWith('"') && value.endsWith('"')) {
            return value.substring(1, value.length - 1);
          }
          return value;
        });
      } catch (error) {
        console.warn('Error parsing CSV line:', error, line);
        return [];
      }
    };
    
    // Read the file in chunks
    const readNextChunk = () => {
      if (offset >= file.size) {
        // We've reached the end of the file
        // Process any remaining data in the buffer
        if (lineBuffer.trim()) {
          const values = parseCSVLine(lineBuffer);
          if (values.length > 0) {
            const activity: Record<string, any> = {};
            headers.forEach((key, index) => {
              if (index < values.length) {
                activity[key] = values[index];
              }
            });
            activities.push(activity);
          }
        }
        
        // Process all activities
        try {
          const result = processResults(activities);
          console.log(`Completed parsing with ${result.length} activities`);
          resolve(result);
        } catch (error) {
          reject(error);
        }
        return;
      }
      
      // Read the next chunk
      const slice = file.slice(offset, offset + CHUNK_SIZE);
      reader.readAsText(slice);
      offset += CHUNK_SIZE;
    };
    
    // Handle chunk loaded event
    reader.onload = (e) => {
      if (e.target?.result) {
        const chunk = e.target.result as string;
        processChunk(chunk);
        
        // Schedule the next chunk read
        // Use setTimeout to give the UI thread a chance to update
        setTimeout(readNextChunk, 0);
      }
    };
    
    reader.onerror = (e) => {
      reject(new Error('Error reading file: ' + e));
    };
    
    // Start reading the first chunk
    readNextChunk();
  });
}

/**
 * Processes the parsed CSV data into UserActivity objects
 */
function processResults(results: any[]): UserActivity[] {
  console.log(`Processing ${results.length} CSV rows`);
  
  // Skip empty results
  if (!results || results.length === 0) {
    console.warn('No CSV data to process');
    return [];
  }
  
  try {
    // First, detect field names in the CSV (case-insensitive)
    const firstRow = results[0];
    const headers = Object.keys(firstRow);
    console.log('CSV headers found:', headers);
    
    // Map expected field names to actual field names in the CSV
    const fieldMapping: Record<string, string> = {};
    
    // Find field for user
    const userField = headers.find(h => 
      h.toLowerCase() === 'user' || 
      h.toLowerCase() === 'email' || 
      h.toLowerCase() === 'username' ||
      h.toLowerCase() === 'userid'
    );
    if (userField) {
      fieldMapping.user = userField;
      console.log(`Found user field: ${userField}`);
    } else {
      console.warn('No user field found in CSV');
    }
    
    // Find field for date
    const dateField = headers.find(h => 
      h.toLowerCase() === 'date' || 
      h.toLowerCase().includes('date')
    );
    if (dateField) {
      fieldMapping.date = dateField;
      console.log(`Found date field: ${dateField}`);
    } else {
      console.warn('No date field found in CSV');
    }
    
    // Find field for time
    const timeField = headers.find(h => 
      h.toLowerCase() === 'time' || 
      h.toLowerCase().includes('time')
    );
    if (timeField) {
      fieldMapping.time = timeField;
      console.log(`Found time field: ${timeField}`);
    } else {
      console.warn('No time field found in CSV');
    }
    
    // Find field for risk score
    const riskScoreField = headers.find(h => 
      h.toLowerCase() === 'riskscore' || 
      h.toLowerCase().includes('risk') || 
      h.toLowerCase().includes('score')
    );
    if (riskScoreField) {
      fieldMapping.riskScore = riskScoreField;
      console.log(`Found risk score field: ${riskScoreField}`);
    }
    
    // Find field for integration
    const integrationField = headers.find(h => 
      h.toLowerCase() === 'integration' || 
      h.toLowerCase().includes('source') ||
      h.toLowerCase().includes('platform')
    );
    if (integrationField) {
      fieldMapping.integration = integrationField;
      console.log(`Found integration field: ${integrationField}`);
    }
    
    // Find field for policies breached
    const policiesBreachedField = headers.find(h => 
      h.toLowerCase() === 'policiesbreached' || 
      h.toLowerCase() === 'policies breached' ||
      h.toLowerCase() === 'policies_breached' ||
      h.toLowerCase().includes('policies') ||
      h.toLowerCase().includes('breach') ||
      h.toLowerCase().includes('violation') ||
      h.toLowerCase().includes('policy')
    );
    if (policiesBreachedField) {
      fieldMapping.policiesBreached = policiesBreachedField;
      console.log(`Found policies breached field: ${policiesBreachedField}`);
    } else {
      console.warn('No policies breached field found in CSV. Available headers:', headers);
    }
    
    // Process each row with the detected field mapping
    return results.map((row, index) => {
      try {
        // Get user from mapped field or fallback to looking through all fields
        let user = fieldMapping.user ? row[fieldMapping.user] : null;
        if (!user) {
          // As fallback, find first field that looks like an email
          const emailField = Object.keys(row).find(key => 
            typeof row[key] === 'string' && 
            row[key].includes('@')
          );
          if (emailField) user = row[emailField];
        }
        
        // Get date and time from mapped fields
        const date = fieldMapping.date ? row[fieldMapping.date] : '';
        let time = fieldMapping.time ? row[fieldMapping.time] : '';
        
        // Format time for display - add a default time if missing
        if (!time || time === '') {
          time = '09:00'; // Default time if none provided
        }
        
        // Get risk score if present
        const riskScoreRaw = fieldMapping.riskScore ? row[fieldMapping.riskScore] : 0;
        let riskScore = 0;
        if (typeof riskScoreRaw === 'number') {
          riskScore = riskScoreRaw;
        } else if (typeof riskScoreRaw === 'string') {
          const parsed = parseInt(riskScoreRaw, 10);
          if (!isNaN(parsed)) {
            riskScore = parsed;
          }
        }
        
        // Get integration field
        let integration = fieldMapping.integration ? row[fieldMapping.integration] : 'unknown';
        
        // Normalize integration (remove 'si-' prefix if present)
        if (integration && typeof integration === 'string' && integration.startsWith('si-')) {
          integration = integration.substring(3);
        }
        
        // Try to extract hour from time if it exists
        let hour = -1;
        if (time) {
          // Handle different time formats
          const timeMatch = /(\d{1,2})[:h]/i.exec(time);
          if (timeMatch && timeMatch[1]) {
            hour = parseInt(timeMatch[1], 10);
          }
        }
        
        // Generate timestamp if possible
        let timestamp = '';
        if (date && time) {
          try {
            // Try to standardize date format
            let isoDate = date;
            console.log(`Processing date: ${date}, time: ${time} for row ${index}`);
            
            // Handle DD/MM/YYYY format (like "13/01/2025")
            if (typeof date === 'string' && date.includes('/')) {
              const parts = date.split('/');
              if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10);
                const year = parseInt(parts[2], 10);
                
                // Validate the date parts
                if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1000) {
                  if (day > 12) {
                    // Definitely DD/MM/YYYY format
                    isoDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                    console.log(`Converted DD/MM/YYYY: ${date} -> ${isoDate}`);
                  } else if (month > 12) {
                    // MM/DD/YYYY format
                    isoDate = `${year}-${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}`;
                    console.log(`Converted MM/DD/YYYY: ${date} -> ${isoDate}`);
                  } else {
                    // Ambiguous, assume DD/MM/YYYY (European format) based on CSV content
                    isoDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                    console.log(`Assumed DD/MM/YYYY: ${date} -> ${isoDate}`);
                  }
                } else {
                  console.warn(`Invalid date parts: day=${day}, month=${month}, year=${year}`);
                }
              }
            }
            
            // Handle DD-MM-YYYY format
            else if (typeof date === 'string' && date.includes('-') && date.length === 10) {
              const parts = date.split('-');
              if (parts.length === 3 && parts[0].length === 2) {
                // Assume DD-MM-YYYY format, convert to YYYY-MM-DD
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10);
                const year = parseInt(parts[2], 10);
                isoDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                console.log(`Converted DD-MM-YYYY: ${date} -> ${isoDate}`);
              }
            }
            // Handle YYYY-MM-DD format (already correct)
            else if (typeof date === 'string' && date.includes('-') && date.length === 10) {
              const parts = date.split('-');
              if (parts.length === 3 && parts[0].length === 4) {
                // Already in YYYY-MM-DD format
                isoDate = date;
                console.log(`Date already in ISO format: ${date}`);
              }
            }
            
            // Ensure time is in HH:MM format
            let formattedTime = time;
            if (typeof time === 'string') {
              if (time.includes('h')) {
                // Handle "9h30" format
                formattedTime = time.replace('h', ':');
              }
              // Ensure two-digit formatting
              const timeParts = formattedTime.split(':');
              if (timeParts.length >= 2) {
                formattedTime = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}`;
              }
              console.log(`Formatted time: ${time} -> ${formattedTime}`);
            }
            
            timestamp = `${isoDate}T${formattedTime}:00`;
            
            // Validate the generated timestamp
            const testDate = new Date(timestamp);
            if (isNaN(testDate.getTime())) {
              console.warn(`Invalid timestamp generated: ${timestamp} from date: ${date}, time: ${time}`);
              timestamp = '';
            } else {
              // Log successful timestamp generation for debugging
              if (index < 3) {
                console.log(`✓ Generated valid timestamp: ${timestamp} from date: ${date}, time: ${time}`);
              }
            }
          } catch (e) {
            console.warn(`Error generating timestamp from date: ${date}, time: ${time}`, e);
            timestamp = '';
          }
        }
        
        // If we couldn't generate a timestamp from date/time, try to use just the date
        if (!timestamp && date) {
          try {
            let isoDate = date;
            // Handle DD/MM/YYYY format
            if (typeof date === 'string' && date.includes('/')) {
              const parts = date.split('/');
              if (parts.length === 3) {
                // Support both DD/MM/YYYY and MM/DD/YYYY formats
                if (parseInt(parts[0]) > 12) {
                  // DD/MM/YYYY format
                  isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                } else if (parseInt(parts[1]) > 12) {
                  // MM/DD/YYYY format
                  isoDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
                } else {
                  // Ambiguous, assume DD/MM/YYYY (European format)
                  isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
              }
            }
            // Handle DD-MM-YYYY format
            else if (typeof date === 'string' && date.includes('-') && date.length === 10) {
              const parts = date.split('-');
              if (parts.length === 3 && parts[0].length === 2) {
                isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
              }
            }
            // Handle YYYY-MM-DD format (already correct)
            else if (typeof date === 'string' && date.includes('-') && date.length === 10) {
              const parts = date.split('-');
              if (parts.length === 3 && parts[0].length === 4) {
                isoDate = date;
              }
            }
            
            // Use default time of 09:00 if no time is provided
            timestamp = `${isoDate}T09:00:00`;
            
            // Validate the generated timestamp
            const testDate = new Date(timestamp);
            if (isNaN(testDate.getTime())) {
              console.warn(`Invalid timestamp generated from date only: ${timestamp} from date: ${date}`);
              timestamp = '';
            }
          } catch (e) {
            console.warn(`Error generating timestamp from date only: ${date}`, e);
            timestamp = '';
          }
        }
        
        // Handle policies breached field if present in CSV
        let policiesBreached: Record<string, any> = {};
        
        if (fieldMapping.policiesBreached && row[fieldMapping.policiesBreached]) {
          const policiesData = row[fieldMapping.policiesBreached];
          
          try {
            // Parse the JSON string from CSV
            if (typeof policiesData === 'string') {
              // Remove escaped quotes and parse
              const cleanedData = policiesData.replace(/\\"/g, '"').replace(/^"|"$/g, '');
              policiesBreached = JSON.parse(cleanedData);
              if (index < 3) {
                console.log(`Successfully parsed policies from CSV for row ${index}:`, policiesBreached);
              }
            } else if (typeof policiesData === 'object') {
              policiesBreached = policiesData;
              if (index < 3) {
                console.log(`Used object policies from CSV for row ${index}:`, policiesBreached);
              }
            }
          } catch (parseError) {
            console.warn(`Error parsing policies breached for row ${index}:`, parseError);
            console.log(`Raw policies data:`, policiesData);
            // Fallback to empty object
            policiesBreached = {};
          }
        } else {
          if (index < 3) {
            console.log(`No policies field found for row ${index}. Field mapping:`, fieldMapping);
            console.log(`Available row keys:`, Object.keys(row));
          }
        }
        
        // If no policies found in CSV, generate basic synthetic policies based on risk score
        if (Object.keys(policiesBreached).length === 0) {
          if (riskScore > 2000) {
            policiesBreached['Data Security'] = true;
            policiesBreached['Unusual Activity'] = true;
            policiesBreached['Access Violation'] = true;
            policiesBreached['Critical Violations'] = ['Unauthorized Access', 'Data Exfiltration Attempt'];
          } else if (riskScore > 1600) {
            policiesBreached['Data Security'] = true;
            policiesBreached['Unusual Activity'] = true;
            policiesBreached['Access Violation'] = true;
          } else if (riskScore > 1200) {
            policiesBreached['Data Security'] = true;
            policiesBreached['Unusual Activity'] = true;
          } else if (riskScore > 800) {
            policiesBreached['Unusual Activity'] = true;
          } else if (riskScore > 500) {
            policiesBreached['Low Risk Alert'] = true;
          } else {
            // Even for low risk scores, add at least one breach for visibility testing
            policiesBreached['Monitoring'] = true;
          }
        }
        
        // Debug logging for first few rows
        if (index < 5) {
          console.log(`Row ${index} processed:`, {
            user,
            date,
            time,
            hour,
            integration,
            riskScore,
            policiesBreached
          });
        }
        
        return {
          id: index.toString(),
          user: user || 'unknown',
          username: user || 'unknown', // Duplicate to username for compatibility
          userId: user || 'unknown',   // Duplicate to userId for compatibility
          date: date || '',
          time: time || '',
          hour: hour >= 0 ? hour : null,
          timestamp: timestamp || `${new Date().toISOString().split('T')[0]}T09:00:00.000Z`, // Use today's date with default time if no timestamp could be generated
          integration: integration || 'unknown',
          riskScore: riskScore,
          activityType: row.activityType || row.activity || row.type || '',
          description: row.description || row.desc || row.details || '',
          duration: row.duration || row.length || 0,
          status: row.status || 'underReview',
          policiesBreached: policiesBreached,
          values: {}
        };
      } catch (rowError: any) {
        console.warn(`Error processing row ${index}:`, rowError);
        return {
          id: index.toString(),
          user: 'error',
          username: 'error', 
          userId: 'error',
          date: '',
          time: '',
          hour: null,
          timestamp: `${new Date().toISOString().split('T')[0]}T09:00:00.000Z`, // Use today's date with default time for error cases
          integration: 'unknown',
          riskScore: 0,
          activityType: 'error',
          description: `Error processing: ${rowError.message}`,
          duration: 0,
          status: 'error',
          policiesBreached: {},
          values: {}
        };
      }
    });
  } catch (error: any) {
    console.error('Error processing CSV results:', error);
    return [];
  }
} 