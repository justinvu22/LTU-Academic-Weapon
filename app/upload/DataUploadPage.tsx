"use client";

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { UploadFile, Check } from '@mui/icons-material';
import { useActivityContext } from '../../src/contexts/ActivityContext';
import { useDropzone } from 'react-dropzone';

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
      return;
    }
    
    setIsUploading(true);
    setErrorMessage(null);
    
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const csvString = event.target?.result as string;
        
        // Parse CSV with PapaParse
        Papa.parse(csvString, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors && results.errors.length > 0) {
              console.error('CSV parsing errors:', results.errors);
              setErrorMessage(`Error parsing CSV: ${results.errors[0].message}`);
              setIsUploading(false);
              return;
            }
            
            // Check if we have data
            if (!results.data || results.data.length === 0) {
              setErrorMessage('The CSV file contains no valid data rows.');
              setIsUploading(false);
              return;
            }
            
            // Store parsed data
            setFileContent(results.data);
            setUploadStats({ rows: results.data.length });
            setUploadComplete(true);
            setIsUploading(false);
          },
          error: (error: Error) => {
            console.error('Error parsing CSV:', error);
            setErrorMessage(`Error parsing CSV: ${error.message}`);
            setIsUploading(false);
          }
        });
      } catch (error) {
        console.error('Error reading file:', error);
        setErrorMessage('Error reading file. Please try again.');
        setIsUploading(false);
      }
    };
    
    reader.onerror = () => {
      setErrorMessage('Error reading file. Please try again.');
      setIsUploading(false);
    };
    
    reader.readAsText(file);
  };

  /**
   * Process CSV data for analytics
   */
  const processForAnalytics = async () => {
    if (fileContent.length === 0) {
      setErrorMessage("No data to process. Please upload a CSV file first.");
      return;
    }
    
    try {
      setIsProcessing(true);
      
      // Simply pass the raw data to the API - the processing will happen there
      // This maintains the separation of concerns
      
      // Store the raw data in localStorage as backup
      localStorage.setItem('rawActivityData', JSON.stringify(fileContent));
      
      // Call API to process the data
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activities: fileContent }),
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
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#7928CA] px-4 sm:px-6 py-12 font-poppins">
      <div className="max-w-7xl w-full mx-auto">
        <h1 className="text-white text-3xl font-bold drop-shadow-lg mb-8">Upload CSV</h1>

        {/* Upload Form Card */}
        <div className="bg-[#1E1E2F] rounded-2xl shadow-[inset_-4px_-4px_8px_#2a2a40,inset_4px_4px_8px_#0e0e1e] p-8 mb-10 animate-fadeIn transition-all duration-300 w-full">
          <h2 className="text-xl font-semibold text-white mb-4">Upload Activity Data CSV</h2>
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
                ? 'border-[#3B82F6] bg-[#3B82F6]/10' 
                : 'border-gray-600 hover:border-[#3B82F6] hover:bg-[#3B82F6]/5'
              }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center text-center">
              <UploadFile className={`w-12 h-12 mb-4 ${isDragActive ? 'text-[#3B82F6]' : 'text-gray-400'}`} />
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
                className={`inline-flex items-center gap-2 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-semibold px-6 py-3 rounded-full shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-300 w-full disabled:opacity-60 disabled:cursor-not-allowed`}
                aria-label="Upload File"
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
          <div className="bg-[#1E1E2F] rounded-2xl shadow-[inset_-4px_-4px_8px_#2a2a40,inset_4px_4px_8px_#0e0e1e] p-8 mb-10 animate-fadeIn transition-all duration-300 w-full">
            <h2 className="text-lg font-semibold text-white mb-4">Process Data</h2>
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
        <div className="bg-[#1E1E2F] rounded-2xl shadow-[inset_-4px_-4px_8px_#2a2a40,inset_4px_4px_8px_#0e0e1e] p-8 mb-10 animate-fadeIn transition-all duration-300 w-full">
          <h2 className="text-lg font-semibold text-white mb-4">CSV Format Requirements</h2>
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
