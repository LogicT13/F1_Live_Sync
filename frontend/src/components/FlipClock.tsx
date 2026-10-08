import React, { useEffect, useState } from 'react';

interface FlipClockProps {
  targetDate: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const calculateTimeLeft = (targetDate: string): TimeLeft => {
  const difference = new Date(targetDate).getTime() - new Date().getTime();
  let timeLeft: TimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };

  if (difference > 0) {
    timeLeft = {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60)
    };
  }

  return timeLeft;
};

const FlipUnit = ({ label, value }: { label: string, value: number }) => {
  const formattedValue = value < 10 ? `0${value}` : value.toString();
  
  return (
    <div className="flex flex-col items-center mx-1 sm:mx-2">
      <div className="relative bg-black rounded-lg border-2 border-gray-800 shadow-xl overflow-hidden min-w-[50px] sm:min-w-[70px] h-[60px] sm:h-[80px] flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-black opacity-50"></div>
        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-gray-900 z-10"></div>
        <span className="relative z-20 text-3xl sm:text-5xl font-mono font-bold text-white tracking-widest drop-shadow-md">
          {formattedValue}
        </span>
      </div>
      <span className="text-[10px] sm:text-xs text-gray-400 mt-2 font-bold uppercase tracking-widest">{label}</span>
    </div>
  );
};

const FlipClock: React.FC<FlipClockProps> = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="flex items-center justify-center bg-[#15151e] p-4 rounded-xl border border-gray-800/50 shadow-2xl">
      <FlipUnit label="Days" value={timeLeft.days} />
      <span className="text-gray-500 font-bold text-3xl pb-6">:</span>
      <FlipUnit label="Hours" value={timeLeft.hours} />
      <span className="text-gray-500 font-bold text-3xl pb-6">:</span>
      <FlipUnit label="Mins" value={timeLeft.minutes} />
      <span className="text-gray-500 font-bold text-3xl pb-6">:</span>
      <FlipUnit label="Secs" value={timeLeft.seconds} />
    </div>
  );
};

export default FlipClock;
