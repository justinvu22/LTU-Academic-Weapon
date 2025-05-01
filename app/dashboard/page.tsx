"use client";

import { useState, useRef } from "react";
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
import { FaFilePdf, FaFileExport, FaFilter } from "react-icons/fa";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

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

// Use a neon-pink / purple palette
const COLORS = ["#FF5EEC", "#E91E63", "#9C27B0", "#673AB7"];

// Filter options
const userOptions = [
  { value: "all", label: "All Users" },
  { value: "sophie", label: "Sophie Fortune" },
  { value: "anne", label: "Anne Couture" },
  { value: "miriam", label: "Miriam Sol" },
  { value: "lea", label: "Lea Mavi" },
  { value: "mark", label: "Mark Morin" },
];

const monthOptions = [
  { value: "all", label: "All Time" },
  { value: "jan", label: "January" },
  { value: "feb", label: "February" },
  { value: "mar", label: "March" },
  { value: "apr", label: "April" },
  { value: "may", label: "May" },
  { value: "jun", label: "June" },
];

const anomalyTypeOptions = [
  { value: "all", label: "All Types" },
  { value: "phishing", label: "Phishing" },
  { value: "malware", label: "Malware" },
  { value: "unauthorized", label: "Unauthorized Access" },
  { value: "data", label: "Data Exfiltration" },
];

export default function DashboardPage() {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState({
    user: "all",
    month: "all",
    anomalyType: "all"
  });

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      user: "all",
      month: "all",
      anomalyType: "all"
    });
  };

  const handleExport = () => {
    console.log("Export triggered...");
    // Implement your export logic here
  };

  const exportToPDF = async () => {
    if (dashboardRef.current) {
      const canvas = await html2canvas(dashboardRef.current);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('shadow-sight-dashboard.pdf');
    }
  };

  return (
    <div className="p-4 text-white min-h-screen" ref={dashboardRef}>
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

      {/* Filter Section */}
      <div className="bg-[#191138] rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FaFilter className="text-pink-400" />
            <h3 className="text-lg font-bold">Filters</h3>
          </div>
          <button
            onClick={handleResetFilters}
            className="text-sm text-pink-400 hover:text-pink-300 transition-colors duration-200"
          >
            Reset Filters
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="userFilter" className="block text-sm font-medium mb-2">User</label>
            <select
              id="userFilter"
              value={filters.user}
              onChange={(e) => handleFilterChange("user", e.target.value)}
              className="w-full bg-[#24243e] text-white border border-white/10 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              {userOptions.map(option => (
                <option key={option.value} value={option.value} className="bg-[#24243e] text-white">
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="monthFilter" className="block text-sm font-medium mb-2">Month</label>
            <select
              id="monthFilter"
              value={filters.month}
              onChange={(e) => handleFilterChange("month", e.target.value)}
              className="w-full bg-[#24243e] text-white border border-white/10 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              {monthOptions.map(option => (
                <option key={option.value} value={option.value} className="bg-[#24243e] text-white">
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="anomalyTypeFilter" className="block text-sm font-medium mb-2">Anomaly Type</label>
            <select
              id="anomalyTypeFilter"
              value={filters.anomalyType}
              onChange={(e) => handleFilterChange("anomalyType", e.target.value)}
              className="w-full bg-[#24243e] text-white border border-white/10 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              {anomalyTypeOptions.map(option => (
                <option key={option.value} value={option.value} className="bg-[#24243e] text-white">
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* MIDDLE ROW: Two Charts */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Anomaly Type Breakdown (Pie) */}
        <div className="bg-[#191138] rounded-lg p-4">
          <h3 className="text-md font-bold mb-2">Anomaly Type Breakdown</h3>
          <ResponsiveContainer width="100%" height={250}>
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
          <ResponsiveContainer width="100%" height={250}>
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
        {/* Detected Anomalies Section */}
        <div className="bg-[#191138] rounded-lg p-4">
          <h3 className="text-md font-bold mb-2">Detected Anomalies</h3>
          <ResponsiveContainer width="100%" height={250}>
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
          <ResponsiveContainer width="100%" height={250}>
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

      {/* Export Button Section */}
      <div className="flex flex-row gap-4 mt-6">
        <button
          onClick={handleExport}
          className="bg-pink-600 hover:bg-pink-700 px-4 py-2 rounded flex items-center gap-2 transition-colors duration-200"
        >
          <FaFileExport />
          <span>Export Report</span>
        </button>
        <button
          onClick={exportToPDF}
          className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded flex items-center gap-2 transition-colors duration-200"
        >
          <FaFilePdf />
          <span>Export PDF</span>
        </button>
      </div>
    </div>
  );
}
