// app/layout.tsx

"use client";

import PageTransition from "../UI_components/PageTransition";
import LeftSidebar from "../UI_components/LeftSidebar";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FaUser,
  FaMoon,
  FaSun
} from "react-icons/fa";
import './input.css'

export default function RootLayout({ children }: { children: React.ReactNode; }) {
  const [darkMode, setDarkMode] = useState(true);
  const [activeLink, setActiveLink] = useState("/");
  
  // Initialize darkMode from localStorage or default to true
  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode");
    if (savedMode !== null) {
      setDarkMode(savedMode === "true");
    }
  }, []);
  
  // Update localStorage when darkMode changes
  useEffect(() => {
    localStorage.setItem("darkMode", darkMode.toString());
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);
  
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };
  
  const handleLinkClick = (path: string) => {
    setActiveLink(path);
  };

  return (
    <html lang="en" className={darkMode ? "dark" : ""}>
      <body className={`flex h-screen overflow-hidden transition-colors duration-300 ${darkMode ? "bg-gray-100 text-gray-900" : "bg-[#24243e] text-white"}`}>
        {/* LEFT SIDEBAR */}
        <LeftSidebar activeLink={activeLink} onLinkClick={handleLinkClick} />

        {/* MAIN CONTENT */}
        <main className={`flex-1 overflow-auto ${darkMode ? "bg-gray-100" : "bg-gradient-to-tr from-[#24243e] to-[#302b63]"} p-6 transition-colors duration-300`}>
          <div className="flex justify-between mb-6">
            <h1 className="text-2xl font-bold">
              {activeLink === "/" ? "Home" : 
               activeLink === "/upload" ? "Upload CSV" : 
               activeLink === "/dashboard" ? "Dashboard" : 
               activeLink === "/ml" ? "ML Insights" : 
               activeLink === "/alerts" ? "Alerts" : 
               activeLink === "/settings" ? "Settings" : 
               activeLink === "/help" ? "Help" : ""}
            </h1>
            <button 
              onClick={toggleDarkMode}
              className={`p-2 rounded-full ${darkMode ? "bg-yellow-100 text-yellow-600" : "bg-gray-800 text-gray-200"} transition-all duration-300`}
              aria-label={darkMode ? "Switch to dark mode" : "Switch to light mode"}
            >
              {darkMode ? <FaMoon /> : <FaSun />}
            </button>
          </div>
          <PageTransition>
            {children}
          </PageTransition>
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className={`w-72 ${darkMode ? "bg-white" : "bg-[#1D1B2D]"} text-${darkMode ? "gray-800" : "white"} flex flex-col p-4 border-l ${darkMode ? "border-gray-200" : "border-white/10"} transition-colors duration-300`}>
          {/* User Profile Section */}
          <div className="flex items-center gap-3 mb-6">
            <div className={`h-12 w-12 rounded-full ${darkMode ? "bg-gray-200" : "bg-white/20"} flex items-center justify-center`}>
              {/* Placeholder initials or avatar */}
              <span className="text-sm">SF</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Sophie Fortune</h2>
              <p className={`text-sm ${darkMode ? "text-gray-500" : "text-gray-300"}`}>@sophiefortune</p>
            </div>
          </div>
          <Link 
            href="/profile/settings" 
            className={`flex items-center gap-2 p-2 rounded ${darkMode ? "hover:bg-gray-100" : "hover:bg-white/5"} transition-colors ${activeLink === "/profile/settings" ? darkMode ? "bg-gray-100" : "bg-white/10" : ""}`}
            onClick={() => handleLinkClick("/profile/settings")}
          >
            <FaUser className="text-lg" />
            <span>Profile Settings</span>
          </Link>
          <hr className={`${darkMode ? "border-gray-200" : "border-white/10"} mb-6`} />
          {/* New Members Section */}
          <section>
            <h3 className="text-md font-bold mb-4">New Members</h3>
            <ul className="flex flex-col gap-2">
              <li className={`flex items-center gap-3 cursor-pointer ${darkMode ? "hover:bg-gray-100" : "hover:bg-white/5"} p-2 rounded transition-colors`}>
                <div className={`h-8 w-8 rounded-full ${darkMode ? "bg-gray-200" : "bg-white/20"} flex items-center justify-center`}>
                  <span>AC</span>
                </div>
                <p className="text-sm">Anne Couture</p>
              </li>
              <li className={`flex items-center gap-3 cursor-pointer ${darkMode ? "hover:bg-gray-100" : "hover:bg-white/5"} p-2 rounded transition-colors`}>
                <div className={`h-8 w-8 rounded-full ${darkMode ? "bg-gray-200" : "bg-white/20"} flex items-center justify-center`}>
                  <span>MS</span>
                </div>
                <p className="text-sm">Miriam Sol</p>
              </li>
              <li className={`flex items-center gap-3 cursor-pointer ${darkMode ? "hover:bg-gray-100" : "hover:bg-white/5"} p-2 rounded transition-colors`}>
                <div className={`h-8 w-8 rounded-full ${darkMode ? "bg-gray-200" : "bg-white/20"} flex items-center justify-center`}>
                  <span>LM</span>
                </div>
                <p className="text-sm">Lea Mavi</p>
              </li>
              <li className={`flex items-center gap-3 cursor-pointer ${darkMode ? "hover:bg-gray-100" : "hover:bg-white/5"} p-2 rounded transition-colors`}>
                <div className={`h-8 w-8 rounded-full ${darkMode ? "bg-gray-200" : "bg-white/20"} flex items-center justify-center`}>
                  <span>MM</span>
                </div>
                <p className="text-sm">Mark Morin</p>
              </li>
            </ul>
          </section>
          <div className="mt-auto">
            <hr className={`${darkMode ? "border-gray-200" : "border-white/10"} my-6`} />
            <p className={`text-sm ${darkMode ? "text-gray-500" : "text-gray-400"}`}>© 2025 ShadowSight</p>
          </div>
        </aside>
      </body>
    </html>
  );
}