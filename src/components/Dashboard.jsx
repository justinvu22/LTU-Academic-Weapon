import React, { useState } from 'react';
import Papa from 'papaparse';
import FileUpload from './FileUpload';

const Dashboard = () => {
  const [data, setData] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileSelect = (file) => {
    setLoading(true);
    setError('');

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError('Error parsing CSV file: ' + results.errors[0].message);
          setLoading(false);
          return;
        }

        // Validate required columns
        const requiredColumns = ['activityId', 'user', 'date', 'time', 'riskScore', 'integration', 'policiesBreached', 'values', 'status'];
        const missingColumns = requiredColumns.filter(col => !results.meta.fields.includes(col));

        if (missingColumns.length > 0) {
          setError(`Missing required columns: ${missingColumns.join(', ')}`);
          setLoading(false);
          return;
        }

        // Process the data
        setData(results.data);
        setLoading(false);
      },
      error: (error) => {
        setError('Error reading file: ' + error.message);
        setLoading(false);
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <FileUpload onFileSelect={handleFileSelect} />
      
      {loading && (
        <div className="mt-4 text-center">
          <p className="text-blue-600">Processing file...</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Rest of your dashboard components */}
    </div>
  );
};

export default Dashboard; 