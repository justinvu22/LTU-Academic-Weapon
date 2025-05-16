"use client";

import React, { useState } from "react";
import { FaInfoCircle, FaPlus, FaTrash, FaChevronDown } from "react-icons/fa";
import '@fontsource/poppins/600.css';
import Link from "next/link";

const usersList = [
  "victoria.campbell@zenith.com",
  "mia.anderson@zenith.com"
];

const activityTypes = ["Email", "Login", "File Upload"];

const fieldOptions = [
  { label: "Email address", value: "email_address" },
];

const conditionOptions = [
  { label: "Is", value: "is" },
  { label: "Is not", value: "is_not" },
];

const TrustedActivitiesPage = () => {
  const [activityName, setActivityName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([usersList[0], usersList[1]]);
  const [allUsers, setAllUsers] = useState(false);
  const [activityType, setActivityType] = useState(activityTypes[0]);
  const [neverExpires, setNeverExpires] = useState(true);
  const [rules, setRules] = useState([
    { field: "email_address", condition: "is", value: "clients@hammondaccounting.com", logic: "and" },
  ]);

  // Placeholder for adding/removing rules
  const addRule = () => setRules([...rules, { field: "email_address", condition: "is", value: "", logic: "and" }]);
  const removeRule = (idx: number) => setRules(rules.filter((_, i) => i !== idx));

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0F172A] to-[#7928CA] py-8 px-6 font-['Poppins',sans-serif]">
      {/* Info Banner */}
      <div className="mb-6">
        <div className="flex items-center gap-3 bg-white/10 text-blue-200 rounded-xl px-4 py-3 shadow backdrop-blur-md border border-blue-400/20 w-full">
          <FaInfoCircle className="text-xl" />
          <span className="text-sm">Trusted Activities are known good activities you want to exclude from any alerts.</span>
        </div>
      </div>
      {/* Neumorphic Card */}
      <div className="w-full h-full bg-[#1E1E2F] rounded-2xl shadow-[inset_-4px_-4px_12px_#2a2a40,inset_4px_4px_12px_#0e0e1e] border border-[#232846] px-4 md:px-8 py-8 flex flex-col gap-6">
        {/* Activity Name & Description */}
        <div>
          <label className="block text-gray-200 text-sm font-semibold mb-1">Trusted Activity name</label>
          <input
            className="w-full bg-[#232846] border border-[#2d2d4d] rounded-lg px-4 py-2 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
            placeholder="Monthly accounts"
            value={activityName}
            onChange={e => setActivityName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-gray-200 text-sm font-semibold mb-1">Description</label>
          <textarea
            className="w-full bg-[#232846] border border-[#2d2d4d] rounded-lg px-4 py-2 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition min-h-[60px]"
            placeholder="We send accounts to Hammond Accounting every month, this is expected process."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>
        {/* Applies to users */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 bg-[#232846] rounded-xl p-4 border border-[#2d2d4d]">
          <div className="flex-1">
            <label className="block text-gray-200 text-sm font-semibold mb-1">Applies to users</label>
            <div className="flex flex-wrap gap-2">
              {usersList.map(user => (
                <span key={user} className={`px-3 py-1 rounded-full text-xs font-semibold border ${selectedUsers.includes(user) ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-400' : 'bg-[#1E1E2F] text-gray-300 border-[#2d2d4d]'} cursor-pointer transition`}
                  onClick={() => setSelectedUsers(selectedUsers.includes(user) ? selectedUsers.filter(u => u !== user) : [...selectedUsers, user])}
                >
                  {user}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 md:mt-0">
            <span className="text-gray-400 text-xs">All users</span>
            <button
              className={`w-10 h-6 rounded-full border-2 border-purple-400 flex items-center transition ${allUsers ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-400' : 'bg-[#232846]'}`}
              onClick={() => setAllUsers(!allUsers)}
              type="button"
            >
              <span className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition ${allUsers ? 'translate-x-4' : ''}`}></span>
            </button>
          </div>
        </div>
        {/* Activity type & Expiry */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-gray-200 text-sm font-semibold mb-1">Activity type</label>
            <div className="relative">
              <select
                className="w-full bg-[#232846] border border-[#2d2d4d] rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none pr-8"
                value={activityType}
                onChange={e => setActivityType(e.target.value)}
              >
                {activityTypes.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
              <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <label className="block text-gray-200 text-sm font-semibold mb-1">Expires</label>
            <div className="flex items-center gap-3">
              <input
                type="date"
                className="bg-[#232846] border border-[#2d2d4d] rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                disabled={neverExpires}
              />
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={neverExpires}
                  onChange={() => setNeverExpires(!neverExpires)}
                  className="accent-purple-400 w-4 h-4"
                />
                <span className="text-gray-400 text-xs">Never expires</span>
              </label>
            </div>
          </div>
        </div>
        {/* Rule Builder */}
        <div className="flex flex-col gap-4">
          {rules.map((rule, idx) => (
            <div key={idx} className="flex flex-col md:flex-row md:items-center gap-2 bg-[#232846] rounded-xl p-4 border border-[#2d2d4d] relative">
              {/* Field */}
              <div className="flex-1">
                <select
                  className="w-full bg-[#1E1E2F] border border-[#2d2d4d] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
                  value={rule.field}
                  onChange={e => {
                    const newRules = [...rules];
                    newRules[idx].field = e.target.value;
                    setRules(newRules);
                  }}
                >
                  {fieldOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              {/* Condition */}
              <div className="flex-1">
                <select
                  className="w-full bg-[#1E1E2F] border border-[#2d2d4d] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
                  value={rule.condition}
                  onChange={e => {
                    const newRules = [...rules];
                    newRules[idx].condition = e.target.value;
                    setRules(newRules);
                  }}
                >
                  {conditionOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              {/* Value */}
              <div className="flex-1">
                <input
                  className="w-full bg-[#1E1E2F] border border-[#2d2d4d] rounded-lg px-3 py-2 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                  placeholder="Value"
                  value={rule.value}
                  onChange={e => {
                    const newRules = [...rules];
                    newRules[idx].value = e.target.value;
                    setRules(newRules);
                  }}
                />
              </div>
              {/* Remove Rule */}
              <button
                className="absolute top-2 right-2 text-red-400 hover:text-red-600 transition"
                onClick={() => removeRule(idx)}
                type="button"
                aria-label="Remove rule"
              >
                <FaTrash />
              </button>
            </div>
          ))}
          {/* Add Rule Button */}
          <button
            className="flex items-center gap-2 self-start bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold px-4 py-2 rounded-lg shadow transition mt-2"
            onClick={addRule}
            type="button"
          >
            <FaPlus /> Add Condition
          </button>
        </div>
        {/* Action Buttons */}
        <div className="flex justify-between mt-6">
          <Link href="/trusted-activities">
            <button className="bg-white/10 hover:bg-white/20 text-purple-200 font-semibold px-6 py-2 rounded-lg shadow transition-all text-base">
              Back
            </button>
          </Link>
          <button className="bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 hover:from-purple-600 hover:to-cyan-500 text-white font-bold px-8 py-3 rounded-xl shadow-lg transition-all text-lg">
            Save Trusted Activity
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrustedActivitiesPage; 