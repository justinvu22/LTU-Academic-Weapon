"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { FaUser, FaEnvelope, FaLock, FaBell, FaSave, FaTrash, FaCog } from "react-icons/fa";

interface FormDataType {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  avatar: string | ArrayBuffer | null;
  notificationEmail: boolean;
  notificationPush: boolean;
  notificationActivity: boolean;
}

export default function ProfileSettingsPage() {
  const [formData, setFormData] = useState<FormDataType>({
    name: "Sophie Fortune",
    email: "sophie@example.com",
    password: "",
    confirmPassword: "",
    avatar: "",
    notificationEmail: true,
    notificationPush: true,
    notificationActivity: true
  });

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    // Here you would typically send the data to your API
    setSaving(true);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setSaving(false);
    }, 2000);
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          avatar: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="font-['Poppins',sans-serif] flex flex-col md:flex-row gap-12 items-start justify-center min-h-screen py-12 px-4 md:px-12 bg-gradient-to-b from-[#0F172A] to-[#7928CA] transition-all duration-300">
      {/* Profile Card */}
      <div className="w-full max-w-sm bg-[#1E1E2F] p-8 flex flex-col items-center shadow-[inset_-4px_-4px_12px_#2a2a40,inset_4px_4px_12px_#0e0e1e] rounded-2xl border border-[#232846] relative">
        <div className="relative mb-4">
          <div className="w-36 h-36 rounded-full bg-gradient-to-tr from-purple-500/60 to-pink-400/40 flex items-center justify-center shadow-lg ring-4 ring-purple-400/40">
            {formData.avatar ? (
              <img src={typeof formData.avatar === 'string' ? formData.avatar : ''} alt="User avatar" className="w-32 h-32 rounded-full object-cover" />
            ) : (
              <span className="text-6xl font-bold text-white drop-shadow-lg">{formData.name.charAt(0)}</span>
            )}
          </div>
        </div>
        <h2 className="text-2xl font-extrabold text-white">{formData.name}</h2>
        <p className="text-gray-400 mb-6">{formData.email}</p>
        <input 
          type="file" 
          accept="image/*"
          onChange={handleAvatarChange}
          className="hidden" id="avatar-upload"
        />
        <button
          onClick={() => {
            const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
            if (fileInput) fileInput.click();
          }}
          type="button"
          className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold shadow hover:scale-105 transition"
        >
          Change Avatar
        </button>
        <button
          type="button"
          className="w-full mt-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold shadow hover:scale-105 transition flex items-center justify-center gap-2"
        >
          <FaTrash />
          <span>Delete Account</span>
        </button>
      </div>

      {/* Info Sections */}
      <form onSubmit={handleSubmit} className="flex-1 grid grid-cols-1 gap-8">
        {saved && (
          <div className="w-full mb-4 p-3 rounded-xl bg-green-500 text-white text-center font-semibold shadow-lg transition-all duration-300">
            Changes saved successfully!
          </div>
        )}
        {/* Personal Info */}
        <div className="bg-[#1E1E2F] p-6 rounded-2xl shadow-[inset_-4px_-4px_12px_#2a2a40,inset_4px_4px_12px_#0e0e1e] border-l-4 border-purple-400">
          <h3 className="flex items-center gap-2 text-lg font-bold text-purple-400 mb-4">
            <FaUser /> Personal Information
          </h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block mb-1 font-medium text-gray-200">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded bg-[#232846] border border-[#2d2d4d] text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div>
              <label htmlFor="email" className="block mb-1 font-medium text-gray-200">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded bg-[#232846] border border-[#2d2d4d] text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>
        </div>
        {/* Security */}
        <div className="bg-[#1E1E2F] p-6 rounded-2xl shadow-[inset_-4px_-4px_12px_#2a2a40,inset_4px_4px_12px_#0e0e1e] border-l-4 border-pink-400">
          <h3 className="flex items-center gap-2 text-lg font-bold text-pink-400 mb-4">
            <FaLock /> Security
          </h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block mb-1 font-medium text-gray-200">New Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded bg-[#232846] border border-[#2d2d4d] text-white focus:outline-none focus:ring-2 focus:ring-pink-400"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block mb-1 font-medium text-gray-200">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded bg-[#232846] border border-[#2d2d4d] text-white focus:outline-none focus:ring-2 focus:ring-pink-400"
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>
        {/* Notifications */}
        <div className="bg-[#1E1E2F] p-6 rounded-2xl shadow-[inset_-4px_-4px_12px_#2a2a40,inset_4px_4px_12px_#0e0e1e] border-l-4 border-cyan-400">
          <h3 className="flex items-center gap-2 text-lg font-bold text-cyan-400 mb-4">
            <FaBell /> Notifications
          </h3>
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-gray-200">
              <input
                type="checkbox"
                name="notificationEmail"
                checked={formData.notificationEmail}
                onChange={handleChange}
                className="w-5 h-5 accent-purple-500"
              />
              <span>Email Notifications</span>
            </label>
            <label className="flex items-center gap-2 text-gray-200">
              <input
                type="checkbox"
                name="notificationPush"
                checked={formData.notificationPush}
                onChange={handleChange}
                className="w-5 h-5 accent-purple-500"
              />
              <span>Push Notifications</span>
            </label>
            <label className="flex items-center gap-2 text-gray-200">
              <input
                type="checkbox"
                name="notificationActivity"
                checked={formData.notificationActivity}
                onChange={handleChange}
                className="w-5 h-5 accent-purple-500"
              />
              <span>Activity Alerts</span>
            </label>
          </div>
        </div>
        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 hover:from-purple-600 hover:to-cyan-500 text-white font-bold shadow-lg transition-all text-lg flex items-center justify-center gap-2"
          disabled={saving}
        >
          <FaSave />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
} 