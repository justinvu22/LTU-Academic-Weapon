"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { FaUser, FaEnvelope, FaLock, FaBell, FaSave, FaTrash } from "react-icons/fa";

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
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
    <div className="transition-all duration-300">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>
        
        {saved && (
          <div className="bg-green-500 text-white p-4 rounded mb-6 flex items-center justify-between transition-all duration-300">
            <span>Your settings have been saved successfully!</span>
            <button onClick={() => setSaved(false)} className="text-white">✕</button>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="space-y-4">
            <div className="relative flex flex-col items-center p-6 bg-white/5 rounded-lg">
              <div className="w-32 h-32 rounded-full overflow-hidden mb-4 bg-purple-800">
                {formData.avatar ? (
                  <img 
                    src={typeof formData.avatar === 'string' ? formData.avatar : ''}
                    alt="User avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">
                    {formData.name.charAt(0)}
                  </div>
                )}
              </div>
              <h2 className="text-xl font-semibold">{formData.name}</h2>
              <p className="text-gray-400 mb-4">{formData.email}</p>
              <label className="w-full">
                <span className="sr-only">Change avatar</span>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <button 
                  onClick={() => {
                    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                    if (fileInput) fileInput.click();
                  }}
                  type="button"
                  className="w-full bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded transition-colors duration-200"
                >
                  Change Avatar
                </button>
              </label>
            </div>
            
            <button 
              type="button"
              className="w-full bg-red-600 hover:bg-red-700 px-4 py-2 rounded transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <FaTrash />
              <span>Delete Account</span>
            </button>
          </div>
          
          {/* Main Content */}
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="bg-white/5 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <FaUser />
                  <span>Personal Information</span>
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
                      className="w-full px-4 py-2 rounded bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                      className="w-full px-4 py-2 rounded bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
              
              {/* Security */}
              <div className="bg-white/5 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <FaLock />
                  <span>Security</span>
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
                      className="w-full px-4 py-2 rounded bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                      className="w-full px-4 py-2 rounded bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>
              
              {/* Notifications */}
              <div className="bg-white/5 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <FaBell />
                  <span>Notifications</span>
                </h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="notificationEmail"
                      checked={formData.notificationEmail}
                      onChange={handleChange}
                      className="w-5 h-5"
                    />
                    <span>Email Notifications</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="notificationPush"
                      checked={formData.notificationPush}
                      onChange={handleChange}
                      className="w-5 h-5"
                    />
                    <span>Push Notifications</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="notificationActivity"
                      checked={formData.notificationActivity}
                      onChange={handleChange}
                      className="w-5 h-5"
                    />
                    <span>Activity Notifications</span>
                  </label>
                </div>
              </div>
              
              <button 
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 px-4 py-3 rounded transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <FaSave />
                <span>Save Changes</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 