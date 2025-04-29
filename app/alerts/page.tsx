"use client";

import { useState } from "react";
import { FaBell, FaTrash, FaPlus, FaEdit, FaSave, FaTimes } from "react-icons/fa";

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  enabled: boolean;
  severity: "low" | "medium" | "high" | "critical";
  notifyVia: string[];
}

export default function CustomAlertsPage() {
  const [alertRules, setAlertRules] = useState<AlertRule[]>([
    {
      id: "1",
      name: "High Login Attempts",
      condition: "login_attempts > threshold in 5 minutes",
      threshold: 5,
      enabled: true,
      severity: "medium",
      notifyVia: ["email", "dashboard"]
    },
    {
      id: "2",
      name: "Critical Data Access",
      condition: "sensitive_data_access = true",
      threshold: 0,
      enabled: true,
      severity: "critical",
      notifyVia: ["email", "sms", "dashboard"]
    },
    {
      id: "3",
      name: "Unusual Time Access",
      condition: "access_time outside normal_hours",
      threshold: 0,
      enabled: false,
      severity: "low",
      notifyVia: ["dashboard"]
    }
  ]);
  
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [showNewRuleForm, setShowNewRuleForm] = useState(false);
  
  const [newRule, setNewRule] = useState<Omit<AlertRule, "id">>({
    name: "",
    condition: "",
    threshold: 0,
    enabled: true,
    severity: "medium",
    notifyVia: ["dashboard"]
  });
  
  const handleToggleRule = (id: string) => {
    setAlertRules(prev => 
      prev.map(rule => 
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
      )
    );
  };
  
  const handleDeleteRule = (id: string) => {
    setAlertRules(prev => prev.filter(rule => rule.id !== id));
  };
  
  const handleEditRule = (rule: AlertRule) => {
    setEditingRule(rule);
    setShowNewRuleForm(false);
  };
  
  const handleSaveEdit = () => {
    if (editingRule) {
      setAlertRules(prev => 
        prev.map(rule => 
          rule.id === editingRule.id ? editingRule : rule
        )
      );
      setEditingRule(null);
    }
  };
  
  const handleNewRuleChange = (field: keyof Omit<AlertRule, "id">, value: any) => {
    setNewRule(prev => ({ ...prev, [field]: value }));
  };
  
  const handleEditRuleChange = (field: keyof AlertRule, value: any) => {
    if (editingRule) {
      setEditingRule({ ...editingRule, [field]: value });
    }
  };
  
  const handleSaveNewRule = () => {
    const newId = Math.random().toString(36).substring(2, 9);
    setAlertRules(prev => [...prev, { ...newRule, id: newId }]);
    setNewRule({
      name: "",
      condition: "",
      threshold: 0,
      enabled: true,
      severity: "medium",
      notifyVia: ["dashboard"]
    });
    setShowNewRuleForm(false);
  };
  
  const severityColors = {
    low: "bg-green-500",
    medium: "bg-yellow-500",
    high: "bg-orange-500",
    critical: "bg-red-500"
  };
  
  return (
    <div className="transition-all duration-300">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Custom Alerts</h1>
        
        <div className="mb-8">
          <button 
            onClick={() => {
              setShowNewRuleForm(true);
              setEditingRule(null);
            }}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded transition-colors duration-200 flex items-center gap-2"
          >
            <FaPlus />
            <span>Create New Alert Rule</span>
          </button>
        </div>
        
        {showNewRuleForm && (
          <div className="bg-white/5 p-6 rounded-lg mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FaPlus />
              <span>New Alert Rule</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block mb-1 font-medium">Rule Name</label>
                <input 
                  type="text" 
                  value={newRule.name}
                  onChange={(e) => handleNewRuleChange("name", e.target.value)}
                  className="w-full px-4 py-2 rounded bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="E.g., Unusual Login Activity"
                />
              </div>
              
              <div>
                <label className="block mb-1 font-medium">Condition</label>
                <input 
                  type="text" 
                  value={newRule.condition}
                  onChange={(e) => handleNewRuleChange("condition", e.target.value)}
                  className="w-full px-4 py-2 rounded bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="E.g., login_attempts > threshold"
                />
              </div>
              
              <div>
                <label className="block mb-1 font-medium">Threshold</label>
                <input 
                  type="number" 
                  value={newRule.threshold}
                  onChange={(e) => handleNewRuleChange("threshold", parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 rounded bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <div>
                <label className="block mb-1 font-medium">Severity</label>
                <select 
                  value={newRule.severity}
                  onChange={(e) => handleNewRuleChange("severity", e.target.value)}
                  className="w-full px-4 py-2 rounded bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block mb-2 font-medium">Notify Via</label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      checked={newRule.notifyVia.includes("email")}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleNewRuleChange("notifyVia", [...newRule.notifyVia, "email"]);
                        } else {
                          handleNewRuleChange(
                            "notifyVia", 
                            newRule.notifyVia.filter(method => method !== "email")
                          );
                        }
                      }}
                      className="w-5 h-5"
                    />
                    <span>Email</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      checked={newRule.notifyVia.includes("sms")}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleNewRuleChange("notifyVia", [...newRule.notifyVia, "sms"]);
                        } else {
                          handleNewRuleChange(
                            "notifyVia", 
                            newRule.notifyVia.filter(method => method !== "sms")
                          );
                        }
                      }}
                      className="w-5 h-5"
                    />
                    <span>SMS</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      checked={newRule.notifyVia.includes("dashboard")}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleNewRuleChange("notifyVia", [...newRule.notifyVia, "dashboard"]);
                        } else {
                          handleNewRuleChange(
                            "notifyVia", 
                            newRule.notifyVia.filter(method => method !== "dashboard")
                          );
                        }
                      }}
                      className="w-5 h-5"
                    />
                    <span>Dashboard</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-4">
              <button 
                onClick={() => setShowNewRuleForm(false)}
                className="px-4 py-2 rounded border border-gray-500 hover:bg-white/10 transition-colors duration-200 flex items-center gap-2"
              >
                <FaTimes />
                <span>Cancel</span>
              </button>
              
              <button 
                onClick={handleSaveNewRule}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded transition-colors duration-200 flex items-center gap-2"
              >
                <FaSave />
                <span>Save Rule</span>
              </button>
            </div>
          </div>
        )}
        
        {editingRule && (
          <div className="bg-white/5 p-6 rounded-lg mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FaEdit />
              <span>Edit Alert Rule</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block mb-1 font-medium">Rule Name</label>
                <input 
                  type="text" 
                  value={editingRule.name}
                  onChange={(e) => handleEditRuleChange("name", e.target.value)}
                  className="w-full px-4 py-2 rounded bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <div>
                <label className="block mb-1 font-medium">Condition</label>
                <input 
                  type="text" 
                  value={editingRule.condition}
                  onChange={(e) => handleEditRuleChange("condition", e.target.value)}
                  className="w-full px-4 py-2 rounded bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <div>
                <label className="block mb-1 font-medium">Threshold</label>
                <input 
                  type="number" 
                  value={editingRule.threshold}
                  onChange={(e) => handleEditRuleChange("threshold", parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 rounded bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <div>
                <label className="block mb-1 font-medium">Severity</label>
                <select 
                  value={editingRule.severity}
                  onChange={(e) => handleEditRuleChange("severity", e.target.value)}
                  className="w-full px-4 py-2 rounded bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block mb-2 font-medium">Notify Via</label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      checked={editingRule.notifyVia.includes("email")}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleEditRuleChange("notifyVia", [...editingRule.notifyVia, "email"]);
                        } else {
                          handleEditRuleChange(
                            "notifyVia", 
                            editingRule.notifyVia.filter(method => method !== "email")
                          );
                        }
                      }}
                      className="w-5 h-5"
                    />
                    <span>Email</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      checked={editingRule.notifyVia.includes("sms")}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleEditRuleChange("notifyVia", [...editingRule.notifyVia, "sms"]);
                        } else {
                          handleEditRuleChange(
                            "notifyVia", 
                            editingRule.notifyVia.filter(method => method !== "sms")
                          );
                        }
                      }}
                      className="w-5 h-5"
                    />
                    <span>SMS</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      checked={editingRule.notifyVia.includes("dashboard")}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleEditRuleChange("notifyVia", [...editingRule.notifyVia, "dashboard"]);
                        } else {
                          handleEditRuleChange(
                            "notifyVia", 
                            editingRule.notifyVia.filter(method => method !== "dashboard")
                          );
                        }
                      }}
                      className="w-5 h-5"
                    />
                    <span>Dashboard</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-4">
              <button 
                onClick={() => setEditingRule(null)}
                className="px-4 py-2 rounded border border-gray-500 hover:bg-white/10 transition-colors duration-200 flex items-center gap-2"
              >
                <FaTimes />
                <span>Cancel</span>
              </button>
              
              <button 
                onClick={handleSaveEdit}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded transition-colors duration-200 flex items-center gap-2"
              >
                <FaSave />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          {alertRules.map(rule => (
            <div key={rule.id} className="bg-white/5 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className={`inline-block w-3 h-3 rounded-full ${severityColors[rule.severity]}`}></span>
                  {rule.name}
                </h3>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleToggleRule(rule.id)}
                    className={`w-12 h-6 rounded-full transition-colors duration-200 flex items-center px-1 ${rule.enabled ? 'bg-purple-500 justify-end' : 'bg-gray-700 justify-start'}`}
                  >
                    <span className="w-4 h-4 bg-white rounded-full block"></span>
                  </button>
                  
                  <button 
                    onClick={() => handleEditRule(rule)}
                    className="text-gray-400 hover:text-white transition-colors duration-200"
                  >
                    <FaEdit />
                  </button>
                  
                  <button 
                    onClick={() => handleDeleteRule(rule.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors duration-200"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="block text-gray-400">Condition</span>
                  <span>{rule.condition}</span>
                </div>
                
                <div>
                  <span className="block text-gray-400">Threshold</span>
                  <span>{rule.threshold}</span>
                </div>
                
                <div>
                  <span className="block text-gray-400">Notifications</span>
                  <span>{rule.notifyVia.join(", ")}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 