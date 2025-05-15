"use client";

import { FaCog } from "react-icons/fa";

export default function SettingsPage() {
  return (
    <div className="font-['Poppins',sans-serif] flex flex-col items-center justify-center min-h-[80vh] py-12 bg-gradient-to-br from-white/80 to-blue-50 transition-all duration-300">
      {/* Demo Settings Section */}
      <div className="w-full max-w-4xl mx-auto glass-card p-8 rounded-2xl shadow-xl flex flex-col gap-6">
        <h2 className="text-2xl font-extrabold text-blue-700 mb-2 flex items-center gap-2"><FaCog className="text-blue-400" /> Settings (Demo)</h2>
        <div className="flex flex-row flex-wrap gap-8 gap-y-6 items-center justify-between">
          {/* Dark Mode Toggle */}
          <div className="flex flex-col items-start gap-1 min-w-[180px]">
            <span className="font-semibold text-gray-700 mb-1">Dark Mode</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only" disabled />
              <span className="w-12 h-7 flex items-center bg-gray-200 rounded-full p-1 duration-300">
                <span className="bg-white w-5 h-5 rounded-full shadow-md transform duration-300"></span>
              </span>
            </label>
          </div>
          {/* Language Select */}
          <div className="flex flex-col items-start gap-1 min-w-[180px]">
            <span className="font-semibold text-gray-700 mb-1">Language</span>
            <select className="rounded-lg border border-gray-200 px-4 py-2 bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-400 w-36" disabled>
              <option>English</option>
              <option>French</option>
              <option>Spanish</option>
            </select>
          </div>
          {/* Beta Features Toggle */}
          <div className="flex flex-col items-start gap-1 min-w-[180px]">
            <span className="font-semibold text-gray-700 mb-1">Enable Beta Features</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only" disabled />
              <span className="w-12 h-7 flex items-center bg-gray-200 rounded-full p-1 duration-300">
                <span className="bg-white w-5 h-5 rounded-full shadow-md transform duration-300"></span>
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
} 