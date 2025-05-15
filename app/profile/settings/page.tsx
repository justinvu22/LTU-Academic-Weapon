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
    <div className="font-['Poppins',sans-serif] flex flex-col md:flex-row gap-12 items-start justify-center min-h-[80vh] py-12 px-4 md:px-12 bg-gradient-to-br from-white/80 to-blue-50 transition-all duration-300">
      {/* Profile Card */}
      <div className="w-full max-w-sm glass-card p-8 flex flex-col items-center shadow-xl rounded-2xl relative">
        <div className="relative mb-4">
          <div className="w-36 h-36 rounded-full bg-gradient-to-tr from-blue-400/60 to-cyan-400/40 flex items-center justify-center shadow-lg ring-4 ring-blue-200/60">
            {formData.avatar ? (
              <img src={typeof formData.avatar === 'string' ? formData.avatar : ''} alt="User avatar" className="w-32 h-32 rounded-full object-cover" />
            ) : (
              <span className="text-6xl font-bold text-white drop-shadow-lg">{formData.name.charAt(0)}</span>
            )}
          </div>
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900">{formData.name}</h2>
        <p className="text-gray-500 mb-6">{formData.email}</p>
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
          className="w-full py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold shadow hover:scale-105 transition"
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
        <div className="glass-card p-6 rounded-2xl shadow-lg border-l-4 border-blue-400">
          <h3 className="flex items-center gap-2 text-lg font-bold text-blue-600 mb-4">
            <FaUser /> Personal Information
          </h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block mb-1 font-medium">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label htmlFor="email" className="block mb-1 font-medium">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
        </div>
        {/* Security */}
        <div className="glass-card p-6 rounded-2xl shadow-lg border-l-4 border-purple-400">
          <h3 className="flex items-center gap-2 text-lg font-bold text-purple-600 mb-4">
            <FaLock /> Security
          </h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block mb-1 font-medium">New Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block mb-1 font-medium">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>
        {/* Notifications */}
        <div className="glass-card p-6 rounded-2xl shadow-lg border-l-4 border-cyan-400">
          <h3 className="flex items-center gap-2 text-lg font-bold text-cyan-600 mb-4">
            <FaBell /> Notifications
          </h3>
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="notificationEmail"
                checked={formData.notificationEmail}
                onChange={handleChange}
                className="w-5 h-5 accent-blue-500"
              />
              <span>Email Notifications</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="notificationPush"
                checked={formData.notificationPush}
                onChange={handleChange}
                className="w-5 h-5 accent-blue-500"
              />
              <span>Push Notifications</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="notificationActivity"
                checked={formData.notificationActivity}
                onChange={handleChange}
                className="w-5 h-5 accent-blue-500"
              />
              <span>Activity Notifications</span>
            </label>
          </div>
        </div>
        <button
          type="submit"
          className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold shadow-lg hover:scale-105 transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={saving}
        >
          <FaSave />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
} 