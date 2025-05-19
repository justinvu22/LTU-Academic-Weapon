"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { FaUser, FaEnvelope, FaLock, FaBell, FaSave, FaTrash, FaCog } from "react-icons/fa";
import Switch from '@mui/material/Switch';

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
    <div className="min-h-screen flex flex-col bg-[#121324] py-10 px-6">
      <div className="w-full bg-[#121324] rounded-2xl border border-[#333] shadow-[0_2px_12px_rgba(110,95,254,0.10)] px-8 py-10 flex flex-col md:flex-row gap-12">
        {/* Profile Card */}
        <div className="w-full md:w-1/3 bg-[#232346] p-8 flex flex-col justify-between items-center shadow-[0_2px_8px_rgba(110,95,254,0.10)] rounded-2xl border border-[#333] relative min-w-[260px] max-w-md h-full min-h-[500px]">
          <div className="relative mb-4 w-full flex flex-col items-center">
            <div className="w-48 h-48 rounded-full bg-gradient-to-tr from-[#6E5FFE]/60 to-[#8F7BFF]/40 flex items-center justify-center shadow-lg ring-4 ring-[#6E5FFE]/30">
              {formData.avatar ? (
                <img src={typeof formData.avatar === 'string' ? formData.avatar : ''} alt="User avatar" className="w-40 h-40 rounded-full object-cover" />
              ) : (
                <span className="text-8xl font-extrabold text-white drop-shadow-lg">{formData.name.charAt(0)}</span>
              )}
            </div>
          </div>
          <div className="flex flex-col flex-1 w-full justify-between h-full">
            <div className="flex flex-col items-center">
              <h2 className="text-4xl font-extrabold text-white mb-2 mt-4">{formData.name}</h2>
              <p className="text-[#B9B9E3] mb-6 text-base">{formData.email}</p>
            </div>
            <div className="flex flex-col w-full gap-3 mt-auto">
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
                className="w-full py-2 rounded-lg bg-gradient-to-r from-[#6E5FFE] to-[#8F7BFF] text-white font-bold shadow hover:scale-105 transition"
              >
                Change Avatar
              </button>
              <button
                type="button"
                className="w-full py-2 rounded-lg bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold shadow hover:scale-105 transition flex items-center justify-center gap-2"
              >
                <FaTrash />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
        {/* Info Sections */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-8 min-w-0">
          {saved && (
            <div className="w-full mb-4 p-3 rounded-xl bg-green-500 text-white text-center font-semibold shadow-lg transition-all duration-300">
              Changes saved successfully!
            </div>
          )}
          {/* Personal Info */}
          <div className="bg-[#1F2030] rounded-lg border border-[#333] px-6 py-7 shadow-[0_2px_8px_rgba(110,95,254,0.08)] mb-2">
            <h3 className="text-[1.15rem] font-extrabold tracking-wide text-[#EEE] pl-4 border-l-4 border-purple-400 mb-6 uppercase" style={{ fontFamily: "'IBM Plex Sans', Inter, sans-serif", letterSpacing: '0.04em', textShadow: '0 1px 8px #6E5FFE22' }}>
              <span className="inline-flex items-center gap-2"><FaUser /> Personal Information</span>
            </h3>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <label htmlFor="name" className="block mb-2 font-bold text-[#B9B9E3]">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-[#232346] border border-[#333] text-[#EEE] font-medium focus:outline-none focus:ring-2 focus:ring-[#6E5FFE] focus:border-[#6E5FFE] transition"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="email" className="block mb-2 font-bold text-[#B9B9E3]">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-[#232346] border border-[#333] text-[#EEE] font-medium focus:outline-none focus:ring-2 focus:ring-[#6E5FFE] focus:border-[#6E5FFE] transition"
                />
              </div>
            </div>
          </div>
          {/* Security */}
          <div className="bg-[#1F2030] rounded-lg border border-[#333] px-6 py-7 shadow-[0_2px_8px_rgba(110,95,254,0.08)] mb-2">
            <h3 className="text-[1.15rem] font-extrabold tracking-wide text-[#EEE] pl-4 border-l-4 border-pink-400 mb-6 uppercase" style={{ fontFamily: "'IBM Plex Sans', Inter, sans-serif", letterSpacing: '0.04em', textShadow: '0 1px 8px #6E5FFE22' }}>
              <span className="inline-flex items-center gap-2"><FaLock /> Security</span>
            </h3>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <label htmlFor="password" className="block mb-2 font-bold text-[#B9B9E3]">New Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-[#232346] border border-[#333] text-[#EEE] font-medium focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition"
                  placeholder="••••••••"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="confirmPassword" className="block mb-2 font-bold text-[#B9B9E3]">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-[#232346] border border-[#333] text-[#EEE] font-medium focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>
          {/* Notifications */}
          <div className="bg-[#1F2030] rounded-lg border border-[#333] px-6 py-7 shadow-[0_2px_8px_rgba(110,95,254,0.08)] mb-2">
            <h3 className="text-[1.15rem] font-extrabold tracking-wide text-[#EEE] pl-4 border-l-4 border-cyan-400 mb-6 uppercase" style={{ fontFamily: "'IBM Plex Sans', Inter, sans-serif", letterSpacing: '0.04em', textShadow: '0 1px 8px #6E5FFE22' }}>
              <span className="inline-flex items-center gap-2"><FaBell /> Notifications</span>
            </h3>
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between py-1">
                <span className="text-[#B9B9E3] font-bold text-base tracking-wide">Email Notifications</span>
                <Switch
                  checked={formData.notificationEmail}
                  onChange={e => setFormData(prev => ({ ...prev, notificationEmail: e.target.checked }))}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#8F7BFF',
                      '& + .MuiSwitch-track': {
                        background: 'linear-gradient(90deg, #6E5FFE 60%, #8F7BFF 100%)',
                        opacity: 1,
                      },
                    },
                    '& .MuiSwitch-switchBase': {
                      color: '#232346',
                    },
                    '& .MuiSwitch-thumb': {
                      boxShadow: '0 2px 8px #6E5FFE44',
                    },
                    '& .MuiSwitch-track': {
                      background: '#232346',
                      border: '1.5px solid #6E5FFE',
                      opacity: 1,
                    },
                  }}
                />
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[#B9B9E3] font-bold text-base tracking-wide">Push Notifications</span>
                <Switch
                  checked={formData.notificationPush}
                  onChange={e => setFormData(prev => ({ ...prev, notificationPush: e.target.checked }))}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#8F7BFF',
                      '& + .MuiSwitch-track': {
                        background: 'linear-gradient(90deg, #6E5FFE 60%, #8F7BFF 100%)',
                        opacity: 1,
                      },
                    },
                    '& .MuiSwitch-switchBase': {
                      color: '#232346',
                    },
                    '& .MuiSwitch-thumb': {
                      boxShadow: '0 2px 8px #6E5FFE44',
                    },
                    '& .MuiSwitch-track': {
                      background: '#232346',
                      border: '1.5px solid #6E5FFE',
                      opacity: 1,
                    },
                  }}
                />
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[#B9B9E3] font-bold text-base tracking-wide">Activity Alerts</span>
                <Switch
                  checked={formData.notificationActivity}
                  onChange={e => setFormData(prev => ({ ...prev, notificationActivity: e.target.checked }))}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#8F7BFF',
                      '& + .MuiSwitch-track': {
                        background: 'linear-gradient(90deg, #6E5FFE 60%, #8F7BFF 100%)',
                        opacity: 1,
                      },
                    },
                    '& .MuiSwitch-switchBase': {
                      color: '#232346',
                    },
                    '& .MuiSwitch-thumb': {
                      boxShadow: '0 2px 8px #6E5FFE44',
                    },
                    '& .MuiSwitch-track': {
                      background: '#232346',
                      border: '1.5px solid #6E5FFE',
                      opacity: 1,
                    },
                  }}
                />
              </div>
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#6E5FFE] to-[#8F7BFF] hover:from-[#7C6BFF] hover:to-[#A89CFF] text-white font-bold shadow-lg transition-all text-lg flex items-center justify-center gap-2 mt-2"
            disabled={saving}
          >
            <FaSave />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
} 