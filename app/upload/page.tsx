"use client";

import { useState, DragEvent } from "react";
import Papa from "papaparse";
import { motion } from "framer-motion";

export default function UploadPage() {
  // CSV data state
  const [fileContent, setFileContent] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Handle manual file input
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    parseCSV(file);
  };

  // Drag events
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      parseCSV(file);
    }
  };

  // CSV parsing function
  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setFileContent(results.data);
      },
    });
  };

  return (
    <div className="flex flex-col min-h-screen text-white">
      {/* 1) HERO BANNER SECTION */}
      <section
        className="relative w-full h-[40vh] bg-cover bg-center flex flex-col items-center justify-center"
        style={{
          backgroundImage: "url('/images/upload-bg.jpg')", // <-- Put your background image in /public/images
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/50" />

        <div className="relative z-10 text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Upload Your Activity Data</h1>
          <p className="text-sm md:text-lg text-gray-200 max-w-xl mx-auto mb-6">
            Easily upload or download CSV files to manage your user activity data.
          </p>
          {/* Buttons */}
          <div className="flex gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-md font-semibold transition-colors"
              onClick={() => document.getElementById("fileInput")?.click()} // Trigger file dialog
            >
              + Upload
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-md font-semibold transition-colors"
              // Example Download - you'd replace with your own CSV or logic
              onClick={() =>
                window.alert("Download logic not implemented. Provide your CSV download link!")
              }
            >
              Download
            </motion.button>
          </div>
        </div>
      </section>

      {/* 2) DRAG & DROP UPLOAD SECTION */}
      <section className="flex-1 bg-gradient-to-b from-[#110C1F] to-[#1B0B34] p-6 flex flex-col lg:flex-row items-start lg:items-center gap-6">
        {/* Hidden File Input */}
        <input
          type="file"
          id="fileInput"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Drag & Drop Container */}
        <motion.div
          className={`flex-1 h-56 border-2 border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer 
            transition-colors 
            ${
              isDragging
                ? "border-purple-500 bg-purple-500/10"
                : "border-gray-500 hover:border-purple-500 hover:bg-purple-500/5"
            }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          whileHover={{ scale: 1.02 }}
        >
          <p className="text-gray-300 text-center">
            {isDragging ? "Drop it here!" : "Drag & Drop CSV file here, or click to select."}
          </p>
        </motion.div>

        {/* CSV Data Preview */}
        <div className="w-full lg:w-[40%] bg-[#2A103F] rounded-md p-4 overflow-y-auto max-h-56 border border-purple-600">
          <h2 className="text-xl font-semibold mb-2 text-purple-200">Parsed Data Preview</h2>
          <pre className="text-xs whitespace-pre-wrap">
            {fileContent.length > 0
              ? JSON.stringify(fileContent.slice(0, 10), null, 2) // Show partial data
              : "No file uploaded yet..."}
          </pre>
        </div>
      </section>
    </div>
  );
}
