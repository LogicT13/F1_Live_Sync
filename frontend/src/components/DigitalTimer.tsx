import React, { useState, useEffect } from 'react';

interface DigitalTimerProps {
  targetDate: string;
}

export function DigitalTimer({ targetDate }: DigitalTimerProps) {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  function calculateTimeLeft(target: string) {
    const diff = new Date(target).getTime() - new Date().getTime();
    if (diff <= 0) return { d: '00', h: '00', m: '00', s: '00' };

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / 1000 / 60) % 60);
    const s = Math.floor((diff / 1000) % 60);

    return {
      d: d.toString().padStart(2, '0'),
      h: h.toString().padStart(2, '0'),
      m: m.toString().padStart(2, '0'),
      s: s.toString().padStart(2, '0')
    };
  }

  return (
    <div className="flex items-center gap-4 text-white font-mono text-4xl md:text-5xl font-light tracking-widest">
      <div className="flex flex-col items-center justify-start text-gray-500 font-bold mr-2">
        <span>T-</span>
        <span className="text-[10px] text-transparent mt-1">-</span>
      </div>
      <div className="flex flex-col items-center">
        <span>{timeLeft.d}</span>
        <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mt-1 font-sans font-bold">Dias</span>
      </div>
      <span className="text-gray-700 font-sans pb-4">:</span>
      <div className="flex flex-col items-center">
        <span>{timeLeft.h}</span>
        <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mt-1 font-sans font-bold">Hrs</span>
      </div>
      <span className="text-gray-700 font-sans pb-4">:</span>
      <div className="flex flex-col items-center">
        <span>{timeLeft.m}</span>
        <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mt-1 font-sans font-bold">Min</span>
      </div>
      <span className="text-gray-700 font-sans pb-4">:</span>
      <div className="flex flex-col items-center">
        <span className="text-f1-red font-medium">{timeLeft.s}</span>
        <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mt-1 font-sans font-bold">Seg</span>
      </div>
    </div>
  );
}
