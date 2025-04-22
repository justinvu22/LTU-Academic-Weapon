"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

// Example data arrays
const anomalyTypeData = [
  { name: "Phishing", value: 20 },
  { name: "Malware", value: 15 },
  { name: "Unauthorized Access", value: 25 },
  { name: "Data Exfiltration", value: 40 },
];

const userLoginTrendData = [
  { date: "Jan", logins: 40 },
  { date: "Feb", logins: 65 },
  { date: "Mar", logins: 80 },
  { date: "Apr", logins: 55 },
  { date: "May", logins: 90 },
  { date: "Jun", logins: 70 },
];

const detectedAnomaliesData = [
  { name: "Wk1", anomalies: 8 },
  { name: "Wk2", anomalies: 12 },
  { name: "Wk3", anomalies: 9 },
  { name: "Wk4", anomalies: 15 },
];

const riskLevelsData = [
  { name: "Burm1", low: 40, med: 20, high: 10, critical: 5 },
  { name: "Burm2", low: 30, med: 25, high: 15, critical: 10 },
  { name: "Burm3", low: 20, med: 30, high: 25, critical: 15 },
  { name: "Burm4", low: 25, med: 20, high: 20, critical: 10 },
];

// Popup chart data
const userOverviewData1 = [
  { name: "Q1", uv: 400, pv: 240 },
  { name: "Q2", uv: 600, pv: 139 },
  { name: "Q3", uv: 800, pv: 980 },
  { name: "Q4", uv: 650, pv: 390 },
];
const userOverviewData2 = [
  { name: "Burm1", uv: 300, pv: 200 },
  { name: "Burm2", uv: 400, pv: 300 },
  { name: "Burm3", uv: 600, pv: 480 },
  { name: "Burm4", uv: 550, pv: 380 },
];

// Use a neon-pink / purple palette
const COLORS = ["#FF5EEC", "#E91E63", "#9C27B0", "#673AB7"];

export default function DashboardPage() {
  const [showPopup, setShowPopup] = useState(false);

  // Toggle popup function
  const handleShowPopup = () => {
    setShowPopup(true);
  };
  const handleClosePopup = () => {
    setShowPopup(false);
  };

  return (
    <div className="p-4 text-white min-h-screen">
      {/* TOP ROW: Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#191138] rounded-lg p-4 flex flex-col justify-center items-center">
          <h3 className="text-lg font-bold mb-2">Detected Anomalies</h3>
          <p className="text-2xl font-extrabold text-pink-400">23</p>
        </div>
        <div className="bg-[#191138] rounded-lg p-4 flex flex-col justify-center items-center">
          <h3 className="text-lg font-bold mb-2">Users Flagged as Risky</h3>
          <p className="text-2xl font-extrabold text-pink-400">5</p>
        </div>
        <div className="bg-[#191138] rounded-lg p-4 flex flex-col justify-center items-center">
          <h3 className="text-lg font-bold mb-2">High Risk Events</h3>
          <p className="text-2xl font-extrabold text-pink-400">3</p>
        </div>
      </div>

      {/* MIDDLE ROW: Two Charts */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Anomaly Type Breakdown (Pie) */}
        <div className="bg-[#191138] rounded-lg p-4">
          <h3 className="text-md font-bold mb-2">Anomaly Type Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                dataKey="value"
                data={anomalyTypeData}
                innerRadius={50}
                outerRadius={80}
              >
                {anomalyTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* User Login Trend (Line) */}
        <div className="bg-[#191138] rounded-lg p-4">
          <h3 className="text-md font-bold mb-2">User Login Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={userLoginTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#888" />
              <XAxis dataKey="date" stroke="#ccc" />
              <YAxis stroke="#ccc" />
              <Tooltip />
              <Line type="monotone" dataKey="logins" stroke="#FF5EEC" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* BOTTOM ROW: Two Charts */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Detected Anomalies (Bar) */}
        <div className="bg-[#191138] rounded-lg p-4">
          <h3 className="text-md font-bold mb-2">Detected Anomalies</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={detectedAnomaliesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#888" />
              <XAxis dataKey="name" stroke="#ccc" />
              <YAxis stroke="#ccc" />
              <Tooltip />
              <Bar dataKey="anomalies" fill="#FF5EEC" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Levels by Time (Area) */}
        <div className="bg-[#191138] rounded-lg p-4">
          <h3 className="text-md font-bold mb-2">Risk Levels by Time</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={riskLevelsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#888" />
              <XAxis dataKey="name" stroke="#ccc" />
              <YAxis stroke="#ccc" />
              <Tooltip />
              <Area type="monotone" dataKey="low" stackId="1" stroke="#7CFC00" fill="#7CFC00" />
              <Area type="monotone" dataKey="med" stackId="1" stroke="#FFFF00" fill="#FFFF00" />
              <Area type="monotone" dataKey="high" stackId="1" stroke="#FF8C00" fill="#FF8C00" />
              <Area type="monotone" dataKey="critical" stackId="1" stroke="#FF0080" fill="#FF0080" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* EXTRA SECTION: "User Overview" or "Policy Breach" Card */}
      <div className="flex flex-col gap-4">
        <button
          onClick={handleShowPopup}
          className="bg-pink-600 hover:bg-pink-700 px-4 py-2 rounded transition-colors duration-200 w-60 text-center"
        >
          View Detailed User Overview
        </button>
      </div>

      {/* Popup Modal */}
      <AnimatePresence>
        {showPopup && (
          <motion.div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Content of the popup */}
            <motion.div
              className="bg-[#2E1452] border border-pink-400 rounded-lg p-6 w-[600px] relative"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
            >
              <button
                onClick={handleClosePopup}
                className="absolute top-2 right-2 text-white hover:text-pink-400"
              >
                ✕
              </button>
              <h2 className="text-xl font-bold mb-4 text-pink-300">User Overview</h2>

              <div className="grid grid-cols-2 gap-4">
                {/* Example line chart #1 */}
                <div className="bg-[#191138] p-4 rounded-md">
                  <h3 className="text-md font-semibold mb-2 text-pink-400">Unusual Risk Score</h3>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart
                      data={userOverviewData1}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <XAxis dataKey="name" stroke="#ccc" />
                      <YAxis stroke="#ccc" />
                      <Tooltip />
                      <Line type="monotone" dataKey="uv" stroke="#FF5EEC" strokeWidth={2} />
                      <Line type="monotone" dataKey="pv" stroke="#A020F0" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="mt-2 text-sm">
                    <p>
                      Unusual Risk Score: <span className="font-bold">2500</span> (
                      <span className="text-pink-300">+200%</span>)
                    </p>
                    <p>
                      Confidence: <span className="font-bold text-pink-300">90%</span>
                    </p>
                  </div>
                </div>

                {/* Example line chart #2 */}
                <div className="bg-[#191138] p-4 rounded-md">
                  <h3 className="text-md font-semibold mb-2 text-pink-400">Unusual Combined Risk</h3>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart
                      data={userOverviewData2}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <XAxis dataKey="name" stroke="#ccc" />
                      <YAxis stroke="#ccc" />
                      <Tooltip />
                      <Line type="monotone" dataKey="uv" stroke="#FF5EEC" strokeWidth={2} />
                      <Line type="monotone" dataKey="pv" stroke="#A020F0" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="mt-2 text-sm">
                    <p>
                      Combined Risk: <span className="font-bold">12500</span> (
                      <span className="text-pink-300">+125%</span>)
                    </p>
                    <p>
                      Confidence: <span className="font-bold text-pink-300">90%</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Example "Policy Breach" notice */}
              <div className="bg-[#191138] p-4 rounded-md mt-6 flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-pink-600 flex items-center justify-center text-white">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="30"
                    height="30"
                    fill="currentColor"
                    className="bi bi-exclamation-octagon"
                    viewBox="0 0 16 16"
                  >
                    <path d="M11.46.146A.5.5 0 0 1 11.793.293l3.914 3.914a.5.5 0 0 1 .147.338v5.91a.5.5 0 0 1-.147.338l-3.914 3.914a.5.5 0 0 1-.338.147h-5.91a.5.5 0 0 1-.338-.147L.293 10.793a.5.5 0 0 1-.147-.338v-5.91a.5.5 0 0 1 .147-.338L4.207.293A.5.5 0 0 1 4.545.146h5.91ZM11 4a.5.5 0 0 0-1 0v3a.5.5 0 1 0 1 0V4Zm-1 7.995a1.005 1.005 0 1 0 2.01 0 1.005 1.005 0 0 0-2.01 0Z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-pink-300 mb-1">Policy Breach: Data Leakage</h4>
                  <p className="text-sm text-gray-300">
                    UBR: 95.7% &mdash; Anomaly Score: 8.19 <br />
                    Status: <span className="text-pink-300 font-semibold">UnderReview</span>
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
