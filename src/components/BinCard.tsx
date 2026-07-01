import { Bin } from '../types';
import React from 'react';
import { motion } from 'motion/react';
import { 
  Maximize2, 
  RefreshCcw, 
  MapPin, 
  Wifi, 
  WifiOff, 
  AlertTriangle,
  Trash2,
  Box,
  Binary,
  Zap
} from 'lucide-react';
import { cn } from '../lib/utils';
import { doc, deleteDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';

export default function BinCard({ bin, isAdmin }: { bin: Bin, isAdmin: boolean }) {
  const isOffline = bin.status === 'offline';
  const isFull = bin.levels.degradable > 90 || bin.levels.non_degradable > 90;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Decommission device "${bin.name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'bins', bin.id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `bins/${bin.id}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-[40px] p-8 hover:shadow-xl transition-all group overflow-hidden relative border border-black/5"
    >
      {/* Decorative gradient corner */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full translate-x-16 -translate-y-16 group-hover:bg-primary/10 transition-colors"></div>
      
      <div className="flex justify-between items-start mb-8 relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-2xl font-bold tracking-tight text-dark italic font-serif leading-none">{bin.name}</h3>
            {isOffline ? <WifiOff size={16} className="text-[#95a5a6]" /> : <Wifi size={16} className="text-primary animate-pulse" />}
          </div>
          <p className="flex items-center gap-1.5 text-[9px] text-[#95a5a6] font-black tracking-widest uppercase">
            <MapPin size={12} className="text-primary" /> {bin.locationName || bin.name}
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-3">
          <div className={cn(
            "px-4 py-1.5 rounded-xl text-[9px] uppercase font-black tracking-[0.2em] border shadow-sm",
            bin.status === 'online' && "bg-primary/10 text-primary border-primary/20",
            bin.status === 'offline' && "bg-gray-100 text-[#95a5a6] border-black/5",
            bin.status === 'full' && "bg-red-500/10 text-red-500 border-red-500/20",
            bin.status === 'maintenance' && "bg-amber-500/10 text-amber-500 border-amber-500/20"
          )}>
            {bin.status}
          </div>
          {isAdmin && (
            <button 
              onClick={handleDelete}
              className="p-2.5 border border-black/5 bg-gray-50 rounded-xl text-[#95a5a6] hover:text-red-500 hover:bg-red-500/5 transition-all opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6 mb-10 relative z-10">
        <LevelBar 
          label="Biodegradable" 
          value={bin.levels.degradable} 
          color="bg-primary shadow-lg shadow-primary/20" 
          icon={<Box size={10} />}
        />
        <LevelBar 
          label="Non-Biodegradable" 
          value={bin.levels.non_degradable} 
          color="bg-secondary shadow-lg shadow-secondary/20" 
          icon={<Binary size={10} />}
        />
      </div>

      <div className="pt-6 border-t border-black/5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "w-2 h-2 rounded-full",
            bin.mode === 'auto' ? "bg-primary animate-pulse" : "bg-gray-200"
          )}></div>
          <span className="text-[9px] uppercase font-black text-[#95a5a6] tracking-widest leading-none">
            Node Logic: <span className={bin.mode === 'auto' ? "text-primary" : "text-gray-400"}>{bin.mode}</span>
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="p-2.5 bg-gray-50 border border-black/5 text-[#95a5a6] rounded-xl hover:bg-gray-100 hover:text-dark transition-all shadow-sm">
            <RefreshCcw size={16} />
          </button>
          <button className="p-2.5 bg-gray-50 border border-black/5 text-[#95a5a6] rounded-xl hover:bg-gray-100 hover:text-dark transition-all shadow-sm">
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {isFull && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 relative z-10">
          <AlertTriangle size={18} className="text-red-500" />
          <p className="text-[9px] text-red-500 font-black uppercase tracking-[0.2em] leading-none">Maintenance Required</p>
        </div>
      )}

      {/* Metadata ID footer */}
      <div className="mt-4 flex justify-between items-center opacity-30 pointer-events-none px-1">
         <span className="text-[7px] font-mono font-bold tracking-tighter text-dark">ID: {bin.id.toUpperCase()}</span>
         <Zap size={8} className="text-dark" />
      </div>
    </motion.div>
  );
}

function LevelBar({ label, value, color, icon }: { label: string, value: number, color: string, icon: React.ReactNode }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] uppercase font-black tracking-[0.2em] mb-2.5 px-1 items-center">
        <span className="text-[#95a5a6] flex items-center gap-2">
           <span className="opacity-40">{icon}</span>
           {label}
        </span>
        <span className="text-dark bg-gray-100 px-2 py-0.5 rounded-md border border-black/5 font-bold">{value}%</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden border border-black/5 p-[1px]">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.5, ease: "circOut" }}
          className={cn("h-full rounded-full", color)}
        ></motion.div>
      </div>
    </div>
  );
}
