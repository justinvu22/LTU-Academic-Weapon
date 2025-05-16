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
  IoChevronBackOutline,
  IoChevronForwardOutline
} from "react-icons/io5";

interface LeftSidebarProps {
  activeLink: string;
  alertCount?: number;
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
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

const LeftSidebar: React.FC<LeftSidebarProps> = ({ activeLink, alertCount = 0, collapsed, setCollapsed }) => {
  return (
    <aside
      className={`
        left-sidebar fixed top-0 left-0 h-screen ${collapsed ? 'w-20' : 'w-64'} flex flex-col font-['Poppins',sans-serif] z-40
        bg-gradient-to-b from-[#10142a] via-[#232846] to-[#7928CA]
        shadow-[0_8px_32px_#0f153acc,inset_0_4px_16px_#232846ee]
        border-r-0
        transition-all duration-300
        overflow-hidden
        rounded-tr-3xl rounded-br-3xl
      `}
    >
      <div className={`flex flex-col flex-1`}>
        <div className={`flex flex-col items-center justify-center pt-6 pb-2 ${collapsed ? 'px-2' : 'px-4'}`}>
          <div className={`flex items-center w-full bg-gradient-to-r from-[#181c2f] via-[#232846] to-[#181c2f] rounded-2xl mb-2 shadow-[0_4px_16px_#181c2fcc,inset_0_2px_8px_#232846ee] border border-[#232846]/40 ${collapsed ? 'p-1 justify-center' : 'p-3'}`}>
            <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-sidebar-dark shadow-[0_4px_16px_#232846cc,inset_0_2px_8px_#181c2fcc] border border-[#232846]/40 overflow-hidden">
              <img src="/icon.png" alt="ShadowSight Icon" className="h-12 w-12 object-contain" />
            </div>
            {!collapsed && (
              <span className="ml-3 text-2xl font-extrabold tracking-widest text-white drop-shadow select-none font-poppins">
                ShadowSight
              </span>
            )}
          </div>
          <button
            className="my-2 p-2 rounded-full bg-gradient-to-br from-[#232846] to-[#7928CA] shadow-[0_4px_16px_#7928ca99,inset_0_2px_8px_#232846ee] border border-[#232846]/40 hover:shadow-[0_8px_32px_#7928ca99,inset_0_4px_16px_#232846ee] hover:scale-110 transition-all duration-300 z-10 flex items-center justify-center"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <IoChevronForwardOutline className="text-2xl text-white transition-transform duration-300" />
            ) : (
              <IoChevronBackOutline className="text-2xl text-white transition-transform duration-300" />
            )}
          </button>
        </div>
        <nav className={`flex-1 ${collapsed ? 'px-0 py-2' : 'px-2 py-2'} overflow-y-auto scrollbar-thin scrollbar-thumb-purple-400/30 scrollbar-track-transparent`}>
          <div className={`flex flex-col ${collapsed ? 'gap-0' : 'gap-3'}`}>
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.path}
                className={`
                  group flex items-center ${collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-2'} rounded-full transition-all duration-200
                  ${activeLink === item.path
                    ? 'bg-[#7928CA] text-white shadow-[0_8px_32px_#7928ca99] border border-[#a084e8]/40'
                    : 'bg-[#181c2f]/60 text-gray-200 hover:text-white hover:bg-[#232846]/80 hover:shadow-[inset_0_4px_16px_#232846ee]'}
                  relative
                  font-medium
                  shadow-[inset_0_2px_8px_#232846ee]
                  backdrop-blur-[2px]
                  border border-[#232846]/20
                `}
              >
                <span className={`text-2xl font-bold transition-all duration-200 ${activeLink === item.path ? 'text-white' : 'text-purple-200 group-hover:text-white'}`}>{item.icon}</span>
                {!collapsed && <span className="truncate flex-1">{item.name}</span>}
                {item.name === 'Alerts' && alertCount && alertCount > 0 && !collapsed && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-br from-[#a084e8] to-[#7928CA] text-white shadow-[0_2px_8px_#7928ca80,inset_0_1px_4px_#a084e8cc] border border-[#a084e8]/40 backdrop-blur-[2px] animate-pulse ring-2 ring-[#a084e8]/40">
                    +{alertCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
          {!collapsed && (
            <>
              <div className="mx-2 my-6">
                <div className="h-[2px] bg-gradient-to-r from-transparent via-purple-400/40 to-transparent shadow-2xl" />
              </div>
              <div className="mt-2">
                <div className="text-xs uppercase tracking-widest text-purple-200/60 mb-2 mt-6 px-4 font-semibold shadow-[inset_0_2px_8px_#232846ee] border border-[#232846]/20">
                  Analysis Engine
                </div>
                <div className="flex flex-col gap-3">
                  {analysisEngineItems.map((item) => (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`
                        group flex items-center gap-3 px-4 py-2 rounded-full transition-all duration-200
                        ${activeLink === item.path
                          ? 'bg-[#7928CA] text-white shadow-[0_8px_32px_#7928ca99] border border-[#a084e8]/40'
                          : 'bg-[#181c2f]/60 text-gray-200 hover:text-white hover:bg-[#232846]/80 hover:shadow-[inset_0_4px_16px_#232846ee]'}
                        relative
                        font-medium
                        shadow-[inset_0_2px_8px_#232846ee]
                        backdrop-blur-[2px]
                        border border-[#232846]/20
                      `}
                    >
                      <span className={`text-2xl font-bold transition-all duration-200 ${activeLink === item.path ? 'text-white' : 'text-purple-200 group-hover:text-white'}`}>{item.icon}</span>
                      <span className="truncate flex-1">{item.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
          {collapsed && (
            <>
              <div className="my-6" />
              <div className="flex flex-col gap-0">
                {analysisEngineItems.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`
                      group flex items-center justify-center px-0 py-3 rounded-full transition-all duration-200
                      ${activeLink === item.path
                        ? 'bg-[#7928CA] text-white shadow-[0_8px_32px_#7928ca99] border border-[#a084e8]/40'
                        : 'bg-[#181c2f]/60 text-gray-200 hover:text-white hover:bg-[#232846]/80 hover:shadow-[inset_0_4px_16px_#232846ee]'}
                      relative
                      font-medium
                      shadow-[inset_0_2px_8px_#232846ee]
                      backdrop-blur-[2px]
                      border border-[#232846]/20
                    `}
                  >
                    <span className={`text-2xl font-bold transition-all duration-200 ${activeLink === item.path ? 'text-white' : 'text-purple-200 group-hover:text-white'}`}>{item.icon}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </nav>
        <div className={`mt-auto ${collapsed ? 'p-2' : 'p-4'} border-t border-t-gray-700 bg-transparent`}>
          <nav>
            <div className={`flex flex-col ${collapsed ? 'gap-0' : 'gap-3'}`}>
              {utilNavItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.path}
                  className={`
                    group flex items-center ${collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-2'} rounded-full transition-all duration-200
                    ${activeLink === item.path
                      ? 'bg-[#7928CA] text-white'
                      : 'text-gray-200 hover:text-white hover:bg-[#232846]/80'}
                    relative
                    font-medium
                  `}
                >
                  <span className={`text-2xl font-bold transition-all duration-200 ${activeLink === item.path ? 'text-white' : 'text-purple-200 group-hover:text-white'}`}>{item.icon}</span>
                  {!collapsed && <span className="truncate flex-1">{item.name}</span>}
                </Link>
              ))}
            </div>
          </nav>
          {!collapsed && (
            <div className="mt-4 px-2 py-1 text-xs text-purple-200/70 font-light tracking-wide font-poppins">
              © 2025 ShadowSight Dashboard
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default LeftSidebar;