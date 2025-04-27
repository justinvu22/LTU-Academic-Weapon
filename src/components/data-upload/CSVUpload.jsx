import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';

const CSVUpload = ({ onDataProcessed }) => {
  const onDrop = useCallback((acceptedFiles) => {
    acceptedFiles.forEach((file) => {
      Papa.parse(file, {
        complete: (results) => {
          onDataProcessed(results.data);
        },
        header: true,
        skipEmptyLines: true,
      });
    });
  }, [onDataProcessed]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
  });

  return (
    <div
      {...getRootProps()}
      className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer ${
        isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
      }`}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Drop the CSV file here ...</p>
      ) : (
        <p>Drag and drop a CSV file here, or click to select a file</p>
      )}
    </div>
  );
};

export default CSVUpload; 