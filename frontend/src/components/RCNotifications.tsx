import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, Flag } from 'lucide-react';
import { RCMessage } from '@/hooks/useLiveSocket';

interface RCNotificationsProps {
  messages: RCMessage[];
  currentTime: number;
}

export default function RCNotifications({ messages, currentTime }: RCNotificationsProps) {
  const [minimized, setMinimized] = useState(false);
  const [activeMessages, setActiveMessages] = useState<RCMessage[]>([]);

  useEffect(() => {
    // Only show messages from the last 20 seconds of session time, up to 5 at a time
    const recent = [...messages]
      .reverse()
      .filter(msg => currentTime - msg.timestamp <= 20 && currentTime >= msg.timestamp)
      .slice(0, 5);
    setActiveMessages(recent);
  }, [messages, currentTime]);

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

  if (activeMessages.length === 0) return null;

  return (
    <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
      <button 
        onClick={() => setMinimized(!minimized)}
        className="pointer-events-auto bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-1 rounded-full border border-gray-600 transition-colors shadow-lg backdrop-blur-md"
      >
        {minimized ? `${activeMessages.length} Notificaciones` : 'Ocultar'}
      </button>

      {!minimized && activeMessages.map((msg, i) => (
        <div 
          key={i} 
          className={`pointer-events-auto flex items-start gap-3 p-3 rounded-lg border shadow-xl backdrop-blur-md w-72 transition-all transform origin-top-right animate-in fade-in slide-in-from-right-4 ${getBgColor(msg.category)}`}
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
