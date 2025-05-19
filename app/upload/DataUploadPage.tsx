"use client";

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { UploadFile, Check } from '@mui/icons-material';
import { useActivityContext } from '../../src/contexts/ActivityContext';
import { useDropzone } from 'react-dropzone';
import type { UserActivity } from '../../types/activity';

/**
 * Component for uploading and processing CSV data
 */
export default function DataUploadPage() {
  const router = useRouter();
  const { refreshActivities } = useActivityContext();
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadStats, setUploadStats] = useState<{ rows: number } | null>(null);
  const [isUploadHovered, setIsUploadHovered] = useState(false);
  const [autoDetectColumns, setAutoDetectColumns] = useState<boolean>(true);
  const [delimiter, setDelimiter] = useState<string>(',');
  const [customColumns, setCustomColumns] = useState<string[]>([]);
  const [dateFormat, setDateFormat] = useState<string>('YYYY-MM-DD');
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>('');
  const [statistics, setStatistics] = useState<any | null>(null);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [uploadedActivities, setUploadedActivities] = useState<UserActivity[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isProcessHovered, setIsProcessHovered] = useState(false);

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
  const handleUpload = async () => {
    if (!file) {
      setErrorMessage('Please select a file to upload.');
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
      await config.initialize();
      // Use IndexedDB as main storage method 
      const { storeActivitiesInIndexedDB, getActivitiesFromIndexedDB } = await import('../../utils/storage');
      // Set a reasonable progress update interval
      const totalFiles = 1;
      let filesProcessed = 0;
      // Track total activities for statistics
      let totalActivities = 0;
      let allActivities: UserActivity[] = [];
      // Process the single file
      // Update progress
      setProgress((filesProcessed / totalFiles) * 30); // First 30% is file reading
      setStatus(`Reading file 1 of 1: ${file.name}`);
      try {
        const text = await readFileAsText(file);
        setStatus(`Processing data from ${file.name}...`);
        const { parseCSV } = await import('../../utils/csvParser');
        const parsedActivities = await parseCSV(text, formatOptions);
        setStatus(`Normalizing data format...`);
        if (!parsedActivities || !Array.isArray(parsedActivities) || parsedActivities.length === 0) {
          throw new Error('No valid activities found in file');
        }
        const schemaFormat = schemaAdapter.detectSchemaFormat(parsedActivities[0]);
        console.log(`Detected schema format: ${schemaFormat}`);
        setStatus(`Normalizing ${parsedActivities.length} activities...`);
        const chunkSize = Number(config.get('chunkSize')) || 500;
        const chunks = Math.ceil(parsedActivities.length / chunkSize);
        const normalizedActivities: UserActivity[] = [];
        for (let j = 0; j < parsedActivities.length; j += chunkSize) {
          const chunk = parsedActivities.slice(j, j + chunkSize);
          const normalizedChunk = schemaAdapter.normalizeActivities(chunk);
          normalizedActivities.push(...normalizedChunk);
          const fileProgress = 30 + (30 * (filesProcessed / totalFiles)) + (30 * (j / parsedActivities.length) / totalFiles);
          setProgress(fileProgress);
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        const processedActivities = normalizedActivities.map((activity, index) => ({
          ...activity,
          id: activity.id || `${Date.now()}-${index}`,
          riskScore: activity.riskScore || 0
        }));
        allActivities = [...allActivities, ...processedActivities];
        totalActivities += processedActivities.length;
        filesProcessed++;
        setProgress(30 + (60 * (filesProcessed / totalFiles)));
        setStatus(`Processed ${processedActivities.length} activities from ${file.name}`);
      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
        setErrorMessage(`Error processing file ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
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
          if (allActivities.length <= 1000) {
            try {
              localStorage.setItem('activities', JSON.stringify(allActivities));
              console.log('Stored activities in localStorage as fallback');
            } catch (lsError) {
              console.error('Failed to store in localStorage:', lsError);
            }
          }
        }
        setStatus('Calculating statistics...');
        try {
          const { calculateStatistics } = await import('../../utils/dataProcessor');
          const stats = await calculateStatistics(allActivities);
          setStatistics(stats);
          console.log('Statistics calculated successfully:', stats);
        } catch (statsError) {
          console.error('Error calculating statistics:', statsError);
        }
        setActivities(allActivities.slice(0, 100));
        setUploadSuccess(true);
        setUploadComplete(true);
        setUploadStats({ rows: allActivities.length });
        setSuccessMessage('CSV uploaded and processed successfully!');
        setProgress(100);
        setStatus(`Successfully processed ${totalActivities} activities from ${filesProcessed} files`);
      } else {
        setErrorMessage('No valid activities found in the uploaded files');
      }
    } catch (error) {
      console.error('Error processing files:', error);
      setErrorMessage(`Error processing files: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    if (file) {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        
        // Call API to process the data
        const response = await fetch('/api/activities', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ activities: file }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to process activity data');
        }
        
        // Refresh activities context for live badge update
        await refreshActivities();
        // Navigate to the dashboard page to see the processed data
        router.push('/dashboard');
      } catch (error) {
        console.error('Error processing data:', error);
        setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    } else {
      setErrorMessage("No file selected. Please upload a CSV file first.");
    }
  };

  const handleButtonClick = () => {
    // fileInputRef.current?.click();
  };

  // When the user clicks "Process Data & View Alerts"
  const goToDashboard = async () => {
    try {
      // First check if we have data in IndexedDB
      const { getActivitiesFromIndexedDB } = await import('../../utils/storage');
      const activities = await getActivitiesFromIndexedDB();
      
      if (!activities || activities.length === 0) {
        // No data in IndexedDB, show warning
        setErrorMessage('No data available. Please upload and process data first.');
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
          <>
            {successMessage && (
              <div className="w-full mb-3 p-3 rounded-xl bg-green-500/10 text-green-400 text-center font-semibold shadow transition-all duration-300 flex items-center justify-center gap-2">
                <Check />
                {successMessage}
              </div>
            )}
            <div className="bg-[#1F2030] border border-[#333] rounded-xl shadow-[0_2px_8px_rgba(110,95,254,0.08)] p-8 mb-10 animate-fadeIn transition-all duration-300 w-full">
              <h2 className="text-lg font-extrabold text-[#EEE] uppercase tracking-wide mb-4">Process Data</h2>
              <p className="text-gray-300 mb-6 leading-relaxed">Your data has been uploaded successfully. Click the button below to process the data and generate analytics on the alerts dashboard.</p>
              <button
                type="button"
                onClick={processForAnalytics}
                disabled={isProcessing}
                onMouseEnter={() => setIsProcessHovered(true)}
                onMouseLeave={() => setIsProcessHovered(false)}
                style={{ transform: isProcessHovered ? 'scale(1.02)' : 'scale(1)' }}
                className={`inline-flex items-center gap-2 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white font-semibold px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 w-full disabled:opacity-60 disabled:cursor-not-allowed`}
                aria-label="Process Data"
              >
                {isProcessing ? (
                  <>
                    <span className="animate-spin inline-block mr-2"><svg width="20" height="20" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="4" opacity="0.2"/><path d="M22 12c0-5.523-4.477-10-10-10" stroke="#fff" strokeWidth="4" strokeLinecap="round"/></svg></span>
                    Processing...
                  </>
                ) : 'Process Data'}
              </button>
            </div>
          </>
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
  );
}
