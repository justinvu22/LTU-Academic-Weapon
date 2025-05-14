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
              <span className="text-xs text-gray-400 block">Dashboard</span>
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
      className={`flex items-center h-12 ${isActive ? "text-white" : "text-gray-400 hover:text-white"}`}
      onClick={() => onClick(path)}
    >
      <div className="w-16 flex justify-center">
        {icon}
      </div>
      {isOpen && (
        <div className="flex items-center">
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