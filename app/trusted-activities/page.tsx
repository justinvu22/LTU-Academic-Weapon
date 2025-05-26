"use client";

import React, { useState } from "react";
import { FaInfoCircle, FaPlus, FaMinus, FaArrowLeft } from "react-icons/fa";
import Tooltip from '@mui/material/Tooltip';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import ComboBox from '../../components/ComboBox';
import Switch from '@mui/material/Switch';
import Link from "next/link";
import TextField from '@mui/material/TextField';

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
  const [allUsers, setAllUsers] = useState(true);
  const [activityType, setActivityType] = useState(activityTypes[0]);
  const [neverExpires, setNeverExpires] = useState(true);
  const [groups, setGroups] = useState([
    [
      { field: "email_address", condition: "is", value: "clients@hammondaccounting.com", logic: "or" },
    ],
  ]);

  // Add a new OR condition to a group
  const addOrCondition = (groupIdx: number) => {
    setGroups(groups => groups.map((g, i) => i === groupIdx ? [...g, { field: "email_address", condition: "is", value: "", logic: "or" }] : g));
  };
  // Remove a condition from a group
  const removeCondition = (groupIdx: number, condIdx: number) => {
    setGroups(groups => groups.map((g, i) => i === groupIdx ? g.filter((_, j) => j !== condIdx) : g).filter(g => g.length > 0));
  };
  // Add a new AND group
  const addAndGroup = () => {
    setGroups(groups => [...groups, [{ field: "email_address", condition: "is", value: "", logic: "or" }]]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#121324] py-8 px-6 font-['IBM_Plex_Sans',Inter,sans-serif]">
      {/* Info Banner */}
      <div className="mb-8 flex items-center mt-6">
        <Tooltip
          title={
            <span style={{
              color: '#EEE',
              fontSize: '1.05rem',
              fontWeight: 500,
              fontFamily: "'IBM Plex Sans', Inter, sans-serif",
              letterSpacing: '0.01em',
              padding: 0,
              margin: 0,
              display: 'block',
              lineHeight: 1.5,
            }}>
              Trusted Activities are known good activities you want to exclude from any alerts.
            </span>
          }
          arrow
          placement="right"
          slotProps={{
            popper: {
              modifiers: [
                {
                  name: 'offset',
                  options: {
                    offset: [0, 16],
                  },
                },
              ],
              sx: {
                '& .MuiTooltip-tooltip': {
                  background: 'linear-gradient(90deg, #232346 80%, #2B2B4A 100%)',
                  borderLeft: '4px solid #6E5FFE',
                  boxShadow: '0 4px 24px 0 #6E5FFE22, 0 1.5px 0 #232346',
                  fontFamily: "'IBM Plex Sans', Inter, sans-serif",
                  padding: '16px 20px',
                  borderRadius: '12px',
                  minWidth: '320px',
                  maxWidth: '420px',
                },
                '& .MuiTooltip-arrow': {
                  color: '#232346',
                },
              },
            },
          }}
        >
          <button
            type="button"
            aria-label="Show info about trusted activities"
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              margin: 0,
              cursor: 'pointer',
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <FaInfoCircle
              style={{
                color: '#6E5FFE',
                fontSize: 28,
                filter: 'drop-shadow(0 0 6px #6E5FFE66)',
                transition: 'color 0.2s',
              }}
              onMouseOver={e => (e.currentTarget.style.color = '#8F7BFF')}
              onMouseOut={e => (e.currentTarget.style.color = '#6E5FFE')}
            />
          </button>
        </Tooltip>
      </div>
      {/* Outer Box Start */}
      <div className="w-full h-full bg-[#121324] rounded-lg border border-[#333] px-6 py-6 flex flex-col gap-6 shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
        {/* Trusted Activity Details Card */}
        <div className="w-full bg-[#1F2030] rounded-lg border border-[#333] px-6 py-6 mb-6 shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
          <div className="mt-4 mb-8">
            <h2
              className="text-[1.35rem] font-extrabold tracking-wide text-[#EEE] pl-4 border-l-4 border-[#6E5FFE] ml-4 mb-2"
              style={{
                fontFamily: "'IBM Plex Sans', Inter, sans-serif",
                letterSpacing: '0.04em',
                textShadow: '0 1px 8px #6E5FFE22',
                textTransform: 'uppercase',
              }}
            >
              Trusted Activity Details
            </h2>
            <div className="h-[1px] bg-[#333] w-full mt-8"></div>
          </div>
          <TextField
            label="Name"
            variant="outlined"
            fullWidth
            value={activityName}
            onChange={e => setActivityName(e.target.value)}
            sx={{
              input: { 
                color: '#DDD', 
                background: '#1F2030', 
                outline: 'none !important', 
                boxShadow: 'none !important',
              },
              label: {
                color: '#6E5FFE',
                fontSize: '1.3rem',
                fontWeight: 700,
                letterSpacing: 0.5,
                paddingLeft: '8px',
                paddingRight: '8px',
                background: '#1F2030',
                transform: 'translate(14px, -9px) scale(0.85)',
                zIndex: 1,
              },
              '.MuiOutlinedInput-root': {
                borderRadius: '0.5rem',
                background: '#1F2030',
                '&:hover': {
                  background: '#1F2030',
                },
                '& fieldset': { borderColor: '#6E5FFE' },
                '&:hover fieldset': { borderColor: '#8F7BFF' },
                '&.Mui-focused fieldset': { borderColor: '#6E5FFE' },
              },
              marginBottom: 3,
            }}
            placeholder="Monthly accounts"
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Description"
            variant="outlined"
            fullWidth
            value={description}
            onChange={e => setDescription(e.target.value)}
            sx={{
              input: { 
                color: '#DDD', 
                background: '#1F2030', 
                outline: 'none !important', 
                boxShadow: 'none !important',
              },
              textarea: { 
                color: '#DDD', 
                background: '#1F2030', 
                outline: 'none !important', 
                boxShadow: 'none !important',
              },
              label: {
                color: '#6E5FFE',
                fontSize: '1.3rem',
                fontWeight: 700,
                letterSpacing: 0.5,
                paddingLeft: '8px',
                paddingRight: '8px',
                background: '#1F2030',
                transform: 'translate(14px, -9px) scale(0.85)',
                zIndex: 1,
              },
              '.MuiOutlinedInput-root': {
                borderRadius: '0.5rem',
                background: '#1F2030',
                '&:hover': {
                  background: '#1F2030',
                },
                '& fieldset': { borderColor: '#6E5FFE' },
                '&:hover fieldset': { borderColor: '#8F7BFF' },
                '&.Mui-focused fieldset': { borderColor: '#6E5FFE' },
              },
              marginBottom: 3,
            }}
            placeholder="We send accounts to Hammond Accounting every month, this is expected process."
            margin="normal"
            multiline
            minRows={2}
            InputLabelProps={{ shrink: true }}
          />
        </div>
        {/* Applies to Users Card */}
        <div className="w-full bg-[#1F2030] rounded-lg border border-[#333] px-6 py-6 mb-6 shadow-[0_2px_4px_rgba(0,0,0,0.3)] flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <h2
              className="text-[1.15rem] font-extrabold tracking-wide text-[#EEE] pl-4 border-l-4 border-[#6E5FFE] ml-4 mb-2"
              style={{
                fontFamily: "'IBM Plex Sans', Inter, sans-serif",
                letterSpacing: '0.04em',
                textShadow: '0 1px 8px #6E5FFE22',
                textTransform: 'uppercase',
              }}
            >
              Applies to users
            </h2>
            <div className="flex flex-wrap gap-2">
              {usersList.map(user => (
                <span key={user} className={`px-3 py-1 rounded-full text-xs font-semibold border ${selectedUsers.includes(user) ? 'bg-gradient-to-r from-[#6E5FFE] to-[#8F7BFF] text-white border-[#6E5FFE]' : 'bg-[#232346] text-[#B9B9E3] border-[#333]'} cursor-pointer transition`}
                  onClick={() => setSelectedUsers(selectedUsers.includes(user) ? selectedUsers.filter(u => u !== user) : [...selectedUsers, user])}
                  style={{ fontFamily: "'IBM Plex Sans', Inter, sans-serif", fontWeight: 500 }}
                >
                  {user}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-0 mt-2 md:mt-0">
            <span className="text-[#B9B9E3] text-[1.08rem] font-bold" style={{ fontFamily: "'IBM Plex Sans', Inter, sans-serif", letterSpacing: '0.03em', textShadow: '0 1px 6px #6E5FFE11', marginRight: 0 }}>All users</span>
            <Switch
              checked={allUsers}
              onChange={() => setAllUsers(!allUsers)}
              sx={{
                ml: 1,
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
        {/* Activity Settings Card */}
        <div className="w-full bg-[#1F2030] rounded-lg border border-[#333] px-6 py-6 mb-6 shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
          <div className="mt-4 mb-8">
            <h2
              className="text-[1.35rem] font-extrabold tracking-wide text-[#EEE] pl-4 border-l-4 border-[#6E5FFE] ml-4 mb-2"
              style={{
                fontFamily: "'IBM Plex Sans', Inter, sans-serif",
                letterSpacing: '0.04em',
                textShadow: '0 1px 8px #6E5FFE22',
                textTransform: 'uppercase',
              }}
            >
              Activity Settings
            </h2>
            <div className="h-[1px] bg-[#333] w-full mt-8"></div>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-[#B9B9E3] text-[1.08rem] font-bold mb-2 tracking-wide" style={{ fontFamily: "'IBM Plex Sans', Inter, sans-serif", letterSpacing: '0.03em', textShadow: '0 1px 6px #6E5FFE11' }}>Activity type</label>
              <ComboBox
                options={activityTypes.map(type => ({ label: type, value: type }))}
                value={activityType}
                onChange={setActivityType}
                placeholder="Select activity type"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="block text-[#B9B9E3] text-[1.08rem] font-bold mb-2 tracking-wide" style={{ fontFamily: "'IBM Plex Sans', Inter, sans-serif", letterSpacing: '0.03em', textShadow: '0 1px 6px #6E5FFE11' }}>Expiration date</label>
              <div className="flex items-center gap-0">
                <input
                  type="date"
                  className="w-full h-12 px-4 rounded-lg border text-[#DDD] bg-[#1F2030] transition-all duration-150"
                  style={{
                    borderColor: '#444',
                    boxShadow: 'none',
                    outline: 'none',
                    fontSize: 16,
                    fontFamily: "'IBM Plex Sans', Inter, sans-serif",
                  }}
                  disabled={neverExpires}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = '#6E5FFE';
                    e.currentTarget.style.boxShadow = '0 0 0 2px #6E5FFE44';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = '#444';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  onMouseEnter={e => {
                    if (document.activeElement !== e.currentTarget) {
                      e.currentTarget.style.borderColor = '#8F7BFF';
                      e.currentTarget.style.boxShadow = '0 0 0 2px #8F7BFF44';
                    }
                  }}
                  onMouseLeave={e => {
                    if (document.activeElement !== e.currentTarget) {
                      e.currentTarget.style.borderColor = '#444';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                />
                <div className="flex items-center gap-0 cursor-pointer select-none ml-4">
                  <span className="text-[#B9B9E3] text-[1.08rem] font-bold" style={{ fontFamily: "'IBM Plex Sans', Inter, sans-serif", letterSpacing: '0.03em', textShadow: '0 1px 6px #6E5FFE11', marginRight: -4 }}>Never expires</span>
                  <Switch
                    checked={neverExpires}
                    onChange={() => setNeverExpires(!neverExpires)}
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
          </div>
        </div>
        {/* Conditions Card */}
        <div className="space-y-4 p-6 bg-[#1F2030] rounded-lg border border-[#333] mb-6">
          <div className="mt-4 mb-8">
            <h2
              className="text-[1.35rem] font-extrabold tracking-wide text-[#EEE] pl-4 border-l-4 border-[#6E5FFE] ml-4 mb-2"
              style={{
                fontFamily: "'IBM Plex Sans', Inter, sans-serif",
                letterSpacing: '0.04em',
                textShadow: '0 1px 8px #6E5FFE22',
                textTransform: 'uppercase',
              }}
            >
              Conditions
            </h2>
            <div className="h-[1px] bg-[#333] w-full mt-8"></div>
          </div>
          <div className="space-y-4">
            {groups.map((group, groupIdx) => (
              <React.Fragment key={groupIdx}>
                <div>
                  <label
                    className="block text-[#6E5FFE] text-[1.1rem] font-extrabold mb-2 tracking-wider"
                    style={{
                      fontFamily: "'IBM Plex Sans', Inter, sans-serif",
                      letterSpacing: '0.06em',
                      textShadow: '0 1px 8px #6E5FFE22',
                      textTransform: 'uppercase',
                    }}
                  >
                    Group {groupIdx + 1}
                  </label>
                  <div className="bg-[#121324] rounded-lg border border-[#333] p-4 mb-6 flex flex-col gap-3">
                    {group.map((rule, condIdx) => (
                      <div key={condIdx} className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1">
                          <label className="block text-[#B9B9E3] text-[1.08rem] font-bold mb-2 tracking-wide" style={{ fontFamily: "'IBM Plex Sans', Inter, sans-serif", letterSpacing: '0.03em', textShadow: '0 1px 6px #6E5FFE11' }}>Field</label>
                          <ComboBox
                            options={fieldOptions}
                            value={rule.field}
                            onChange={val => {
                              const newGroups = groups.map((g, i) => i === groupIdx ? g.map((r, j) => j === condIdx ? { ...r, field: val } : r) : g);
                              setGroups(newGroups);
                            }}
                            placeholder="Field"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[#B9B9E3] text-[1.08rem] font-bold mb-2 tracking-wide" style={{ fontFamily: "'IBM Plex Sans', Inter, sans-serif", letterSpacing: '0.03em', textShadow: '0 1px 6px #6E5FFE11' }}>Condition</label>
                          <ComboBox
                            options={conditionOptions}
                            value={rule.condition}
                            onChange={val => {
                              const newGroups = groups.map((g, i) => i === groupIdx ? g.map((r, j) => j === condIdx ? { ...r, condition: val } : r) : g);
                              setGroups(newGroups);
                            }}
                            placeholder="Condition"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[#B9B9E3] text-[1.08rem] font-bold mb-2 tracking-wide" style={{ fontFamily: "'IBM Plex Sans', Inter, sans-serif", letterSpacing: '0.03em', textShadow: '0 1px 6px #6E5FFE11' }}>Value</label>
                          <input
                            className="w-full bg-[#121324] border border-[#333] rounded-lg h-12 box-border px-5 py-0 text-[#DDD] text-[16px] placeholder:text-[#666] focus:outline-none focus:border-[#6E5FFE] transition"
                            style={{ fontSize: 16, lineHeight: 1.5 }}
                            placeholder="Value"
                            value={rule.value}
                            onChange={e => {
                              const newGroups = groups.map((g, i) => i === groupIdx ? g.map((r, j) => j === condIdx ? { ...r, value: e.target.value } : r) : g);
                              setGroups(newGroups);
                            }}
                          />
                        </div>
                        <button
                          className="flex items-center justify-center w-8 h-8 rounded-full border border-[#6E5FFE] text-[#6E5FFE] hover:bg-[#232346] hover:text-white transition-all duration-150 focus:outline-none ml-2"
                          onClick={() => removeCondition(groupIdx, condIdx)}
                          type="button"
                          aria-label="Remove condition"
                          title="Remove condition"
                        >
                          <FaMinus style={{ width: 16, height: 16 }} />
                        </button>
                      </div>
                    ))}
                    <div className="w-full pl-0 md:pl-0 flex">
                      <button
                        className="flex items-center gap-2 px-4 py-1 rounded-full border border-[#6E5FFE] text-[#6E5FFE] bg-[#191938] hover:bg-[#232346] hover:text-white transition-all duration-150 focus:outline-none text-[15px] font-medium"
                        onClick={() => addOrCondition(groupIdx)}
                        type="button"
                        aria-label="Add alternative condition"
                        title="Add alternative condition"
                      >
                        <FaPlus style={{ width: 14, height: 14 }} /> Or
                      </button>
                    </div>
                  </div>
                </div>
                {/* AND separator between groups */}
                {groupIdx < groups.length - 1 && (
                  <div className="flex items-center w-full my-4">
                    <div className="flex-1 h-px bg-[#333]" />
                    <span className="mx-4 px-4 py-1 rounded-full border border-[#6E5FFE] text-[#6E5FFE] bg-[#191938] text-[15px] font-medium" style={{ fontFamily: 'IBM Plex Sans' }}>AND</span>
                    <div className="flex-1 h-px bg-[#333]" />
                  </div>
                )}
              </React.Fragment>
            ))}
            <div className="flex items-center justify-center w-full my-4">
              <div className="flex-1 h-px bg-[#333]" />
              <button
                className="flex items-center justify-center w-8 h-8 rounded-full border border-[#6E5FFE] text-[#6E5FFE] hover:bg-[#232346] hover:text-white transition-all duration-150 focus:outline-none"
                onClick={addAndGroup}
                type="button"
                aria-label="Add AND group"
                title="Add AND group"
                style={{ margin: '0 16px' }}
              >
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="11" cy="11" r="9.5" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="11" y1="7" x2="11" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="7" y1="11" x2="15" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
              <div className="flex-1 h-px bg-[#333]" />
            </div>
          </div>
        </div>
        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-6 w-full">
          <Link href="/trusted-activities">
            <button
              className="flex items-center justify-center w-12 h-12 rounded-full border border-[#6E5FFE] text-[#6E5FFE] bg-[#191938] hover:bg-[#232346] hover:text-white transition-all duration-150 focus:outline-none shadow-lg"
              aria-label="Back"
              title="Back"
            >
              <FaArrowLeft style={{ width: 22, height: 22 }} />
            </button>
          </Link>
          <button className="bg-gradient-to-r from-[#6E5FFE] to-[#8F7BFF] hover:from-[#7C6BFF] hover:to-[#A89CFF] text-white font-bold text-[18px] px-10 py-4 rounded-xl shadow-lg transition-all duration-150 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#6E5FFE] focus:ring-offset-2">
            Save Trusted Activity
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrustedActivitiesPage; 