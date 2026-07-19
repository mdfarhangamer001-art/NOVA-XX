import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const Preloader: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += Math.random() * 15;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setTimeout(onComplete, 800); // Hold at 100% briefly
      }
      setProgress(current);
    }, 100);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black overflow-hidden"
      exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
    >
      <div className="relative flex items-center justify-center">
        {/* Glowing orb / 3D-ish feel */}
        <motion.div
          animate={{ scale: [0.9, 1.1, 0.9], rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="w-32 h-32 rounded-full border border-purple-500/30"
          style={{ boxShadow: '0 0 60px rgba(168, 85, 247, 0.4), inset 0 0 20px rgba(168, 85, 247, 0.2)' }}
        />
        
        {/* Hexagon or geometric inner element */}
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          className="absolute w-20 h-20 border border-emerald-500/40 rounded-sm"
          style={{ transform: 'rotate(45deg)', boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)' }}
        />

        <div className="absolute font-mono text-sm tracking-[4px] text-white/90">
          {Math.floor(progress)}%
        </div>
      </div>

      <motion.div 
        className="mt-12 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h1 className="text-2xl font-bold tracking-[8px] bg-gradient-to-r from-purple-400 to-emerald-400 bg-clip-text text-transparent">
          NOVA-X
        </h1>
        <p className="mt-3 text-xs tracking-[4px] text-zinc-500 uppercase">
          Neural Core Initializing
        </p>
      </motion.div>

      {/* Progress Bar */}
      <div className="absolute bottom-20 w-64 h-[2px] bg-white/10 rounded-full overflow-hidden">
        <motion.div 
          className="h-full bg-gradient-to-r from-purple-500 to-emerald-500"
          style={{ width: `${progress}%` }}
          layout
        />
      </div>
    </motion.div>
  );
};
