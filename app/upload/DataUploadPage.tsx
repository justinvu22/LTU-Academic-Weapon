"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { UploadFile, Check } from '@mui/icons-material';

/**
 * Component for uploading and processing CSV data
 */
export default function DataUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadStats, setUploadStats] = useState<{ rows: number } | null>(null);

  /**
   * Handle file input change
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    
    if (event.target.files && event.target.files.length > 0) {
      const selectedFile = event.target.files[0];
      
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
  };

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
      
      // Format the data to match the expected UserActivity structure
      const formattedActivities = fileContent.map((row: any) => {
        // Handle policiesBreached - ensure it's in the correct format
        let policiesBreached = row.policiesBreached;
        if (typeof policiesBreached === 'string') {
          try {
            policiesBreached = JSON.parse(policiesBreached);
          } catch (e) {
            policiesBreached = {}; // Default if parsing fails
          }
        }
        
        // Handle values - ensure it's in the correct format
        let values = row.values;
        if (typeof values === 'string') {
          try {
            values = JSON.parse(values);
          } catch (e) {
            values = {}; // Default if parsing fails
          }
        }
        
        // Ensure riskScore is a number
        let riskScore = row.riskScore;
        if (typeof riskScore === 'string') {
          riskScore = parseInt(riskScore) || 0;
        }
        
        return {
          ...row,
          policiesBreached,
          values,
          riskScore
        };
      });
      
      // Store the data in localStorage (in a real app this would be saved to a database or API)
      localStorage.setItem('processedActivityData', JSON.stringify(formattedActivities));
      
      // Call API to process the data
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activities: formattedActivities }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to process activity data');
      }
      
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
    <div className="font-['Poppins',sans-serif] min-h-[80vh] py-12 px-4 md:px-12 bg-gradient-to-br from-white/80 to-blue-50 transition-all duration-300">
      <h1 className="text-3xl font-extrabold text-blue-700 mb-8 flex items-center gap-2 drop-shadow-sm">Data Upload</h1>

      <div className="glass-card max-w-4xl mx-auto mb-8 p-8 rounded-2xl shadow-xl flex flex-col gap-6">
        <h2 className="text-xl font-bold text-blue-600 mb-2 flex items-center gap-2">Upload Activity Data CSV</h2>
        <p className="text-gray-500 mb-4">Upload a CSV file containing user activity data to analyze for policy breaches and security risks. The CSV should include columns for user ID, timestamp, activity type, and potential policy breaches.</p>
        {errorMessage && (
          <div className="w-full mb-3 p-3 rounded-xl bg-red-100 text-red-700 text-center font-semibold shadow transition-all duration-300">
            {errorMessage}
          </div>
        )}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              hidden
              onChange={handleFileChange}
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => document.getElementById('csv-upload')?.click()}
              className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow-lg hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed ${uploadComplete ? 'from-green-500 to-green-400' : ''}`}
            >
              <UploadFile />
              {uploadComplete ? 'File Uploaded - Select Another' : 'Select CSV File'}
            </button>
          </div>
          <div className="flex-1">
            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || isUploading || uploadComplete}
              className="w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition bg-gradient-to-r from-purple-500 to-pink-400 text-white shadow-lg hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
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
          <div className="mt-2 text-sm text-gray-600">Selected file: <span className="font-semibold">{file.name}</span> ({(file.size / 1024).toFixed(2)} KB)</div>
        )}
        {uploadStats && (
          <div className="mt-2">
            <div className="w-full mb-3 p-3 rounded-xl bg-green-100 text-green-700 text-center font-semibold shadow transition-all duration-300 flex items-center justify-center gap-2">
              <Check />
              Successfully parsed {uploadStats.rows} rows of data. Ready to process.
            </div>
          </div>
        )}
      </div>

      {uploadComplete && (
        <div className="glass-card max-w-2xl mx-auto mb-8 p-8 rounded-2xl shadow-xl flex flex-col gap-4">
          <h2 className="text-lg font-bold text-purple-600 mb-2">Process Data</h2>
          <p className="text-gray-500 mb-4">Your data has been uploaded successfully. Click the button below to process the data and generate analytics on the alerts dashboard.</p>
          <button
            type="button"
            onClick={processForAnalytics}
            disabled={isProcessing}
            className="w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
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

      <div className="glass-card max-w-4xl mx-auto p-8 rounded-2xl shadow-xl flex flex-col gap-4">
        <h2 className="text-xl font-bold text-blue-600 mb-2">CSV Format Requirements</h2>
        <p className="text-gray-500 mb-2">Your CSV file should include the following columns:</p>
        <ul className="list-disc pl-6 space-y-1 text-gray-700">
          <li><span className="font-bold">id</span> - Unique identifier for the activity</li>
          <li><span className="font-bold">userId</span> - User identifier</li>
          <li><span className="font-bold">username</span> - Username or email</li>
          <li><span className="font-bold">timestamp</span> - Date and time of activity</li>
          <li><span className="font-bold">integration</span> - Source integration (email, cloud, usb, etc.)</li>
          <li><span className="font-bold">activity</span> - Description of user activity</li>
          <li><span className="font-bold">status</span> - Status of the activity (underReview, trusted, concern, etc.)</li>
          <li><span className="font-bold">riskScore</span> - Numeric risk score</li>
          <li><span className="font-bold">policiesBreached</span> - JSON object with policy breach information</li>
          <li><span className="font-bold">values</span> - JSON object with additional activity values</li>
        </ul>
      </div>
    </div>
  );
}
