"use client";

import { useState, useRef, useEffect } from "react";
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
import { FaFilePdf, FaFileExport, FaFilter, FaSync, FaChartLine } from "react-icons/fa";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

// Import from our integration layer
import { 
  getRiskDistribution, 
  getPolicyBreachDistribution, 
  getUserActivityByDay, 
  getTimelineData 
} from '@/src/functions/analytics/integrations';

// Advanced analytics data structures
interface PolicyBreach {
  dataLeakage?: string[];
  pii?: string[];
  phi?: string[];
  pci?: string[];
  financial?: string[];
  sensitive?: string[];
  userAtRisk?: string[];
  fraud?: string[];
}

// Export this interface so it can be used in the integrations
export interface TimelineDataPoint {
  date: string;
  low: number;
  medium: number;
  high: number;
  critical: number;
  total: number;
}

// Risk and distribution colors
const RISK_COLORS = ['#4caf50', '#2196f3', '#ff9800', '#f44336']; // low, medium, high, critical
const COLORS = ["#FF5EEC", "#E91E63", "#9C27B0", "#673AB7"];

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
  
  // States for advanced analytics
  const [timeFilter, setTimeFilter] = useState("30");
  const [activeTab, setActiveTab] = useState("overview");
  
  // Use the data from our integration layer
  const [riskDistribution, setRiskDistribution] = useState(getRiskDistribution());
  const [policyBreachData, setPolicyBreachData] = useState(getPolicyBreachDistribution());
  const [userActivityByDay, setUserActivityByDay] = useState(getUserActivityByDay());
  const [timelineData, setTimelineData] = useState<TimelineDataPoint[]>(getTimelineData());

  // Refresh data when tab changes
  useEffect(() => {
    if (activeTab === 'advanced') {
      setRiskDistribution(getRiskDistribution());
      setPolicyBreachData(getPolicyBreachDistribution());
      setTimelineData(getTimelineData(parseInt(timeFilter)));
    } else if (activeTab === 'users') {
      setUserActivityByDay(getUserActivityByDay());
    }
  }, [activeTab, timeFilter]);

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
  
  // Format date for timeline
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
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

      {/* Dashboard Tabs */}
      <div className="flex space-x-2 mb-6">
        <button 
          className={`px-4 py-2 rounded-md ${activeTab === 'overview' ? 'bg-pink-600 text-white' : 'bg-[#191138] text-gray-300 hover:bg-pink-700/30'}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`px-4 py-2 rounded-md ${activeTab === 'advanced' ? 'bg-pink-600 text-white' : 'bg-[#191138] text-gray-300 hover:bg-pink-700/30'}`}
          onClick={() => setActiveTab('advanced')}
        >
          Advanced Analytics
        </button>
        <button 
          className={`px-4 py-2 rounded-md ${activeTab === 'users' ? 'bg-pink-600 text-white' : 'bg-[#191138] text-gray-300 hover:bg-pink-700/30'}`}
          onClick={() => setActiveTab('users')}
        >
          User Activity
        </button>
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

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <>
          {/* MIDDLE ROW: Two Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
        </>
      )}

      {/* ADVANCED ANALYTICS TAB - From Functions Project */}
      {activeTab === 'advanced' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Risk Distribution */}
            <div className="bg-[#191138] rounded-lg p-4">
              <h3 className="text-md font-bold mb-2">Risk Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    dataKey="value"
                    data={riskDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    label={({ name, percent }) => 
                      percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                  >
                    {riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Activities']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Policy Breach Distribution */}
            <div className="bg-[#191138] rounded-lg p-4">
              <h3 className="text-md font-bold mb-2">Policy Breach Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    dataKey="value"
                    data={policyBreachData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    label={({ name, percent }) => 
                      percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                  >
                    {policyBreachData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Breaches']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-[#191138] rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-bold">Activity Timeline</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-400">Time Range:</span>
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="bg-[#24243e] text-white border border-white/10 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="7">Last 7 Days</option>
                  <option value="14">Last 14 Days</option>
                  <option value="30">Last 30 Days</option>
                </select>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={timelineData.slice(-parseInt(timeFilter))}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#888" />
                <XAxis dataKey="date" tickFormatter={formatDate} stroke="#ccc" />
                <YAxis stroke="#ccc" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="critical" name="Critical Risk" stroke="#f44336" strokeWidth={2} dot={{ r: 1 }} />
                <Line type="monotone" dataKey="high" name="High Risk" stroke="#ff9800" strokeWidth={2} dot={{ r: 1 }} />
                <Line type="monotone" dataKey="medium" name="Medium Risk" stroke="#2196f3" strokeWidth={2} dot={{ r: 1 }} />
                <Line type="monotone" dataKey="low" name="Low Risk" stroke="#4caf50" strokeWidth={2} dot={{ r: 1 }} />
                <Line type="monotone" dataKey="total" name="Total Activities" stroke="#9e9e9e" strokeWidth={3} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* USER ACTIVITY TAB - From Functions Project */}
      {activeTab === 'users' && (
        <div className="bg-[#191138] rounded-lg p-4 mb-6">
          <h3 className="text-md font-bold mb-4">User Activity by Day of Week</h3>
          <div className="overflow-auto">
            <div className="min-w-full h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={userActivityByDay}
                  margin={{ top: 20, right: 30, left: 150, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="user" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="monday" name="Monday" stackId="a" fill="#e57373" />
                  <Bar dataKey="tuesday" name="Tuesday" stackId="a" fill="#81c784" />
                  <Bar dataKey="wednesday" name="Wednesday" stackId="a" fill="#64b5f6" />
                  <Bar dataKey="thursday" name="Thursday" stackId="a" fill="#ffd54f" />
                  <Bar dataKey="friday" name="Friday" stackId="a" fill="#9575cd" />
                  <Bar dataKey="saturday" name="Saturday" stackId="a" fill="#4db6ac" />
                  <Bar dataKey="sunday" name="Sunday" stackId="a" fill="#f06292" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

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