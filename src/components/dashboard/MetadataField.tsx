import React, { useState, useEffect, useId } from "react";
import { LucideIcon } from "lucide-react";

interface MetadataFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: LucideIcon;
  placeholder?: string;
  description?: string;
}

export const MetadataField: React.FC<MetadataFieldProps> = ({
  label,
  value,
  onChange,
  icon: Icon,
  placeholder,
  description,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const inputId = useId();

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div className="flex flex-col space-y-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor={inputId}
          className="text-xs font-bold text-slate-800 uppercase tracking-wider"
        >
          {label}
        </label>
        {description && (
          <span className="text-[11px] text-slate-500">{description}</span>
        )}
      </div>

      <div className="relative flex items-center">
        <div
          className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500"
          aria-hidden="true"
        >
          <Icon size={16} />
        </div>
        <input
          id={inputId}
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={() => onChange(localValue)}
          placeholder={placeholder}
          className="w-full bg-white border-2 border-slate-300 rounded-lg py-2.5 pl-10 pr-3 font-mono text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 transition-colors"
        />
      </div>
    </div>
  );
};

export default MetadataField;
