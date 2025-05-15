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

        {/* RIGHT SIDEBAR (optional, can be removed or styled for light mode) */}
        {/* Example user profile section for light mode */}
        <aside className="w-72 bg-white border-l border-gray-200 p-6 flex flex-col justify-between">
          {/* User Profile Section */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                {/* Placeholder initials or avatar */}
                <span className="text-sm">SF</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold">Sophie Fortune</h2>
                <p className="text-sm text-gray-500">@sophiefortune</p>
              </div>
            </div>
            <Link 
              href="/profile/settings" 
              className={`flex items-center gap-2 p-2 rounded hover:bg-gray-100 transition-colors ${activeLink === "/profile/settings" ? "bg-gray-100" : ""}`}
              onClick={() => handleLinkClick("/profile/settings")}
            >
              <FaUser className="text-lg" />
              <span>Profile Settings</span>
            </Link>
            <hr className="border-gray-200 my-6" />
            {/* New Members Section */}
            <h3 className="text-md font-bold mb-4">New Members</h3>
            <ul className="flex flex-col gap-2">
              <li className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-2 rounded transition-colors">
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <span>AC</span>
                </div>
                <p className="text-sm">Anne Couture</p>
              </li>
              <li className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-2 rounded transition-colors">
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <span>MS</span>
                </div>
                <p className="text-sm">Miriam Sol</p>
              </li>
              <li className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-2 rounded transition-colors">
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <span>LM</span>
                </div>
                <p className="text-sm">Lea Mavi</p>
              </li>
              <li className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-2 rounded transition-colors">
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <span>MM</span>
                </div>
                <p className="text-sm">Mark Morin</p>
              </li>
            </ul>
          </div>
          <div>
            <hr className="border-gray-200 my-6" />
            <p className="text-sm text-gray-400">© 2025 ShadowSight</p>
          </div>
        </aside>
      </body>
    </html>
  );
}