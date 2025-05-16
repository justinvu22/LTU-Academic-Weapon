// app/layout.tsx

"use client";

import PageTransition from "../UI_components/PageTransition";
import LeftSidebar from "../UI_components/LeftSidebar";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  FaUser,
  FaMoon,
  FaSun
} from "react-icons/fa";
import './input.css'
import { ActivityProvider, useActivityContext } from '../src/contexts/ActivityContext';

function LayoutWithSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activities } = useActivityContext();
  const highRiskCount = activities.filter(a => a.riskScore >= 70).slice(0, 5).length;

  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden bg-gray-100 text-gray-900 transition-colors duration-300">
        {/* LEFT SIDEBAR */}
        <LeftSidebar activeLink={pathname} alertCount={highRiskCount} />

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-auto transition-colors duration-300">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </body>
    </html>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode; }) {
  return (
    <ActivityProvider>
      <LayoutWithSidebar>{children}</LayoutWithSidebar>
    </ActivityProvider>
  );
}