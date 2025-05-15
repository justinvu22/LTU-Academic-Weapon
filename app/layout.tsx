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
  const [activeLink, setActiveLink] = useState("/");

  const handleLinkClick = (path: string) => {
    setActiveLink(path);
  };

  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden bg-gray-100 text-gray-900 transition-colors duration-300">
        {/* LEFT SIDEBAR */}
        <LeftSidebar activeLink={activeLink} onLinkClick={handleLinkClick} />

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-auto bg-white p-6 transition-colors duration-300">
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
          </div>
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </body>
    </html>
  );
}