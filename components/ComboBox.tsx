import React, { useState, useRef, useEffect } from 'react';
import { FaCheck, FaTimes } from 'react-icons/fa';

interface ComboBoxOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  group?: string;
}

interface ComboBoxProps {
  options: ComboBoxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  clearable?: boolean;
  disabled?: boolean;
  grouped?: boolean;
}

const ComboBox: React.FC<ComboBoxProps> = ({
  options,
  value,
  onChange,
  placeholder = '',
  className = '',
  clearable = true,
  disabled = false,
  grouped = false,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focusedIdx, setFocusedIdx] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Group options if needed
  let groupedOptions: Record<string, ComboBoxOption[]> = {};
  if (grouped) {
    options.forEach(opt => {
      const group = opt.group || 'Other';
      if (!groupedOptions[group]) groupedOptions[group] = [];
      groupedOptions[group].push(opt);
    });
  }

  // Filtered options
  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  // Handle outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setFocusedIdx(-1);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        setFocusedIdx(idx => Math.min(idx + 1, filteredOptions.length - 1));
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        setFocusedIdx(idx => Math.max(idx - 1, 0));
        e.preventDefault();
      } else if (e.key === 'Enter' && focusedIdx >= 0) {
        onChange(filteredOptions[focusedIdx].value);
        setOpen(false);
        setFocusedIdx(-1);
      } else if (e.key === 'Escape') {
        setOpen(false);
        setFocusedIdx(-1);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, focusedIdx, filteredOptions, onChange]);

  // Animation classes
  const menuAnim = open
    ? 'opacity-100 translate-y-0 pointer-events-auto'
    : 'opacity-0 -translate-y-2 pointer-events-none';

  // Custom arrow SVG
  const Arrow = (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
      style={{ color: '#BBB' }}
    >
      <path d="M6 8l4 4 4-4" stroke="#BBB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  // Render options (with grouping if needed)
  const renderOptions = () => {
    if (grouped) {
      return Object.entries(groupedOptions).map(([group, opts]) => (
        <div key={group}>
          <div className="px-3 py-1 text-xs uppercase tracking-wide text-[#888] font-semibold" style={{ fontSize: 12, letterSpacing: 1 }}>{group}</div>
          {opts.map(renderOption)}
        </div>
      ));
    }
    return filteredOptions.map(renderOption);
  };

  function renderOption(opt: ComboBoxOption, idx?: number) {
    const isSelected = value === opt.value;
    const isFocused = focusedIdx === idx;
    return (
      <div
        key={opt.value}
        className={`flex items-center px-4 py-2 cursor-pointer select-none transition-colors duration-150 rounded
          ${isSelected ? 'bg-[#232346] text-white' : isFocused ? 'bg-[#6E5FFE] text-white' : 'text-[#DDD]'}
          hover:bg-[#6E5FFE] hover:text-white relative`}
        style={{ fontFamily: 'IBM Plex Sans', fontWeight: isFocused ? 500 : 400, fontSize: 16 }}
        onMouseDown={() => {
          onChange(opt.value);
          setOpen(false);
          setFocusedIdx(-1);
        }}
        onMouseEnter={() => setFocusedIdx(idx ?? -1)}
      >
        {opt.icon && <span className="mr-2 flex-shrink-0" style={{ width: 16, height: 16 }}>{opt.icon}</span>}
        <span>{opt.label}</span>
        {isSelected && (
          <FaCheck className="absolute right-3 text-[#DDD]" style={{ width: 16, height: 16 }} />
        )}
      </div>
    );
  }

  // Get selected label
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`relative ${className}`} style={{ fontFamily: 'IBM Plex Sans' }}>
      <div
        className={`flex items-center border rounded-lg px-4 py-3 transition-all duration-150 bg-[#121324] cursor-pointer ${open ? 'border-[#6E5FFE]' : 'border-[#444]'}`}
        style={{
          minHeight: 48,
          paddingTop: 12,
          paddingBottom: 12,
          paddingLeft: 16,
          paddingRight: 16,
          boxShadow: open ? '0 0 0 2px #6E5FFE33, 0 2px 6px rgba(0,0,0,0.4)' : 'none',
          outline: 'none',
        }}
        onClick={() => {
          if (!disabled) setOpen(o => !o);
          if (!open) setTimeout(() => inputRef.current?.focus(), 0);
        }}
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <input
          ref={inputRef}
          className="flex-1 bg-transparent outline-none border-none text-[#DDD] text-[16px] font-normal placeholder-[#666] focus:outline-none focus:ring-0"
          style={{ fontFamily: 'IBM Plex Sans', fontWeight: 400, minWidth: 0, outline: 'none', boxShadow: 'none' }}
          value={open ? search : selectedOption?.label || ''}
          onChange={e => {
            setSearch(e.target.value);
            setOpen(true);
            setFocusedIdx(0);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          spellCheck={false}
        />
        {clearable && value && (
          <button
            className="ml-2 text-[#BBB] hover:text-[#FFF] p-1 focus:outline-none"
            style={{ background: 'none', border: 'none' }}
            tabIndex={-1}
            onClick={e => {
              e.stopPropagation();
              onChange('');
              setSearch('');
              setOpen(false);
            }}
            aria-label="Clear selection"
          >
            <FaTimes style={{ width: 16, height: 16 }} />
          </button>
        )}
        <span className="ml-2 flex-shrink-0">{Arrow}</span>
      </div>
      {/* Dropdown menu */}
      <div
        ref={menuRef}
        className={`absolute left-0 z-20 w-full mt-2 rounded-lg bg-[#232346] border border-[#444] shadow-lg transition-all duration-150 ${menuAnim}`}
        style={{
          maxHeight: 240,
          overflowY: 'auto',
          fontFamily: 'IBM Plex Sans',
          fontWeight: 400,
          fontSize: 16,
          boxShadow: open ? '0 2px 6px rgba(0,0,0,0.4)' : undefined,
          transition: 'opacity 150ms, transform 150ms',
          scrollbarColor: '#333 #232346',
          scrollbarWidth: 'thin',
        }}
        role="listbox"
        aria-hidden={!open}
      >
        <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 6px; background: #232346; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 6px; }
        `}</style>
        <div className="custom-scrollbar">
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-3 text-[#888]">No options</div>
          ) : (
            renderOptions()
          )}
        </div>
      </div>
    </div>
  );
};

export type { ComboBoxOption };
export default ComboBox; 