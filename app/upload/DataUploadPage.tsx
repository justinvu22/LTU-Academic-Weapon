"use client";

<<<<<<< HEAD
import React, { useState, useRef } from 'react';
=======
import React, { useState, useCallback } from 'react';
>>>>>>> 0481816de9b1c248174805c3fca29620f4a87b5c
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { UploadFile, Check } from '@mui/icons-material';
import { useActivityContext } from '../../src/contexts/ActivityContext';
<<<<<<< HEAD
import { Button, Typography, Box, Container, Paper, Alert, CircularProgress } from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import Link from 'next/link';
import { parseCSV } from '../../utils';
import { storeActivitiesInIndexedDB } from '../../utils';
import { UserActivity } from '../../types/activity';
=======
import { useDropzone } from 'react-dropzone';
>>>>>>> 0481816de9b1c248174805c3fca29620f4a87b5c

/**
 * Component for uploading and processing CSV data
 */
export default function DataUploadPage() {
  const router = useRouter();
  const { refreshActivities } = useActivityContext();
<<<<<<< HEAD
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
=======
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadStats, setUploadStats] = useState<{ rows: number } | null>(null);
  const [isUploadHovered, setIsUploadHovered] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setErrorMessage(null);
    
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      
      // Check file size (limit to 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setErrorMessage('File too large. Please upload a file smaller than 10MB.');
        return;
      }
      
      // Check file type
      if (!selectedFile.name.endsWith('.csv')) {
        setErrorMessage('Please upload a CSV file.');
        return;
      }
      
      setFile(selectedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    multiple: false
  });

  /**
   * Upload and parse the CSV file
   */
  const handleUpload = () => {
    if (!file) {
      setErrorMessage('Please select a file to upload.');
>>>>>>> 0481816de9b1c248174805c3fca29620f4a87b5c
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
<<<<<<< HEAD
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
=======
    <div className="min-h-screen bg-[#121324] px-6 py-10 font-['IBM_Plex_Sans',Inter,sans-serif] flex flex-col">
      <div className="w-full bg-[#121324] rounded-2xl border border-[#333] shadow-[0_2px_12px_rgba(110,95,254,0.10)] px-8 py-10 flex flex-col gap-8 mx-auto">
        <h1 className="text-[2rem] font-extrabold tracking-wide text-[#EEE] pl-4 border-l-4 border-[#6E5FFE] uppercase mb-8" style={{ fontFamily: "'IBM Plex Sans', Inter, sans-serif", letterSpacing: '0.04em', textShadow: '0 1px 8px #6E5FFE22' }}>Upload CSV</h1>

        {/* Upload Form Card */}
        <div className="bg-[#1F2030] border border-[#333] rounded-xl shadow-[0_2px_8px_rgba(110,95,254,0.08)] p-8 mb-10 animate-fadeIn transition-all duration-300 w-full overflow-hidden">
          <h2 className="text-xl font-extrabold text-[#EEE] uppercase tracking-wide mb-4">Upload Activity Data CSV</h2>
          <p className="text-gray-300 mb-6 leading-relaxed">Upload a CSV file containing user activity data to analyze for policy breaches and security risks. The CSV should include columns for user ID, timestamp, activity type, and potential policy breaches.</p>
          {errorMessage && (
            <div className="w-full mb-3 p-3 rounded-xl bg-red-500/10 text-red-400 text-center font-semibold shadow transition-all duration-300">
              {errorMessage}
            </div>
          )}
          
          {/* Drag and Drop Zone */}
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-xl p-8 mb-6 transition-all duration-300 cursor-pointer
              ${isDragActive 
                ? 'border-[#8B5CF6] bg-[#8B5CF6]/10' 
                : 'border-gray-600 hover:border-[#8B5CF6] hover:bg-[#8B5CF6]/5'
              }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center text-center">
              <UploadFile className={`w-12 h-12 mb-4 ${isDragActive ? 'text-[#8B5CF6]' : 'text-gray-400'}`} />
              <p className="text-lg font-medium text-white mb-2">
                {isDragActive ? 'Drop your CSV file here' : 'Drag & drop your CSV file here'}
              </p>
              <p className="text-sm text-gray-400">
                or click to browse files
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 w-full justify-center items-center">
            <div className="flex-1 w-full">
              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || isUploading || uploadComplete}
                className={`inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-semibold px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 w-full disabled:opacity-60 disabled:cursor-not-allowed`}
                aria-label="Upload File"
                onMouseEnter={() => setIsUploadHovered(true)}
                onMouseLeave={() => setIsUploadHovered(false)}
                style={{ transform: isUploadHovered ? 'scale(1.02)' : 'scale(1)' }}
              >
                {isUploading ? (
                  <>
                    <span className="animate-spin inline-block mr-2"><svg width="20" height="20" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="4" opacity="0.2"/><path d="M22 12c0-5.523-4.477-10-10-10" stroke="#fff" strokeWidth="4" strokeLinecap="round"/></svg></span>
                    Uploading...
                  </>
                ) : 'Upload File'}
              </button>
            </div>
          </div>
          {file && (
            <div className="mt-2 text-sm text-gray-300">Selected file: <span className="font-semibold text-white">{file.name}</span> ({(file.size / 1024).toFixed(2)} KB)</div>
          )}
          {uploadStats && (
            <div className="mt-2">
              <div className="w-full mb-3 p-3 rounded-xl bg-green-500/10 text-green-400 text-center font-semibold shadow transition-all duration-300 flex items-center justify-center gap-2">
                <Check />
                Successfully parsed {uploadStats.rows} rows of data. Ready to process.
              </div>
            </div>
          )}
        </div>

        {/* Process Data Card */}
        {uploadComplete && (
          <div className="bg-[#1F2030] border border-[#333] rounded-xl shadow-[0_2px_8px_rgba(110,95,254,0.08)] p-8 mb-10 animate-fadeIn transition-all duration-300 w-full">
            <h2 className="text-lg font-extrabold text-[#EEE] uppercase tracking-wide mb-4">Process Data</h2>
            <p className="text-gray-300 mb-6 leading-relaxed">Your data has been uploaded successfully. Click the button below to process the data and generate analytics on the alerts dashboard.</p>
            <button
              type="button"
              onClick={processForAnalytics}
              disabled={isProcessing}
              className={`inline-flex items-center gap-2 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white font-semibold px-6 py-3 rounded-full shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-300 w-full disabled:opacity-60 disabled:cursor-not-allowed`}
              aria-label="Process Data & View Alerts"
            >
              {isProcessing ? (
                <>
                  <span className="animate-spin inline-block mr-2"><svg width="20" height="20" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="4" opacity="0.2"/><path d="M22 12c0-5.523-4.477-10-10-10" stroke="#fff" strokeWidth="4" strokeLinecap="round"/></svg></span>
                  Processing...
                </>
              ) : 'Process Data & View Alerts'}
            </button>
          </div>
        )}

        {/* CSV Format Requirements Card */}
        <div className="bg-[#1F2030] border border-[#333] rounded-xl shadow-[0_2px_8px_rgba(110,95,254,0.08)] p-8 mb-10 animate-fadeIn transition-all duration-300 w-full">
          <h2 className="text-lg font-extrabold text-[#EEE] uppercase tracking-wide mb-4">CSV Format Requirements</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-300 leading-relaxed">
            <li><span className="font-bold text-white">id</span> - Unique identifier for the activity</li>
            <li><span className="font-bold text-white">userId</span> - User identifier</li>
            <li><span className="font-bold text-white">username</span> - Username or email</li>
            <li><span className="font-bold text-white">timestamp</span> - Date and time of activity</li>
            <li><span className="font-bold text-white">integration</span> - Source integration (email, cloud, usb, etc.)</li>
            <li><span className="font-bold text-white">activity</span> - Description of user activity</li>
            <li><span className="font-bold text-white">status</span> - Status of the activity (underReview, trusted, concern, etc.)</li>
            <li><span className="font-bold text-white">riskScore</span> - Numeric risk score</li>
            <li><span className="font-bold text-white">policiesBreached</span> - JSON object with policy breach information</li>
            <li><span className="font-bold text-white">values</span> - JSON object with additional activity values</li>
          </ul>
        </div>
      </div>
    </div>
>>>>>>> 0481816de9b1c248174805c3fca29620f4a87b5c
  );
}
