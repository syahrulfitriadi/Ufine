import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Custom dropdown component that supports Lucide icons in options.
 * Replaces native <select> for a modern, fresh look.
 */
const IconSelect = ({ value, onChange, options, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, []);

    const selected = options.find(o => o.value === value);
    const Icon = selected?.icon;

    return (
        <div ref={ref} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between gap-2 py-2 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 outline-none focus:border-sage-400 transition-colors"
            >
                <span className="flex items-center gap-2 truncate">
                    {Icon && <Icon size={15} className="text-sage-500 dark:text-sage-400 shrink-0" />}
                    <span className="truncate">{selected?.label || ''}</span>
                </span>
                <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    {options.map((opt) => {
                        const OptIcon = opt.icon;
                        const isSelected = opt.value === value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors
                                    ${isSelected
                                        ? 'bg-sage-50 dark:bg-sage-900/30 text-sage-700 dark:text-sage-300'
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                    }`}
                            >
                                {OptIcon && <OptIcon size={15} className={isSelected ? 'text-sage-500' : 'text-slate-400'} />}
                                <span>{opt.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default IconSelect;
