import React, { useRef, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';

interface TrackMiniatureProps {
  year: number;
  round: number;
}

export default function TrackMiniature({ year, round }: TrackMiniatureProps) {
  const { data, loading, error } = useApi<any>(`/api/sessions/${year}/${round}/track?type=R`);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!data || !data.track_points || data.track_points.length === 0 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const points = data.track_points;
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Encuentra los limites para escalar
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    
    // Padding para que no toque los bordes
    const padding = 10;
    const scaleX = (width - padding * 2) / rangeX;
    const scaleY = (height - padding * 2) / rangeY;
    const scale = Math.min(scaleX, scaleY);

    const centerX = minX + rangeX / 2;
    const centerY = minY + rangeY / 2;

    const rotation = data.rotation || 0;
    const rotRad = (rotation * Math.PI) / 180;

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(rotRad);

    ctx.beginPath();
    points.forEach((p: any, i: number) => {
      // Invertir Y (el sistema de coordenadas de F1 suele tener Y invertido respecto a pantalla)
      const x = (p.x - centerX) * scale;
      const y = -(p.y - centerY) * scale;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.restore();
  }, [data]);

  if (loading) {
    return <div className="w-full h-full flex items-center justify-center opacity-20"><div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin"></div></div>;
  }

  if (error || !data || !data.track_points || data.track_points.length === 0) {
    // Silently fallback if no data
    return null;
  }

  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={400} 
      className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
    />
  );
}
