import React, { useState, useRef, useEffect } from'react';
import { ChevronDown, Check } from'lucide-react';
import { motion, AnimatePresence } from'motion/react';

interface MultiSelectProps {
 label: string;
 options: string[];
 selectedValues: string[];
 onToggle: (value: string) => void;
}

export default function MultiSelect({ label, options, selectedValues, onToggle }: MultiSelectProps) {
 const [isOpen, setIsOpen] = useState(false);
 const containerRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
 const handleClickOutside = (event: MouseEvent) => {
 if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
 setIsOpen(false);
 }
 };
 document.addEventListener('mousedown', handleClickOutside);
 return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);

 const isAllSelected = selectedValues.includes('All');

 const displayText = isAllSelected
 ? 'All'
 : selectedValues.length > 1
 ? `${selectedValues.length} Items`
 : selectedValues[0];

 return (
 <div className="relative" ref={containerRef}>
 <div className="flex h-8 items-center gap-1.5 rounded-md border border-[#e8e8e8] bg-[#fafafa] px-2">
 <span className="text-[10px] font-medium uppercase tracking-wide text-[#8c8c8c]">{label}</span>
 <button
 onClick={() => setIsOpen(!isOpen)}
 className="flex min-w-[72px] items-center justify-between gap-1.5 text-xs font-semibold text-[#262626] focus:outline-none"
 >
 <span className="truncate">{displayText}</span>
 <ChevronDown className={`h-3 w-3 text-[#8c8c8c] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
 </button>
 </div>

 <AnimatePresence>
 {isOpen && (
 <motion.div
 initial={{ opacity: 0, y: 6 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: 6 }}
 className="absolute left-0 top-full z-[100] mt-1.5 w-56 overflow-hidden rounded-lg border border-[#e8e8e8] bg-white shadow-lg"
 >
 <div className="max-h-72 space-y-0.5 overflow-y-auto p-1.5">
 {options.map((option) => {
 const isSelected = selectedValues.includes(option);
 return (
 <button
 key={option}
 onClick={() => onToggle(option)}
 className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-xs font-medium transition-colors ${
 isSelected
 ? 'bg-[#e6f4ff] text-[#1677ff]'
 : 'text-[#595959] hover:bg-[#f5f5f5]'
 }`}
 >
 <span className="truncate">{option}</span>
 {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
 </button>
 );
 })}
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
}
