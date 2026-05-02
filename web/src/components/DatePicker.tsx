"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function DatePicker({ value, onChange, placeholder = "选择日期", className = "", disabled = false }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  });
  const [calendarPos, setCalendarPos] = useState({ top: 0, left: 0, width: 256 });

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleOpen = () => {
    if (disabled) return;
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const calH = 320; // 日历大约高度
      setCalendarPos({
        top: spaceBelow > calH ? rect.bottom + 4 : rect.top - calH - 4,
        left: rect.left,
        width: Math.max(rect.width, 256)
      });
    }
    setIsOpen(!isOpen);
  };
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const handleDateClick = (d: number) => {
    const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const setToday = () => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    onChange(dateStr);
    setViewDate(today);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        ref={buttonRef}
        disabled={disabled}
        onClick={handleOpen}
        className={`w-full flex items-center justify-between text-left ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className={value ? "" : "text-primary-400"}>{value || placeholder}</span>
        <Calendar className="w-4 h-4 text-primary-400 shrink-0 ml-2" />
      </button>

      {isOpen && (
        <div
          style={{ position: 'fixed', top: calendarPos.top, left: calendarPos.left, width: calendarPos.width, zIndex: 9999 }}
          className="bg-white rounded-xl shadow-xl border border-primary-100 p-4 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex justify-between items-center mb-3">
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)); }}
              className="p-1 hover:bg-primary-50 rounded-md transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-primary-600" />
            </button>
            <span className="font-bold text-sm text-primary-900">
              {viewDate.getFullYear()}年{viewDate.getMonth() + 1}月
            </span>
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)); }}
              className="p-1 hover:bg-primary-50 rounded-md transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-primary-600" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 font-medium text-primary-400">
            {['一','二','三','四','五','六','日'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {Array(getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth())).fill(null).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth()) }, (_, i) => i + 1).map(d => {
              const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const isSelected = dateStr === value;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDateClick(d); }}
                  className={`w-7 h-7 flex items-center justify-center rounded-md hover:bg-primary-100 transition-colors mx-auto ${isSelected ? 'bg-primary-900 text-white hover:bg-primary-800 font-bold' : 'text-primary-900'}`}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-primary-50 flex justify-between">
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(''); setIsOpen(false); }}
              className="text-xs font-medium text-primary-400 hover:text-rose-500"
            >
              清除
            </button>
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); setToday(); }}
              className="text-xs font-medium text-primary-600 hover:text-primary-900"
            >
              回到今天
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
