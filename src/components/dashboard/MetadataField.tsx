import React, { useState, useEffect } from "react";
import { LucideIcon } from "lucide-react";

interface MetadataFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: LucideIcon;
  placeholder?: string;
}

export const MetadataField: React.FC<MetadataFieldProps> = ({
  label,
  value,
  onChange,
  icon: Icon,
  placeholder,
}) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">
        {label}
      </label>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline-variant group-focus-within:text-primary transition-colors">
          <Icon size={14} />
        </div>
        <input
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={() => onChange(localValue)}
          className="w-full bg-surface-container-low border border-outline-variant/20 focus:border-primary/40 focus:ring-4 focus:ring-primary/5 rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold text-on-surface transition-all outline-none placeholder:text-outline-variant/40 font-mono"
          placeholder={placeholder}
        />
      </div>
    </div>
  );
};
