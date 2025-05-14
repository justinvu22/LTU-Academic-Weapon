"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FaBell,
  FaChartLine,
  FaHome,
  FaRobot,
  FaUpload,
  FaInfoCircle,
  FaCog,
  FaExternalLinkAlt
} from 'react-icons/fa';

interface LeftSidebarProps {
  activeLink: string;
  onLinkClick: (path: string) => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ activeLink, onLinkClick }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div 
      className="relative h-full bg-[#1A1A40] text-white flex flex-col"
      onMouseEnter={() => setSidebarOpen(true)}
      onMouseLeave={() => setSidebarOpen(false)}
    >
      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-56' : 'w-16'}`}>
        {/* Logo Section */}
        <div className="p-4 flex items-center h-16 border-b border-white/10">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <img 
              src="/images/shadow-sight-icon.svg" 
              alt="Logo"
              className="w-6 h-6"
            />
          </div>
          {sidebarOpen && (
            <div className="ml-3 overflow-hidden whitespace-nowrap">
              <span className="font-semibold text-sm block">ShadowSight</span>
            </div>
          )}
        </div>
        
        {/* Main Navigation */}
        <nav className="py-2">
          <NavItem 
            path="/"
            icon={<FaHome className="text-xl" />}
            label="Home"
            isActive={activeLink === "/"}
            isOpen={sidebarOpen}
            onClick={onLinkClick}
          />
          
          <NavItem 
            path="/upload"
            icon={<FaUpload className="text-xl" />}
            label="Upload CSV"
            isActive={activeLink === "/upload"}
            isOpen={sidebarOpen}
            onClick={onLinkClick}
          />
          
          <NavItem 
            path="/dashboard"
            icon={<FaChartLine className="text-xl" />}
            label="Dashboard"
            isActive={activeLink === "/dashboard"}
            isOpen={sidebarOpen}
            onClick={onLinkClick}
          />
          
          <NavItem 
            path="/ml"
            icon={<FaRobot className="text-xl" />}
            label="ML Insights"
            isActive={activeLink === "/ml"}
            isOpen={sidebarOpen}
            onClick={onLinkClick}
          />
          
          <NavItem 
            path="/alerts"
            icon={<FaBell className="text-xl" />}
            label="Alerts"
            isActive={activeLink === "/alerts"}
            isOpen={sidebarOpen}
            onClick={onLinkClick}
          />
        </nav>
      </div>
      
      {/* Bottom Footer Links - Fixed at the very bottom */}
      <div className={`border-t border-white/10 transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-56' : 'w-16'}`}>
        <NavItem 
          path="/settings"
          icon={<FaCog className="text-xl" />}
          label="Settings"
          isActive={activeLink === "/settings"}
          isOpen={sidebarOpen}
          onClick={onLinkClick}
        />
        
        <NavItem 
          path="/help"
          icon={<FaInfoCircle className="text-xl" />}
          label="Help"
          isActive={activeLink === "/help"}
          isOpen={sidebarOpen}
          onClick={onLinkClick}
          hasExternalIcon={sidebarOpen}
        />
      </div>
    </div>
  );
};

// Helper component for navigation items
interface NavItemProps {
  path: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  isOpen: boolean;
  onClick: (path: string) => void;
  hasExternalIcon?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ 
  path, 
  icon, 
  label, 
  isActive = false, 
  isOpen, 
  onClick,
  hasExternalIcon = false 
}) => {
  return (
    <Link 
      href={path} 
      className={`flex items-center h-12 relative transition-all duration-200 px-2 my-1 rounded-lg group
        ${isActive ?
          "bg-gradient-to-r from-[#6f00ff33] to-[#ff00cc22] shadow-lg text-white scale-110 border-l-4 border-[#ff5eec]" :
          "text-gray-400 hover:text-white hover:bg-white/10"}
      `}
      onClick={() => onClick(path)}
    >
      {/* Neon accent bar for active item, always visible */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1.5 rounded-full bg-gradient-to-b from-[#6f00ff] to-[#ff00cc] shadow-[0_0_8px_2px_#ff00cc88] animate-pulse z-10"></span>
      )}
      <div className={`w-16 flex justify-center transition-all duration-200 ${isActive ? "text-[#ff5eec] scale-125 drop-shadow-[0_0_8px_#ff5eec]" : ""}`}>
        {icon}
      </div>
      {isOpen && (
        <div className={`flex items-center transition-all duration-200 ${isActive ? "font-bold text-white" : ""}`}>
          <span className="whitespace-nowrap">{label}</span>
          {hasExternalIcon && (
            <FaExternalLinkAlt className="ml-2 text-xs opacity-60" />
          )}
        </div>
      )}
    </Link>
  );
};

export default LeftSidebar; 