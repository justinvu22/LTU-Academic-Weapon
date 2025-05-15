"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import '@fontsource/poppins/600.css';
import {
  FaHome,
  FaDatabase,
  FaChartPie,
  FaRobot,
  FaBell,
  FaCog,
  FaQuestion,
  FaCloudUploadAlt,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
  FaUserCircle,
  FaSearch,
  FaUser
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
      path: "/profile/settings",
      name: "Profile",
      icon: <FaUser className="text-xl" />,
    },
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

  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");

  const filteredNavItems = navItems.filter(item => item.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <aside className={`left-sidebar transition-all duration-300 h-full flex flex-col font-['Poppins',sans-serif] ${collapsed ? 'w-20' : 'w-64'}
      bg-white/60 border-r border-gray-200 shadow-[0_0_24px_2px_rgba(80,0,120,0.10)] backdrop-blur-md relative`}
    >
      {/* Modern Header Section */}
      <div className="relative flex flex-col items-center justify-center">
        <div className={`flex items-center justify-center w-full ${collapsed ? 'p-2' : 'p-4'} bg-[#181c2f] rounded-xl m-3 mb-0 shadow-md`}>
          <div className="h-12 w-12 flex items-center justify-center rounded-xl border-2 border-cyan-400 bg-[#232846] overflow-hidden">
            <img
              src="/icon.png"
              alt="ShadowSight Icon"
              className="h-10 w-10 object-contain"
            />
          </div>
          {!collapsed && (
            <span className="ml-2 text-2xl font-extrabold tracking-widest text-[#232846] select-none" style={{fontFamily: 'Poppins, sans-serif'}}>ShadowSight</span>
          )}
        </div>
        {/* Chevron toggle vertically centered */}
        <button
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-[#232846] transition-colors z-10"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <FaAngleDoubleRight className="text-lg text-cyan-400" /> : <FaAngleDoubleLeft className="text-lg text-cyan-400" />}
        </button>
      </div>
      {/* Main Navigation */}
      <nav className={`flex-1 ${collapsed ? 'px-0' : 'px-4'} py-4 overflow-y-auto`}> 
        <div className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`group flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-3 rounded-md text-base font-semibold transition-all duration-200 tracking-wide
                ${activeLink === item.path
                  ? 'bg-purple-100 text-purple-900 font-extrabold shadow-lg border-l-4 border-l-purple-400'
                  : 'hover:bg-purple-200 hover:text-pink-600 text-purple-700 bg-transparent hover:scale-[1.03] hover:shadow-md'}
              `}
              style={{ fontFamily: 'Poppins, sans-serif' }}
              onClick={() => onLinkClick(item.path)}
              title={collapsed ? item.name : undefined}
            >
              <span className={`text-xl ${activeLink === item.path ? 'text-pink-600' : 'group-hover:text-pink-600 text-purple-400'}`}>{item.icon}</span>
              {!collapsed && <span>{item.name}</span>}
              {item.path === "/alerts" && !collapsed && (
                <span className="sidebar-alert-badge ml-auto px-2 py-0.5 text-xs rounded-full">9+</span>
              )}
            </Link>
          ))}
        </div>
        {/* Add spacing between Alerts and Recent Activity */}
        {!collapsed && <div className="h-24" />}
      </nav>
      {/* Utility Navigation */}
      <div className={`mt-auto ${collapsed ? 'p-2' : 'p-4'} border-t border-t-gray-200 bg-transparent`}> 
        <nav>
          <div className="flex flex-col gap-1">
            {utilNavItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`group flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-md text-base font-semibold transition-all duration-200 tracking-wide
                  ${activeLink === item.path
                    ? 'bg-purple-100 text-purple-900 font-extrabold border-l-4 border-l-purple-400'
                    : 'hover:bg-purple-200 hover:text-pink-600 text-purple-700 bg-transparent hover:scale-[1.03] hover:shadow-md'}
                `}
                onClick={() => onLinkClick(item.path)}
                title={collapsed ? item.name : undefined}
                style={{fontFamily: 'Poppins, sans-serif'}}
              >
                <span className={`text-xl ${activeLink === item.path ? 'text-pink-600' : 'group-hover:text-pink-600 text-purple-400'}`}>{item.icon}</span>
                {!collapsed && <span>{item.name}</span>}
              </Link>
            ))}
          </div>
        </nav>
        {!collapsed && (
          <div className="mt-4 px-2 py-1 text-xs text-purple-400 font-light tracking-wide" style={{fontFamily: 'Poppins, sans-serif'}}>
            © 2025 ShadowSight Dashboard
          </div>
        )}
      </div>
    </aside>
  );
};

export default LeftSidebar; 