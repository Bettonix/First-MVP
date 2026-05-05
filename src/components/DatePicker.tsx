"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from "lucide-react";

interface DatePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  label?: string;
}

export function PremiumDatePicker({ selectedDate, onDateChange, label = "Filtrar por data" }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date(selectedDate));

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onDateChange(newDate);
    setIsOpen(false);
  };

  const renderDays = () => {
    const days = [];
    const totalDays = daysInMonth(viewDate.getFullYear(), viewDate.getMonth());
    const startDay = firstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());

    // Padding for first week
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10" />);
    }

    for (let day = 1; day <= totalDays; day++) {
      const isSelected = 
        selectedDate.getDate() === day && 
        selectedDate.getMonth() === viewDate.getMonth() && 
        selectedDate.getFullYear() === viewDate.getFullYear();
      
      const isToday = 
        new Date().getDate() === day && 
        new Date().getMonth() === viewDate.getMonth() && 
        new Date().getFullYear() === viewDate.getFullYear();

      days.push(
        <button
          key={day}
          onClick={() => handleDateSelect(day)}
          className={`
            h-10 w-10 rounded-xl text-sm font-bold transition-all flex items-center justify-center
            ${isSelected ? 'bg-[var(--brasa)] text-white' : 
              isToday ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
              'dash-pill-inactive hover:dash-value'}
          `}
        >
          {day}
        </button>
      );
    }
    return days;
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 dash-muted border dash-border hover:border-[var(--border-md)] rounded-xl transition-all group"
      >
        <CalendarIcon size={14} className="dash-label group-hover:dash-highlight-text transition-colors" />
        <span className="text-xs font-black uppercase tracking-widest dash-label group-hover:dash-value transition-colors">
          {selectedDate.toLocaleDateString('pt-BR')}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile and desktop dismissal */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            {/* Calendar Content */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className={`
                fixed bottom-0 left-0 right-0 z-[200] 
                lg:absolute lg:bottom-auto lg:top-12 lg:right-0 lg:left-auto lg:w-[320px]
                bg-[#13161A] border-t lg:border border-white/10 rounded-t-[32px] lg:rounded-[32px] 
                p-6 shadow-2xl overflow-hidden
              `}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Selecione</span>
                  <h4 className="text-lg font-black text-neutral-100 tracking-tighter">
                    {months[viewDate.getMonth()]} <span className="text-neutral-500">{viewDate.getFullYear()}</span>
                  </h4>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={handlePrevMonth} className="p-2 hover:bg-white/5 rounded-xl text-neutral-500 transition-colors"><ChevronLeft size={18} /></button>
                  <button onClick={handleNextMonth} className="p-2 hover:bg-white/5 rounded-xl text-neutral-500 transition-colors"><ChevronRight size={18} /></button>
                </div>
              </div>

              {/* Weekdays */}
              <div className="grid grid-cols-7 mb-2">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                  <div key={i} className="h-10 flex items-center justify-center text-[10px] font-black text-neutral-600 uppercase tracking-widest">
                    {d}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {renderDays()}
              </div>

              {/* Mobile Close Handle */}
              <button 
                onClick={() => setIsOpen(false)}
                className="lg:hidden w-full mt-6 py-3 bg-white/5 rounded-2xl text-xs font-black uppercase tracking-widest text-neutral-400"
              >
                Fechar
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
