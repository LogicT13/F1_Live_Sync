import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, Flag } from 'lucide-react';
import { RCMessage } from '@/hooks/useLiveSocket';

interface RCNotificationsProps {
  messages: RCMessage[];
  currentTime: number;
}

export default function RCNotifications({ messages, currentTime }: RCNotificationsProps) {
  const [minimized, setMinimized] = useState(false);
  const [displayMessages, setDisplayMessages] = useState<{msg: RCMessage, exiting: boolean}[]>([]);

  useEffect(() => {
    // Only show messages from the last 20 seconds of session time, up to 5 at a time
    const recent = [...messages]
      .reverse()
      .filter(msg => currentTime - msg.timestamp <= 20 && currentTime >= msg.timestamp)
      .slice(0, 5);
      
    setDisplayMessages(prev => {
        const next = [...prev];
        // Mark as exiting if they are in prev but not in recent
        next.forEach(item => {
            if (!recent.some(r => r.message === item.msg.message && r.timestamp === item.msg.timestamp)) {
                item.exiting = true;
            }
        });
        // Add new messages
        recent.forEach(r => {
            if (!next.some(item => item.msg.message === r.message && item.msg.timestamp === r.timestamp)) {
                next.push({ msg: r, exiting: false });
            }
        });
        // Remove those that have been exiting for a while (handled by another effect/timeout or just clean up here)
        // Actually it's easier to just clean them up after 500ms
        return next;
    });
  }, [messages, currentTime]);
  
  useEffect(() => {
      const timer = setInterval(() => {
          setDisplayMessages(prev => prev.filter(item => !item.exiting));
      }, 500); // 500ms is the duration of the exit animation
      return () => clearInterval(timer);
  }, []);

  const getIcon = (category: string) => {
    if (category === 'Flag') return <Flag className="text-green-400" size={18} />;
    if (category === 'Incident' || category === 'Drs') return <AlertTriangle className="text-orange-400" size={18} />;
    if (category === 'Other') return <Info className="text-blue-400" size={18} />;
    return <AlertCircle className="text-gray-400" size={18} />;
  };

  const getBgColor = (category: string) => {
    if (category === 'Flag') return 'border-yellow-400/50 bg-yellow-400/10';
    if (category === 'Incident') return 'border-orange-400/50 bg-orange-400/10';
    return 'border-gray-700 bg-black/80';
  };

  if (displayMessages.length === 0) return null;

  return (
    <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
      <button 
        onClick={() => setMinimized(!minimized)}
        className="pointer-events-auto bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-1 rounded-full border border-gray-600 transition-colors shadow-lg backdrop-blur-md"
      >
        {minimized ? `${displayMessages.filter(m => !m.exiting).length} Notificaciones` : 'Ocultar'}
      </button>

      {!minimized && displayMessages.map(({msg, exiting}, i) => (
        <div 
          key={`${msg.timestamp}-${msg.message}`}
          className={`pointer-events-auto flex items-start gap-3 p-3 rounded-lg border shadow-xl backdrop-blur-md w-72 transition-all duration-500 transform origin-top-right ${exiting ? 'opacity-0 translate-x-8 scale-95' : 'animate-slide-in'} ${getBgColor(msg.category)}`}
        >
          <div className="shrink-0 mt-0.5">
            {getIcon(msg.category)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-gray-200 capitalize">
              {msg.category === 'Flag' ? `Bandera` : msg.category}
            </div>
            <p className="text-xs text-gray-300 mt-1 line-clamp-3 hover:line-clamp-none cursor-pointer" title="Click para expandir">
              {msg.message}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
