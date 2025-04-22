// app/layout.tsx

import "./output.css"; // Import the compiled Tailwind output
import Link from "next/link";
import { Metadata } from "next";
import {
  FaHome,
  FaUpload,
  FaChartLine,
  FaRobot,
  FaSearch,
} from "react-icons/fa";

export const metadata: Metadata = {
  title: "ShadowSight Dashboard",
  description: "ML-Powered Visual Analytics for User Activity Trends",
};

export default function RootLayout({ children }: { children: React.ReactNode; }) {
  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden">
        {/* LEFT SIDEBAR */}
        <aside className="w-64 bg-gradient-to-b from-[#2C2C54] to-[#24243e] text-white flex flex-col">
          {/* Header with Explore and Search */}
          <div className="p-4 flex items-center justify-between gap-2 border-b border-white/10">
            <h1 className="text-xl font-bold">Explore</h1>
            <button className="p-2 text-white/80 hover:text-white transition-colors duration-200">
              <FaSearch />
            </button>
          </div>
          {/* Navigation Links */}
          <nav className="flex-1 overflow-auto py-2">
            <Link href="/" className="flex items-center gap-2 px-4 py-3 hover:bg-white/5 transition-colors duration-200">
              <FaHome />
              <span>Home</span>
            </Link>
            <Link href="/upload" className="flex items-center gap-2 px-4 py-3 hover:bg-white/5 transition-colors duration-200">
              <FaUpload />
              <span>CSV Upload</span>
            </Link>
            <Link href="/dashboard" className="flex items-center gap-2 px-4 py-3 hover:bg-white/5 transition-colors duration-200">
              <FaChartLine />
              <span>Dashboard</span>
            </Link>
            <Link href="/ml" className="flex items-center gap-2 px-4 py-3 hover:bg-white/5 transition-colors duration-200">
              <FaRobot />
              <span>ML Insights</span>
            </Link>
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-auto bg-gradient-to-tr from-[#24243e] to-[#302b63] p-6 text-white">
          {children}
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="w-72 bg-[#1D1B2D] text-white flex flex-col p-4 border-l border-white/10">
          {/* User Profile Section */}
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
              {/* Placeholder initials or avatar */}
              <span className="text-sm">SF</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Sophie Fortune</h2>
              <p className="text-sm text-gray-300">@sophiefortune</p>
            </div>
          </div>
          <hr className="border-white/10 mb-6" />
          {/* New Members Section */}
          <section>
            <h3 className="text-md font-bold mb-4">New Members</h3>
            <ul className="flex flex-col gap-4">
              <li className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                  <span>AC</span>
                </div>
                <p className="text-sm">Anne Couture</p>
              </li>
              <li className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                  <span>MS</span>
                </div>
                <p className="text-sm">Miriam Sol</p>
              </li>
              <li className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                  <span>LM</span>
                </div>
                <p className="text-sm">Lea Mavi</p>
              </li>
              <li className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                  <span>MM</span>
                </div>
                <p className="text-sm">Mark Morin</p>
              </li>
            </ul>
          </section>
          <div className="mt-auto">
            <hr className="border-white/10 my-6" />
            <p className="text-sm text-gray-400">© 2025 ShadowSight</p>
          </div>
        </aside>
      </body>
    </html>
  );
}
