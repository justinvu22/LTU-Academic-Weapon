"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FaHome,
  FaDatabase,
  FaChartPie,
  FaRobot,
  FaBell,
  FaCog,
  FaQuestion,
  FaCloudUploadAlt
} from "react-icons/fa";

interface LeftSidebarProps {
  activeLink: string;
  onLinkClick: (path: string) => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ activeLink, onLinkClick }) => {
  // Navigation items
  const navItems = [
    {
      path: "/",
      name: "Home",
      icon: <FaHome className="text-xl" />,
    },
    {
      path: "/upload",
      name: "Upload CSV",
      icon: <FaCloudUploadAlt className="text-xl" />,
    },
    {
      path: "/dashboard",
      name: "Dashboard",
      icon: <FaChartPie className="text-xl" />,
    },
    {
      path: "/ml",
      name: "ML Insights",
      icon: <FaRobot className="text-xl" />,
    },
    {
      path: "/alerts",
      name: "Alerts",
      icon: <FaBell className="text-xl" />,
    }
  ];

  // Utility navigation items
  const utilNavItems = [
    {
      path: "/settings",
      name: "Settings",
      icon: <FaCog className="text-xl" />,
    },
    {
      path: "/help",
      name: "Help",
      icon: <FaQuestion className="text-xl" />,
    },
  ];

  return (
    <aside className="w-64 h-full transition-colors duration-300 dark:bg-[#191138] bg-white border-r dark:border-r-[#2b254a] border-r-gray-200 flex flex-col">
      {/* App Logo */}
      <div className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 bg-gradient-to-tr from-purple-600 to-indigo-700 rounded-lg flex items-center justify-center">
          <FaDatabase className="text-white text-lg" />
        </div>
        <div>
          <h1 className="text-xl font-bold dark:text-white text-gray-900">ShadowSight</h1>
          <p className="text-xs dark:text-gray-400 text-gray-500">Security Insights</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="mt-6 px-3 flex-1">
        <div className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                activeLink === item.path
                  ? "bg-purple-600/10 text-purple-600 dark:text-purple-400 dark:bg-purple-400/10 font-medium"
                  : "hover:bg-gray-100 dark:hover:bg-white/5 dark:text-gray-300 text-gray-700"
              }`}
              onClick={() => onLinkClick(item.path)}
            >
              {item.icon}
              <span>{item.name}</span>
              {item.path === "/alerts" && (
                <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  9+
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* Account & Recent Activities */}
        <div className="mt-6">
          <h2 className="px-4 text-xs font-semibold uppercase dark:text-gray-400 text-gray-500 tracking-wider">
            Recent Activity
          </h2>
          <div className="mt-3 space-y-1">
            <button className="w-full text-left flex items-center gap-3 px-4 py-2 rounded-lg transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-white/5 dark:text-gray-300 text-gray-700">
              <div className="h-6 w-6 rounded-full bg-yellow-500/10 text-yellow-500 flex items-center justify-center">
                <FaBell className="text-xs" />
              </div>
              <div className="text-sm">
                <p className="truncate w-40">New alert triggered</p>
                <p className="dark:text-gray-500 text-gray-400 text-xs">10 minutes ago</p>
              </div>
            </button>
            <button className="w-full text-left flex items-center gap-3 px-4 py-2 rounded-lg transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-white/5 dark:text-gray-300 text-gray-700">
              <div className="h-6 w-6 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <FaDatabase className="text-xs" />
              </div>
              <div className="text-sm">
                <p className="truncate w-40">CSV data imported</p>
                <p className="dark:text-gray-500 text-gray-400 text-xs">23 minutes ago</p>
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* Utility Navigation */}
      <div className="mt-auto p-3">
        <nav>
          <div className="space-y-1">
            {utilNavItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                  activeLink === item.path
                    ? "bg-purple-600/10 text-purple-600 dark:text-purple-400 dark:bg-purple-400/10 font-medium"
                    : "hover:bg-gray-100 dark:hover:bg-white/5 dark:text-gray-300 text-gray-700"
                }`}
                onClick={() => onLinkClick(item.path)}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            ))}
          </div>
        </nav>
        <div className="border-t dark:border-t-white/10 border-t-gray-200 mt-4 pt-4">
          <div className="px-4 py-1 text-xs dark:text-gray-500 text-gray-400">
            © 2025 ShadowSight Dashboard
          </div>
        </div>
      </div>
    </aside>
  );
};

export default LeftSidebar; 