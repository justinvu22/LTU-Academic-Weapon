import React from 'react';

export default function MLTestLayout({
  children,
}) {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto p-6">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">ShadowSight ML Analysis</h1>
          <p className="text-gray-600 mt-1">
            Machine learning-powered insights for user activity data
          </p>
        </header>
        <main className="bg-white rounded-lg shadow border border-gray-200 p-6">
          {children}
        </main>
        <footer className="mt-8 text-center text-gray-500 text-sm">
          <p>ShadowSight Dashboard - ML Component</p>
        </footer>
      </div>
    </div>
  );
} 