"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UploadFile, Check } from '@mui/icons-material';
import { useActivityContext } from '../../src/contexts/ActivityContext';
import { useDropzone } from 'react-dropzone';
import type { UserActivity } from '../../types/activity';
import { AlertsManager } from '../../utils/alertsManager';

/**
 * Component for uploading and processing CSV data
 */
export default function DataUploadPage() {
  const router = useRouter();
  const { refreshActivities } = useActivityContext();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading] = useState(false);
  const [isProcessing] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadStats, setUploadStats] = useState<{ rows: number } | null>(null);
  const [isUploadHovered, setIsUploadHovered] = useState(false);
  const [autoDetectColumns] = useState<boolean>(true);
  const [delimiter] = useState<string>(',');
  const [customColumns] = useState<string[]>([]);
  const [dateFormat] = useState<string>('YYYY-MM-DD');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isAppendMode, setIsAppendMode] = useState<boolean>(false);
  const [currentStorageSize, setCurrentStorageSize] = useState<number>(0);
  const [maxStorageSize] = useState<number>(10 * 1024 * 1024); // 10MB
  const [remainingStorageBytes, setRemainingStorageBytes] = useState<number>(10 * 1024 * 1024);
  const [isProcessHovered, setIsProcessHovered] = useState(false);

  useEffect(() => {
    // Check current storage size when the component mounts
    const checkStorageSize = async () => {
      try {
        const { getStoredActivitiesSize } = await import('../../utils/storage');
        const size = await getStoredActivitiesSize();
        setCurrentStorageSize(size);
        setRemainingStorageBytes(Math.max(0, maxStorageSize - size));
      } catch (error) {
        console.error('Error checking storage size:', error);
      }
    };
    
    checkStorageSize();
  }, [maxStorageSize]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
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
      
      // Validate CSV headers
      try {
        const { CSVValidator } = await import('../../utils/csvValidator');
        const validation = await CSVValidator.validateFile(selectedFile);
        
        if (!validation.isValid) {
          const errorMessage = CSVValidator.getValidationMessage(validation);
          setErrorMessage(errorMessage);
          return;
        }
        
        // Show warnings if there are extra headers
        if (validation.warnings.length > 0) {
          console.warn('CSV validation warnings:', validation.warnings);
        }
        
        setFile(selectedFile);
      } catch (validationError) {
        setErrorMessage(`Error validating CSV file: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`);
        return;
      }
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
      const { 
        storeActivitiesInIndexedDB, 
        appendActivities,
        getStoredActivitiesSize,
        clearStoredActivities
      } = await import('../../utils/storage');
      
      // Track total activities for statistics
      let totalActivities = 0;
      let allActivities: UserActivity[] = [];
      // Process the single file
      
      // Update progress
      // setProgress((filesProcessed / totalFiles) * 30); // First 30% is file reading
      // setStatus(`Reading file 1 of 1: ${file.name}`);
      try {
        const text = await readFileAsText(file);
        // setStatus(`Processing data from ${file.name}...`);
        const { parseCSV } = await import('../../utils/csvParser');
        const parsedActivities = await parseCSV(text, formatOptions);
        // setStatus(`Normalizing data format...`);
        if (!parsedActivities || !Array.isArray(parsedActivities) || parsedActivities.length === 0) {
          throw new Error('No valid activities found in file');
        }
        const schemaFormat = schemaAdapter.detectSchemaFormat(parsedActivities[0]);
        console.log(`Detected schema format: ${schemaFormat}`);
        // setStatus(`Normalizing ${parsedActivities.length} activities...`);
        const chunkSize = Number(config.get('chunkSize')) || 500;
        const normalizedActivities: UserActivity[] = [];
        for (let j = 0; j < parsedActivities.length; j += chunkSize) {
          const chunk = parsedActivities.slice(j, j + chunkSize);
          const normalizedChunk = schemaAdapter.normalizeActivities(chunk);
          normalizedActivities.push(...normalizedChunk);
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        const processedActivities = normalizedActivities.map((activity, index) => ({
          ...activity,
          id: activity.id || `${Date.now()}-${index}`,
          riskScore: activity.riskScore || 0
        }));
        allActivities = [...allActivities, ...processedActivities];
        totalActivities += processedActivities.length;
        // const fileProgress = 30 + (60 * (filesProcessed / totalFiles)); // removed unused variable
        // setStatus(fileProgress.toFixed(0) + '%');
        // setStatus(`Processed ${processedActivities.length} activities from ${file.name}`);
      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
        setErrorMessage(`Error processing file ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
      }
      
      // Store all activities in IndexedDB
      if (allActivities.length > 0) {
        const activityCount = allActivities.length;
        
        try {
          let storageSuccess = false;
          let addedCount = 0;
          let newRemainingSpaceBytes = 0;
          
          if (isAppendMode) {
            // Append to existing activities
            // setStatus(`Appending ${activityCount} activities to existing data...`);
            const { success, addedCount: added, remainingSpaceBytes } = await appendActivities(allActivities);
            storageSuccess = success;
            addedCount = added;
            newRemainingSpaceBytes = remainingSpaceBytes;
            
            if (success) {
              console.log(`Successfully appended ${addedCount} of ${activityCount} activities`);
              if (addedCount < activityCount) {
                setErrorMessage(`Only ${addedCount} of ${activityCount} activities were appended due to the 10MB size limit.`);
              }
            } else {
              setErrorMessage('Failed to append activities. Storage may be full or there was an error.');
            }
            
            // Update the remaining storage size
            setRemainingStorageBytes(newRemainingSpaceBytes);
          } else {
            // Replace existing activities - CLEAR OLD DATA FIRST
            console.log('Clearing existing data before storing new data');
            
            try {
              // Clear existing data first
              await clearStoredActivities();
              console.log('Successfully cleared existing data');
              
              // Clear ML alerts as well
              AlertsManager.clearAllAlerts();
              console.log('Successfully cleared ML alerts');
              
              // Wait a moment to ensure the clear operation is complete
              await new Promise(resolve => setTimeout(resolve, 100));
              
            } catch (clearError) {
              console.error('Error clearing existing data:', clearError);
              // Continue with storage even if clear fails
            }
            
            setSuccessMessage('CSV uploaded and processed successfully!');
            
            console.log(`Storing ${activityCount} activities in IndexedDB`);
            
            storageSuccess = await storeActivitiesInIndexedDB(allActivities);
            addedCount = activityCount;
            
            if (storageSuccess) {
              console.log('Successfully stored activities in IndexedDB');
              
              // Wait a moment to ensure storage is complete
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Trigger a storage event to notify other components
              window.dispatchEvent(new CustomEvent('dataUploaded', { 
                detail: { 
                  activityCount: allActivities.length,
                  timestamp: Date.now(),
                  type: 'replace' // Indicate this is a replacement, not append
                }
              }));
              
              // Also set localStorage flag for immediate detection
              localStorage.setItem('lastDataUpload', Date.now().toString());
              localStorage.setItem('dataUploadType', 'replace');
              
              // Update storage size
              const newSize = await getStoredActivitiesSize();
              setCurrentStorageSize(newSize);
              setRemainingStorageBytes(Math.max(0, maxStorageSize - newSize));
            } else {
              if (allActivities.length <= 1000) {
                console.log('Falling back to localStorage due to IndexedDB failure');
                localStorage.setItem('activities', JSON.stringify(allActivities));
                console.log('Stored activities in localStorage');
                
                // Still trigger storage event for localStorage fallback
                window.dispatchEvent(new CustomEvent('dataUploaded', { 
                  detail: { 
                    activityCount: allActivities.length,
                    timestamp: Date.now(),
                    fallbackMode: true
                  }
                }));
              } else {
                console.warn('Dataset too large for localStorage. Only IndexedDB data will be available.');
              }
            }
          }
          
          // setStatus('Calculating statistics...');
          try {
            const { calculateStatistics } = await import('../../utils/dataProcessor');
            const stats = await calculateStatistics(allActivities);
            // setStatistics(stats);
            console.log('Statistics calculated successfully:', stats);
          } catch (statsError) {
            console.error('Error calculating statistics:', statsError);
          }
          
          setUploadComplete(true);
          setUploadStats({ rows: allActivities.length });
        } catch (storageError) {
          console.error('Error storing activities:', storageError);
          setErrorMessage(`Error storing activities: ${storageError instanceof Error ? storageError.message : 'Unknown error'}`);
        }
      } else {
        setErrorMessage('No valid activities found in the uploaded files');
      }
    } catch (error) {
      console.error('Error processing files:', error);
      setErrorMessage(`Error processing files: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
   * Process CSV data for analytics
   */
  const processForAnalytics = async () => {
    if (file) {
      try {
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
        // Navigate to the ML page to generate new insights
        router.push('/ml');
      } catch (error) {
        console.error('Error processing data:', error);
        setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');
      }
    } else {
      setErrorMessage("No file selected. Please upload a CSV file first.");
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
          <div className="mb-6 bg-[#242536] rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-medium">Storage Usage</span>
              <span className="text-gray-300">
                {(currentStorageSize / (1024 * 1024)).toFixed(2)} MB / 10 MB
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <div 
                className="bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] h-2.5 rounded-full" 
                style={{ width: `${Math.min(100, (currentStorageSize / maxStorageSize) * 100)}%` }}
              ></div>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              {(remainingStorageBytes / (1024 * 1024)).toFixed(2)} MB available
            </div>
          </div>
          <div className="mb-6">
            <label className="inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                value="" 
                className="sr-only peer" 
                checked={isAppendMode}
                onChange={(e) => setIsAppendMode(e.target.checked)}
              />
              <div className="relative w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8B5CF6]"></div>
              <span className="ms-3 text-sm font-medium text-gray-300">Append mode (add to existing data)</span>
            </label>
            <p className="text-xs text-gray-400 mt-1 ml-14">
              {isAppendMode 
                ? "New data will be added to existing data, respecting the 10MB limit"
                : "New data will replace existing data"}
            </p>
          </div>
          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-6 mb-6 animate-fadeIn">
              <h3 className="text-red-400 font-bold text-lg mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                CSV Validation Error
              </h3>
              <div className="text-red-300 text-sm leading-relaxed max-h-64 overflow-y-auto">
                <pre className="whitespace-pre-wrap font-mono text-xs bg-red-900/10 p-3 rounded border border-red-500/20">
                  {errorMessage}
                </pre>
              </div>
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
          <p className="text-gray-300 mb-4 leading-relaxed">Your CSV file must contain exactly these headers (case-sensitive):</p>
          <ul className="list-disc list-inside space-y-2 text-gray-300 leading-relaxed">
            <li><span className="font-bold text-white">activityId</span> - Unique identifier for the activity</li>
            <li><span className="font-bold text-white">user</span> - User identifier</li>
            <li><span className="font-bold text-white">date</span> - Date of activity</li>
            <li><span className="font-bold text-white">time</span> - Time of activity</li>
            <li><span className="font-bold text-white">riskScore</span> - Numeric risk score</li>
            <li><span className="font-bold text-white">integration</span> - Source integration (email, cloud, usb, etc.)</li>
            <li><span className="font-bold text-white">policiesBreached</span> - Policy breach information</li>
            <li><span className="font-bold text-white">values</span> - Additional activity values</li>
            <li><span className="font-bold text-white">status</span> - Activity status (underReview, trusted, concern, etc.)</li>
            <li><span className="font-bold text-white">managerAction</span> - Manager action taken</li>
          </ul>
          <div className="mt-4 p-4 bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 rounded-lg">
            <p className="text-[#8B5CF6] text-sm font-medium">
              ⚠️ Files with missing or incorrect headers will be rejected. All 10 headers are required.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
