// app/layout.tsx

"use client";

import PageTransition from "@/components/PageTransition";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FaBell,
  FaChartLine,
  FaHome,
  FaMoon,
  FaRobot,
  FaSun,
  FaUpload,
  FaUser
} from "react-icons/fa";
import "./output.css"; // Import the compiled Tailwind output
import styles from './styles/navigation.module.css';

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
      <body className={`flex h-screen overflow-hidden transition-colors duration-300 ${darkMode ? "bg-[#24243e] text-white" : "bg-gray-100 text-gray-900"}`}>
        {/* LEFT SIDEBAR */}
        <aside className={`w-20 bg-gradient-to-b from-[#2C2C54] via-[#302b63] to-[#24243e] text-white flex flex-col transition-colors duration-300`}>
          {/* Header with Shadow Sight and Search */}
          <div className={`p-4 flex items-center justify-start border-b border-white/10`}>
            <div className="flex items-center">
              <img 
                src="/images/shadow-sight-icon.svg" 
                alt="Shadow Sight Logo" 
                className="w-12 h-12"
              />
            </div>
          </div>
          {/* Navigation Links */}
          <nav className={`flex-1 overflow-auto ${styles.navContainer}`}>
            <Link 
              href="/" 
              className={`flex items-center justify-center w-16 h-16 mx-auto ${activeLink === "/" ? styles.navLinkSelected : styles.navLinkUnselected}`}
              onClick={() => handleLinkClick("/")}
              title="Home"
            >
              <FaHome className="text-3xl" />
            </Link>
            <Link 
              href="/upload" 
              className={`flex items-center justify-center w-16 h-16 mx-auto ${activeLink === "/upload" ? styles.navLinkSelected : styles.navLinkUnselected}`}
              onClick={() => handleLinkClick("/upload")}
              title="CSV Upload"
            >
              <FaUpload className="text-3xl" />
            </Link>
            <Link 
              href="/dashboard" 
              className={`flex items-center justify-center w-16 h-16 mx-auto ${activeLink === "/dashboard" ? styles.navLinkSelected : styles.navLinkUnselected}`}
              onClick={() => handleLinkClick("/dashboard")}
              title="Dashboard"
            >
              <FaChartLine className="text-3xl" />
            </Link>
            <Link 
              href="/ml" 
              className={`flex items-center justify-center w-16 h-16 mx-auto ${activeLink === "/ml" ? styles.navLinkSelected : styles.navLinkUnselected}`}
              onClick={() => handleLinkClick("/ml")}
              title="ML Insights"
            >
              <FaRobot className="text-3xl" />
            </Link>
            <Link 
              href="/alerts" 
              className={`flex items-center justify-center w-16 h-16 mx-auto ${activeLink === "/alerts" ? styles.navLinkSelected : styles.navLinkUnselected}`}
              onClick={() => handleLinkClick("/alerts")}
              title="Custom Alerts"
            >
              <FaBell className="text-3xl" />
            </Link>
            <Link 
              href="/profile/settings" 
              className={`flex items-center justify-center w-16 h-16 mx-auto ${activeLink === "/profile/settings" ? styles.navLinkSelected : styles.navLinkUnselected}`}
              onClick={() => handleLinkClick("/profile/settings")}
              title="Profile Settings"
            >
              <FaUser className="text-3xl" />
            </Link>
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className={`flex-1 overflow-auto ${darkMode ? "bg-gradient-to-tr from-[#24243e] to-[#302b63]" : "bg-gray-100"} p-6 transition-colors duration-300`}>
          <div className="flex justify-end mb-4">
            <button 
              onClick={toggleDarkMode}
              className={`p-2 rounded-full ${darkMode ? "bg-gray-700 text-yellow-300" : "bg-blue-100 text-gray-800"} transition-all duration-300`}
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <FaSun /> : <FaMoon />}
            </button>
          </div>
          <PageTransition>
            {children}
          </PageTransition>
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className={`w-72 ${darkMode ? "bg-[#1D1B2D]" : "bg-white"} text-${darkMode ? "white" : "gray-800"} flex flex-col p-4 border-l ${darkMode ? "border-white/10" : "border-gray-200"} transition-colors duration-300`}>
          {/* User Profile Section */}
          <div className="flex items-center gap-3 mb-6">
            <div className={`h-12 w-12 rounded-full ${darkMode ? "bg-white/20" : "bg-gray-200"} flex items-center justify-center`}>
              {/* Placeholder initials or avatar */}
              <span className="text-sm">SF</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Sophie Fortune</h2>
              <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-500"}`}>@sophiefortune</p>
            </div>
          </div>
          <hr className={`${darkMode ? "border-white/10" : "border-gray-200"} mb-6`} />
          {/* New Members Section */}
          <section>
            <h3 className="text-md font-bold mb-4">New Members</h3>
            <ul className="flex flex-col gap-4">
              <li className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded transition-colors">
                <div className={`h-8 w-8 rounded-full ${darkMode ? "bg-white/20" : "bg-gray-200"} flex items-center justify-center`}>
                  <span>AC</span>
                </div>
                <p className="text-sm">Anne Couture</p>
              </li>
              <li className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded transition-colors">
                <div className={`h-8 w-8 rounded-full ${darkMode ? "bg-white/20" : "bg-gray-200"} flex items-center justify-center`}>
                  <span>MS</span>
                </div>
                <p className="text-sm">Miriam Sol</p>
              </li>
              <li className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded transition-colors">
                <div className={`h-8 w-8 rounded-full ${darkMode ? "bg-white/20" : "bg-gray-200"} flex items-center justify-center`}>
                  <span>LM</span>
                </div>
                <p className="text-sm">Lea Mavi</p>
              </li>
              <li className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded transition-colors">
                <div className={`h-8 w-8 rounded-full ${darkMode ? "bg-white/20" : "bg-gray-200"} flex items-center justify-center`}>
                  <span>MM</span>
                </div>
                <p className="text-sm">Mark Morin</p>
              </li>
            </ul>
          </section>
          <div className="mt-auto">
            <hr className={`${darkMode ? "border-white/10" : "border-gray-200"} my-6`} />
            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>© 2025 ShadowSight</p>
          </div>
        </aside>
      </body>
    </html>
  );
}
