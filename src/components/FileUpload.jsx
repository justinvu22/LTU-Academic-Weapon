import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';

const FileUpload = ({ onDataLoaded }) => {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        Papa.parse(file, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              alert('Error parsing CSV file: ' + results.errors[0].message);
              return;
            }
            onDataLoaded(results.data);
          },
          error: (error) => {
            alert('Error reading file: ' + error.message);
          }
        });
      } else {
        alert('Please upload a CSV file');
      }
    }
  }, [onDataLoaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false
  });

  return (
    <div
      {...getRootProps()}
      className={`
        p-8 border-2 border-dashed rounded-lg
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        cursor-pointer transition-all duration-200 ease-in-out
      `}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-4">
        <svg
          className={`w-12 h-12 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <h3 className="text-lg font-medium">
          {isDragActive ? 'Drop the CSV file here' : 'Drag and drop a CSV file here'}
        </h3>
        <p className="text-sm text-gray-500">
          or click to select a file
        </p>
      </div>
    </div>
  );
};

export default FileUpload; 