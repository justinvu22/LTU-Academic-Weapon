"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import '@fontsource/poppins/600.css';
import {
  IoHomeOutline,
  IoCloudUploadOutline,
  IoPieChartOutline,
  IoGitNetworkOutline,
  IoNotificationsOutline,
  IoConstructOutline,
  IoDocumentsOutline,
  IoPersonOutline,
  IoSettingsOutline,
  IoHelpCircleOutline,
  IoMenuOutline,
  IoCloseOutline
} from "react-icons/io5";

interface LeftSidebarProps {
  activeLink: string;
  alertCount?: number;
}

const navItems = [
  { path: "/", name: "Home", icon: <IoHomeOutline className="text-2xl font-bold" /> },
  { path: "/upload", name: "Upload CSV", icon: <IoCloudUploadOutline className="text-2xl font-bold" /> },
  { path: "/dashboard", name: "Dashboard", icon: <IoPieChartOutline className="text-2xl font-bold" /> },
  { path: "/ml", name: "Insights", icon: <IoGitNetworkOutline className="text-2xl font-bold" /> },
  { path: "/alerts", name: "Alerts", icon: <IoNotificationsOutline className="text-2xl font-bold" /> }
];

const analysisEngineItems = [
  { path: "/custom-alerts", name: "Custom Alerts", icon: <IoConstructOutline className="text-2xl font-bold" /> },
  { path: "/trusted-activities", name: "Trusted Activities", icon: <IoDocumentsOutline className="text-2xl font-bold" /> }
];

const utilNavItems = [
  { path: "/profile/settings", name: "Profile", icon: <IoPersonOutline className="text-2xl font-bold" /> },
  { path: "/settings", name: "Settings", icon: <IoSettingsOutline className="text-2xl font-bold" /> },
  { path: "/help", name: "Help", icon: <IoHelpCircleOutline className="text-2xl font-bold" /> }
];

const LeftSidebar: React.FC<LeftSidebarProps> = ({ activeLink, alertCount = 0 }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`
        left-sidebar transition-all duration-300 h-full flex flex-col font-['Poppins',sans-serif] ${collapsed ? 'w-20' : 'w-64'}
        bg-gradient-to-b from-sidebar-dark via-sidebar-darker to-sidebar-dark
        backdrop-blur-2xl border-r-4 border-white/40 shadow-2xl
        relative
      `}
    >
      <div className="flex flex-col items-center justify-center">
        <div className={`flex items-center justify-center w-full ${collapsed ? 'p-2' : 'p-4'} bg-gradient-to-r from-sidebar-dark via-sidebar-darker to-sidebar-dark rounded-xl m-3 mb-0 shadow-2xl`}>
          <div className="h-16 w-16 flex items-center justify-center rounded-xl bg-sidebar-dark overflow-hidden">
            <img src="/icon.png" alt="ShadowSight Icon" className="h-16 w-16 object-contain -my-1" />
          </div>
          {!collapsed && (
            <span className="ml-2 text-2xl font-extrabold tracking-widest text-gray-100 drop-shadow select-none" style={{ fontFamily: 'Poppins, sans-serif' }}>
              ShadowSight
            </span>
          )}
        </div>
        <button
          className="my-2 p-2 rounded-full hover:bg-gradient-to-r from-purple-500/30 to-pink-500/30 transition-all duration-300 z-10 hover:scale-110 hover:shadow-2xl hover:shadow-purple-500/20"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <IoMenuOutline className="text-2xl font-bold text-cyan-400 drop-shadow-lg" /> : <IoCloseOutline className="text-2xl font-bold text-cyan-400 drop-shadow-lg" />}
        </button>
      </div>
      <nav className={`flex-1 ${collapsed ? 'px-0' : 'px-4'} py-4 overflow-y-auto`}>
        <div className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.path}
              className={`
                flex items-center gap-3 px-4 py-2 rounded-lg transition
                ${activeLink === item.path
                  ? 'bg-purple-900/60 text-purple-400 font-semibold'
                  : 'text-gray-100 hover:text-purple-400 hover:bg-purple-900/40'}
                ${collapsed ? 'justify-center px-0' : ''}
              `}
            >
              <span className={`text-2xl font-bold ${activeLink === item.path ? 'text-purple-400' : 'text-gray-100 group-hover:text-purple-400'}`}>
                {item.icon}
              </span>
              {!collapsed && <span className="truncate">{item.name}</span>}
              {!collapsed && item.name === 'Alerts' && alertCount && alertCount > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-600 text-white shadow-md">
                  +{alertCount}
                </span>
              )}
            </Link>
          ))}
        </div>
        <div className={`${collapsed ? 'mx-2' : 'mx-4'} my-6`}>
          <div className="h-[2px] bg-gradient-to-r from-transparent via-purple-400/80 to-transparent shadow-2xl" />
        </div>
        <div className="mt-2">
          {!collapsed && (
            <div className="text-xs uppercase tracking-widest text-purple-300 mb-2 mt-6 px-4">
              Analysis Engine
            </div>
          )}
          <div className="flex flex-col gap-1">
            {analysisEngineItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`
                  flex items-center gap-3 px-4 py-2 rounded-lg transition
                  ${activeLink === item.path
                    ? 'bg-purple-900/60 text-purple-400 font-semibold'
                    : 'text-gray-100 hover:text-purple-400 hover:bg-purple-900/40'}
                  ${collapsed ? 'justify-center px-0' : ''}
                `}
              >
                <span className={`text-2xl font-bold ${activeLink === item.path ? 'text-purple-400' : 'text-gray-100 group-hover:text-purple-400'}`}>
                  {item.icon}
                </span>
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Link>
            ))}
          </div>
        </div>
      </nav>
      <div className={`mt-auto ${collapsed ? 'p-2' : 'p-4'} border-t border-t-gray-200 bg-transparent`}>
        <nav>
          <div className="flex flex-col gap-1">
            {utilNavItems.map((item) => (
              <Link
                key={item.name}
                href={item.path}
                className={`
                  flex items-center gap-3 px-4 py-2 rounded-lg transition
                  ${activeLink === item.path
                    ? 'bg-purple-900/60 text-purple-400 font-semibold'
                    : 'text-gray-100 hover:text-purple-400 hover:bg-purple-900/40'}
                  ${collapsed ? 'justify-center px-0' : ''}
                `}
              >
                <span className={`text-2xl font-bold ${activeLink === item.path ? 'text-purple-400' : 'text-gray-100 group-hover:text-purple-400'}`}>
                  {item.icon}
                </span>
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Link>
            ))}
          </div>
        </nav>
        {!collapsed && (
          <div className="mt-4 px-2 py-1 text-xs text-purple-400 font-light tracking-wide" style={{ fontFamily: 'Poppins, sans-serif' }}>
            © 2025 ShadowSight Dashboard
          </div>
        )}
      </div>
    </aside>
  );
};

export default LeftSidebar; 