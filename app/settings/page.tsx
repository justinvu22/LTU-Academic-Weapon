"use client";

import { FaCog } from "react-icons/fa";

export default function SettingsPage() {
  return (
    <div className="font-['Poppins',sans-serif] flex flex-col items-center justify-center min-h-screen py-12 bg-gradient-to-b from-[#0F172A] to-[#7928CA] transition-all duration-300">
      {/* Demo Settings Section */}
      <div className="w-full max-w-4xl bg-[#1E1E2F] p-8 rounded-2xl shadow-[inset_-4px_-4px_12px_#2a2a40,inset_4px_4px_12px_#0e0e1e] border border-[#232846] flex flex-col gap-6">
        <h2 className="text-2xl font-extrabold text-white mb-2 flex items-center gap-2"><FaCog className="text-purple-400" /> Settings (Demo)</h2>
        <div className="flex flex-row flex-wrap gap-8 gap-y-6 items-center justify-between">
          {/* Dark Mode Toggle */}
          <div className="flex flex-col items-start gap-1 min-w-[180px]">
            <span className="font-semibold text-gray-200 mb-1">Dark Mode</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only" disabled />
              <span className="w-12 h-7 flex items-center bg-[#232846] rounded-full p-1 duration-300 border-2 border-purple-400">
                <span className="bg-white w-5 h-5 rounded-full shadow-md transform duration-300"></span>
              </span>
            </label>
          </div>
          {/* Language Select */}
          <div className="flex flex-col items-start gap-1 min-w-[180px]">
            <span className="font-semibold text-gray-200 mb-1">Language</span>
            <select className="rounded-lg border border-[#2d2d4d] px-4 py-2 bg-[#232846] text-white focus:outline-none focus:ring-2 focus:ring-purple-400 w-36" disabled>
              <option>English</option>
              <option>French</option>
              <option>Spanish</option>
            </select>
          </div>
          {/* Beta Features Toggle */}
          <div className="flex flex-col items-start gap-1 min-w-[180px]">
            <span className="font-semibold text-gray-200 mb-1">Enable Beta Features</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only" disabled />
              <span className="w-12 h-7 flex items-center bg-[#232846] rounded-full p-1 duration-300 border-2 border-purple-400">
                <span className="bg-white w-5 h-5 rounded-full shadow-md transform duration-300"></span>
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
} 