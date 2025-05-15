"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Typography,
  Paper,
  Alert,
} from '@mui/material';
import { UploadFile, Check, Error as ErrorIcon } from '@mui/icons-material';
import Papa from 'papaparse';

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
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Data Upload
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Upload Activity Data CSV
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          Upload a CSV file containing user activity data to analyze for policy breaches and security risks.
          The CSV should include columns for user ID, timestamp, activity type, and potential policy breaches.
        </Typography>
        
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {errorMessage}
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Button
              variant="contained"
              component="label"
              startIcon={<UploadFile />}
              disabled={isUploading}
              fullWidth
              sx={{ 
                py: 1.5, 
                bgcolor: uploadComplete ? 'success.main' : 'primary.main',
                '&:hover': {
                  bgcolor: uploadComplete ? 'success.dark' : 'primary.dark',
                }
              }}
            >
              {uploadComplete ? 'File Uploaded - Select Another' : 'Select CSV File'}
              <input
                type="file"
                accept=".csv"
                hidden
                onChange={handleFileChange}
              />
            </Button>
          </Box>
          
          <Box sx={{ flex: 1 }}>
            <Button
              variant="outlined"
              onClick={handleUpload}
              disabled={!file || isUploading || uploadComplete}
              fullWidth
              sx={{ py: 1.5 }}
            >
              {isUploading ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  Uploading...
                </>
              ) : 'Upload File'}
            </Button>
          </Box>
        </Box>
        
        {file && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">
              Selected file: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </Typography>
          </Box>
        )}
        
        {uploadStats && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="success" icon={<Check />}>
              Successfully parsed {uploadStats.rows} rows of data. Ready to process.
            </Alert>
          </Box>
        )}
      </Paper>
      
      {uploadComplete && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Process Data
            </Typography>
            
            <Typography variant="body2" paragraph>
              Your data has been uploaded successfully. Click the button below to process the data
              and generate analytics on the alerts dashboard.
            </Typography>
            
            <Button
              variant="contained"
              color="primary"
              onClick={processForAnalytics}
              disabled={isProcessing}
              sx={{ mt: 1 }}
            >
              {isProcessing ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1 }} color="inherit" />
                  Processing...
                </>
              ) : 'Process Data & View Alerts'}
            </Button>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            CSV Format Requirements
          </Typography>
          
          <Typography variant="body2" paragraph>
            Your CSV file should include the following columns:
          </Typography>
          
          <Box component="ul" sx={{ pl: 4 }}>
            <li>
              <Typography variant="body2" component="span" fontWeight="bold">id</Typography>
              <Typography variant="body2" component="span"> - Unique identifier for the activity</Typography>
            </li>
            <li>
              <Typography variant="body2" component="span" fontWeight="bold">userId</Typography>
              <Typography variant="body2" component="span"> - User identifier</Typography>
            </li>
            <li>
              <Typography variant="body2" component="span" fontWeight="bold">username</Typography>
              <Typography variant="body2" component="span"> - Username or email</Typography>
            </li>
            <li>
              <Typography variant="body2" component="span" fontWeight="bold">timestamp</Typography>
              <Typography variant="body2" component="span"> - Date and time of activity</Typography>
            </li>
            <li>
              <Typography variant="body2" component="span" fontWeight="bold">integration</Typography>
              <Typography variant="body2" component="span"> - Source integration (email, cloud, usb, etc.)</Typography>
            </li>
            <li>
              <Typography variant="body2" component="span" fontWeight="bold">activity</Typography>
              <Typography variant="body2" component="span"> - Description of user activity</Typography>
            </li>
            <li>
              <Typography variant="body2" component="span" fontWeight="bold">status</Typography>
              <Typography variant="body2" component="span"> - Status of the activity (underReview, trusted, concern, etc.)</Typography>
            </li>
            <li>
              <Typography variant="body2" component="span" fontWeight="bold">riskScore</Typography>
              <Typography variant="body2" component="span"> - Numeric risk score</Typography>
            </li>
            <li>
              <Typography variant="body2" component="span" fontWeight="bold">policiesBreached</Typography>
              <Typography variant="body2" component="span"> - JSON object with policy breach information</Typography>
            </li>
            <li>
              <Typography variant="body2" component="span" fontWeight="bold">values</Typography>
              <Typography variant="body2" component="span"> - JSON object with additional activity values</Typography>
            </li>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
