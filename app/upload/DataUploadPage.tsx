"use client";

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { UploadFile, Check } from '@mui/icons-material';
import { useActivityContext } from '../../src/contexts/ActivityContext';
import { Button, Typography, Box, Container, Paper, Alert, CircularProgress } from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import Link from 'next/link';
import { parseCSV } from '../../utils';
import { storeActivitiesInIndexedDB } from '../../utils';
import { UserActivity } from '../../types/activity';

/**
 * Component for uploading and processing CSV data
 */
export default function DataUploadPage() {
  const router = useRouter();
  const { refreshActivities } = useActivityContext();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [activityCount, setActivityCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [processingState, setProcessingState] = useState('');
  const [rawData, setRawData] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [uploadedActivities, setUploadedActivities] = useState<UserActivity[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [statistics, setStatistics] = useState<any | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [delimiter, setDelimiter] = useState<string>(',');
  const [autoDetectColumns, setAutoDetectColumns] = useState<boolean>(true);
  const [customColumns, setCustomColumns] = useState<string[]>([]);
  const [dateFormat, setDateFormat] = useState<string>('YYYY-MM-DD');

  /**
   * Handle file input change
   */
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setActivities([]);
    setStatistics(null);
    setProgress(0);
    setIsLoading(true);
    setError(null);
    setUploadSuccess(false);
    
    const files = event.target.files;
    if (!files || files.length === 0) {
      setError('No file selected');
      setIsLoading(false);
      return;
    }

    try {
      console.log('Starting file processing...');
      
      const formatOptions = {
        autoDetect: autoDetectColumns,
        delimiter: delimiter || ',',
        columns: customColumns,
        dateFormat: dateFormat || 'YYYY-MM-DD',
      };
      
      // Use the schema adapter for more robust parsing
      const { SchemaAdapter } = await import('../../utils/schemaAdapter');
      const schemaAdapter = new SchemaAdapter();
      
      // Create a new adaptive config for optimal settings
      const { AdaptiveConfig } = await import('../../utils/adaptiveConfig');
      const config = new AdaptiveConfig();
      // Initialize config (instead of directly calling private method)
      await config.initialize();
      
      // Use IndexedDB as main storage method 
      const { storeActivitiesInIndexedDB, getActivitiesFromIndexedDB } = await import('../../utils/storage');
      
      // Set a reasonable progress update interval
      const totalFiles = files.length;
      let filesProcessed = 0;
      
      // Track total activities for statistics
      let totalActivities = 0;
      let allActivities: UserActivity[] = [];
      
      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Update progress
        setProgress((filesProcessed / totalFiles) * 30); // First 30% is file reading
        setStatus(`Reading file ${i + 1} of ${totalFiles}: ${file.name}`);
        
        try {
          const text = await readFileAsText(file);
          
          // Parse CSV data with the schema adapter for more robust parsing
          setStatus(`Processing data from ${file.name}...`);
          
          // Use the csvParser utility for faster processing
          const { parseCSV } = await import('../../utils/csvParser');
          const parsedActivities = await parseCSV(text, formatOptions);
          
          // Use schema adapter to normalize the data format
          setStatus(`Normalizing data format...`);
          
          // Make sure we have valid data before continuing
          if (!parsedActivities || !Array.isArray(parsedActivities) || parsedActivities.length === 0) {
            throw new Error('No valid activities found in file');
          }
          
          const schemaFormat = schemaAdapter.detectSchemaFormat(parsedActivities[0]);
          console.log(`Detected schema format: ${schemaFormat}`);
          
          // Process in smaller chunks for better UI responsiveness
          setStatus(`Normalizing ${parsedActivities.length} activities...`);
          
          // Use adaptive chunk size based on device capabilities
          const chunkSize = Number(config.get('chunkSize')) || 500; // Convert to number
          console.log(`Using chunk size: ${chunkSize} for processing`);
          
          const chunks = Math.ceil(parsedActivities.length / chunkSize);
          const normalizedActivities: UserActivity[] = [];
          
          for (let j = 0; j < parsedActivities.length; j += chunkSize) {
            const chunk = parsedActivities.slice(j, j + chunkSize);
            const normalizedChunk = schemaAdapter.normalizeActivities(chunk);
            normalizedActivities.push(...normalizedChunk);
            
            // Update progress within file processing
            const fileProgress = 30 + (30 * (filesProcessed / totalFiles)) + 
                               (30 * (j / parsedActivities.length) / totalFiles);
            setProgress(fileProgress);
            
            // Allow UI to update
            await new Promise(resolve => setTimeout(resolve, 0));
          }
          
          // Apply essential fields for compatibility
          const processedActivities = normalizedActivities.map((activity, index) => ({
            ...activity,
            id: activity.id || `${Date.now()}-${index}`,
            riskScore: activity.riskScore || 0
          }));
          
          allActivities = [...allActivities, ...processedActivities];
          totalActivities += processedActivities.length;
          filesProcessed++;
          
          // Update progress
          setProgress(30 + (60 * (filesProcessed / totalFiles)));
          setStatus(`Processed ${processedActivities.length} activities from ${file.name}`);
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError);
          setError(`Error processing file ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
        }
      }
      
      // Store all activities in IndexedDB
      if (allActivities.length > 0) {
        setStatus(`Storing ${allActivities.length} activities in database...`);
        console.log(`Storing ${allActivities.length} activities in IndexedDB`);
        
        try {
          const storageSuccess = await storeActivitiesInIndexedDB(allActivities);
          if (storageSuccess) {
            console.log('Successfully stored activities in IndexedDB');
          } else {
            // Try to store in localStorage if IndexedDB fails and the dataset is small enough
            if (allActivities.length <= 1000) {
              console.log('Falling back to localStorage due to IndexedDB failure');
              localStorage.setItem('activities', JSON.stringify(allActivities));
              console.log('Stored activities in localStorage');
            } else {
              console.warn('Dataset too large for localStorage. Only IndexedDB data will be available.');
            }
          }
        } catch (storageError) {
          console.error('Error storing activities:', storageError);
          // Try localStorage as a fallback for small datasets
          if (allActivities.length <= 1000) {
            try {
              localStorage.setItem('activities', JSON.stringify(allActivities));
              console.log('Stored activities in localStorage as fallback');
            } catch (lsError) {
              console.error('Failed to store in localStorage:', lsError);
            }
          }
        }
        
        // Calculate statistics
        setStatus('Calculating statistics...');
        try {
          const { calculateStatistics } = await import('../../utils/dataProcessor');
          const stats = await calculateStatistics(allActivities);
          setStatistics(stats);
          console.log('Statistics calculated successfully:', stats);
        } catch (statsError) {
          console.error('Error calculating statistics:', statsError);
        }
        
        // Update UI
        setActivities(allActivities.slice(0, 100)); // Show first 100 for preview
        setUploadSuccess(true);
        setProgress(100);
        setStatus(`Successfully processed ${totalActivities} activities from ${filesProcessed} files`);
      } else {
        setError('No valid activities found in the uploaded files');
      }
    } catch (error) {
      console.error('Error processing files:', error);
      setError(`Error processing files: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setUploadSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Read a file directly as text without using File APIs
   */
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsText(file);
    });
  };
  
  /**
   * Parse CSV file directly with custom logic for maximum compatibility
   */
  const parseCSVDirectly = async (file: File): Promise<any[]> => {
    const text = await readFileAsText(file);
    
    // Split by lines and filter out empty lines
    let lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }
    
    console.log(`CSV has ${lines.length} lines`);
    
    // Try to detect if we have a header row
    let headerRow = lines[0];
    let dataStartIndex = 1;
    
    // If first row doesn't look like a header (contains mostly numeric values),
    // we may need to look for headers elsewhere or generate our own
    const firstRowCells = parseCSVLine(headerRow);
    const nonNumericCells = firstRowCells.filter(cell => 
      isNaN(Number(cell)) && cell.toLowerCase() !== 'true' && cell.toLowerCase() !== 'false'
    );
    
    const hasHeaderRow = nonNumericCells.length > firstRowCells.length / 2;
    
    if (!hasHeaderRow) {
      console.log('No header row detected, generating generic headers');
      // Generate generic headers
      headerRow = firstRowCells.map((_, i) => `column${i}`).join(',');
      dataStartIndex = 0;
    }
    
    // Parse the header to get column names
    const headers = parseCSVLine(headerRow);
    
    // Parse each data row
    const data = [];
    
    for (let i = dataStartIndex; i < lines.length; i++) {
      try {
        const line = lines[i];
        if (!line.trim()) continue;
        
        const values = parseCSVLine(line);
        
        // Create object from values
        const row: Record<string, any> = { id: `row_${i}` };
        
        // Map values to headers - handle case where we have fewer/more values than headers
        headers.forEach((header, j) => {
          if (j < values.length) {
            // Try to parse as a number if possible
            const value = values[j];
            if (value === '') {
              row[header] = null;
            } else if (!isNaN(Number(value))) {
              row[header] = Number(value);
            } else if (value.toLowerCase() === 'true') {
              row[header] = true;
            } else if (value.toLowerCase() === 'false') {
              row[header] = false;
            } else if (value.startsWith('{') && value.endsWith('}')) {
              // Try parsing as JSON
              try {
                row[header] = JSON.parse(value);
              } catch {
                row[header] = value;
              }
            } else {
              row[header] = value;
            }
          }
        });
        
        // Add missing fields we need for the UserActivity type
        if (!row.username && (row.user || row.userId)) {
          row.username = row.user || row.userId;
        }
        
        if (!row.userId && (row.user || row.username)) {
          row.userId = row.user || row.username;
        }
        
        if (!row.timestamp && (row.date || row.time)) {
          // Try to create a timestamp from date/time
          try {
            let dateStr = row.date;
            let timeStr = row.time || '00:00';
            
            // Handle different date formats
            if (dateStr && typeof dateStr === 'string' && dateStr.includes('/')) {
              // Try to parse date in format DD/MM/YYYY
              const parts = dateStr.split('/');
              if (parts.length === 3) {
                // Convert to YYYY-MM-DD format for Date constructor
                dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              }
            }
            
            if (dateStr) {
              try {
                row.timestamp = new Date(`${dateStr}T${timeStr}`).toISOString();
              } catch {
                // Fallback to current date
                row.timestamp = new Date().toISOString();
              }
            }
          } catch (e) {
            console.warn('Error parsing date:', e);
          }
        }
        
        if (!row.riskScore && row.risk) {
          // Use risk field if available
          row.riskScore = typeof row.risk === 'number' ? row.risk : parseInt(row.risk) || 0;
        }
        
        data.push(row);
      } catch (e) {
        console.warn(`Error parsing line ${i}:`, e);
      }
    }
    
    // Convert special JSON fields
    data.forEach(row => {
      // Handle policiesBreached
      if (row.policiesBreached && typeof row.policiesBreached === 'string') {
        try {
          row.policiesBreached = JSON.parse(row.policiesBreached);
        } catch (e) {
          row.policiesBreached = {};
        }
      }
      
      // Handle values
      if (row.values && typeof row.values === 'string') {
        try {
          row.values = JSON.parse(row.values);
        } catch (e) {
          row.values = {};
        }
      }
    });
    
    return data;
  };
  
  /**
   * Parse a CSV line with proper handling of quoted values
   */
  const parseCSVLine = (line: string): string[] => {
    if (!line) return [];
    
    const values: string[] = [];
    let inQuotes = false;
    let currentValue = '';
    
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
  };

  /**
   * Process CSV data for analytics
   */
  const processForAnalytics = async () => {
    if (selectedFile) {
      try {
        setIsLoading(true);
        setError(null);
        
        // Call API to process the data
        const response = await fetch('/api/activities', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ activities: selectedFile }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to process activity data');
        }
        
        // Refresh activities context for live badge update
        await refreshActivities();
        // Navigate to the alerts page to see the processed data
        router.push('/alerts');
      } catch (error) {
        console.error('Error processing data:', error);
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    } else {
      setError("No file selected. Please upload a CSV file first.");
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * Process and store uploaded activity data
   * @param activities User activity data to be processed and stored
   */
  const processActivityData = async (activities: UserActivity[]) => {
    // Set processing status
    setProcessing(true);
    
    try {
      console.log(`Processing ${activities.length} activities...`);
      
      // Add risk scores and normalize data
      const processedActivities = activities.map((activity, index) => ({
        ...activity,
        id: activity.id || `activity_${index}`,
        riskScore: activity.riskScore || Math.floor(Math.random() * 1000), // Use existing or generate random score
        timestamp: activity.timestamp || new Date().toISOString(),
      }));
      
      // Set processing state
      setProcessingState(`Storing ${processedActivities.length} activities in browser storage...`);
      
      // 1. Store in IndexedDB
      await storeActivitiesInIndexedDB(processedActivities);
      console.log('Successfully stored activities in IndexedDB');
      
      // 2. Also store in localStorage as fallback (if small enough)
      if (processedActivities.length < 1000) {
        try {
          localStorage.setItem('activities', JSON.stringify(processedActivities));
          localStorage.setItem('hasStoredActivities', 'true');
          console.log('Successfully stored activities in localStorage as a fallback');
        } catch (storageError) {
          console.warn('Could not store in localStorage (likely too large):', storageError);
        }
      }
      
      // Clear input and update state
      setRawData('');
      setError('');
      setUploadSuccess(true);
      setUploadedActivities(processedActivities);
      
      // Show success message with count
      setSuccessMessage(`Successfully processed ${processedActivities.length} activities. Now you can view them in Dashboard or Alerts.`);
    } catch (error) {
      console.error('Error processing activity data:', error);
      setError('Failed to process activity data: ' + String(error));
    } finally {
      setProcessing(false);
    }
  };

  // When the user clicks "Process Data & View Alerts"
  const goToDashboard = async () => {
    try {
      // First check if we have data in IndexedDB
      const { getActivitiesFromIndexedDB } = await import('../../utils/storage');
      const activities = await getActivitiesFromIndexedDB();
      
      if (!activities || activities.length === 0) {
        // No data in IndexedDB, show warning
        setError('No data available. Please upload and process data first.');
        return;
      }
      
      // Navigate to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Error checking for data before navigation:', error);
      // Navigate anyway, dashboard will handle the error
      router.push('/dashboard');
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" color="primary" gutterBottom>
          Data Upload
        </Typography>

        <Paper sx={{ p: 4, mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Upload Activity Data CSV
          </Typography>

          <Typography variant="body1" paragraph>
            Upload a CSV file containing user activity data to analyze for policy breaches and security risks. The 
            CSV should include columns for user ID, timestamp, activity type, and potential policy breaches.
          </Typography>

          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3 }}
              action={
                <Button color="inherit" size="small" onClick={() => setError(null)}>
                  Dismiss
                </Button>
              }
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ErrorIcon sx={{ mr: 1 }} />
                <Typography>{error}</Typography>
              </Box>
            </Alert>
          )}

          {uploadSuccess ? (
            <Box>
              <Alert 
                severity="success" 
                sx={{ mb: 3 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon sx={{ mr: 1 }} />
                  <Typography>
                    {successMessage}
                  </Typography>
                </Box>
              </Alert>

              <Box sx={{ mt: 3 }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  sx={{ mr: 2 }}
                  onClick={goToDashboard}
                >
                  Process Data & View Dashboard
                </Button>

                <Button 
                  variant="outlined"
                  onClick={handleButtonClick}
                >
                  Select Another
                </Button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <input
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              
              {isLoading ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CircularProgress />
                  <Typography sx={{ mt: 2 }}>Processing file...</Typography>
                </Box>
              ) : (
                <Button
                  variant="contained"
                  startIcon={<FileUploadIcon />}
                  onClick={handleButtonClick}
                  size="large"
                  sx={{ py: 1.5, px: 3 }}
                >
                  Upload File
                </Button>
              )}
              
              {selectedFile && !isLoading && !uploadSuccess && (
                <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                  Selected file: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                </Typography>
              )}
            </Box>
          )}
        </Paper>

        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>
            CSV Format Requirements
          </Typography>
          
          <Typography variant="body1" paragraph>
            Your CSV file should include the following columns:
          </Typography>
          
          <Box component="ul" sx={{ pl: 2 }}>
            <Box component="li" sx={{ mb: 1 }}>
              <Typography variant="body1">
                <strong>id</strong> - Unique identifier for the activity
              </Typography>
            </Box>
            <Box component="li" sx={{ mb: 1 }}>
              <Typography variant="body1">
                <strong>userId</strong> - User identifier
              </Typography>
            </Box>
            <Box component="li" sx={{ mb: 1 }}>
              <Typography variant="body1">
                <strong>username</strong> - Username or email
              </Typography>
            </Box>
            <Box component="li" sx={{ mb: 1 }}>
              <Typography variant="body1">
                <strong>timestamp</strong> - Date and time of activity
              </Typography>
            </Box>
            <Box component="li" sx={{ mb: 1 }}>
              <Typography variant="body1">
                <strong>integration</strong> - Source integration (email, cloud, usb, etc.)
              </Typography>
            </Box>
            <Box component="li" sx={{ mb: 1 }}>
              <Typography variant="body1">
                <strong>activity</strong> - Description of user activity
              </Typography>
            </Box>
            <Box component="li" sx={{ mb: 1 }}>
              <Typography variant="body1">
                <strong>status</strong> - Status of the activity (underReview, trusted, concern, etc.)
              </Typography>
            </Box>
            <Box component="li" sx={{ mb: 1 }}>
              <Typography variant="body1">
                <strong>riskScore</strong> - Numeric risk score
              </Typography>
            </Box>
            <Box component="li" sx={{ mb: 1 }}>
              <Typography variant="body1">
                <strong>policiesBreached</strong> - JSON object with policy breach information
              </Typography>
            </Box>
            <Box component="li">
              <Typography variant="body1">
                <strong>values</strong> - JSON object with additional activity values
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
