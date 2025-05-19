import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import Papa from 'papaparse';

interface CSVUploaderProps {
  onDataLoaded: (data: any[]) => void;
  onError?: (error: string) => void;
}

export const CSVUploader: React.FC<CSVUploaderProps> = ({ onDataLoaded, onError }) => {
  const [isLoading, setIsLoading] = useState(false);

  const processCSV = async (file: File) => {
    return new Promise<any[]>((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            const errorMsg = `CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`;
            console.warn(errorMsg);
            reject(new Error(errorMsg));
          } else {
            resolve(results.data);
          }
        },
        error: (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        }
      });
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsLoading(true);
    
    try {
      const file = acceptedFiles[0];
      const data = await processCSV(file);
      onDataLoaded(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error processing CSV file';
      console.error(errorMessage);
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [onDataLoaded, onError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-purple-500 bg-purple-500/10' 
            : 'border-gray-400 hover:border-purple-400'}`}
      >
        <input {...getInputProps()} />
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              />
            </svg>
          )}
          <div className="text-sm text-gray-300">
            {isDragActive ? (
              <p>Drop the CSV file here ...</p>
            ) : (
              <p>
                Drag and drop a CSV file here, or click to select a file
              </p>
            )}
          </div>
          <p className="text-xs text-gray-400">
            Only CSV files are supported
          </p>
        </div>
      </div>
    </motion.div>
  );
}; 