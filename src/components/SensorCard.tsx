import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { Activity, Thermometer, Droplets, Wind, AlertTriangle } from 'lucide-react';
import { SensorData } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ICON_MAP = {
  H2S: Wind,
  CO: Activity,
  TEMP: Thermometer,
  HUM: Droplets,
  SMOKE: Wind,
  LPG: Activity,
  CO2: Wind,
  VOC: Wind
};

const COLOR_MAP = {
  SAFE: '#BFFF00',
  WARNING: '#f59e0b',
  DANGER: '#f43f5e'
};

interface SensorCardProps {
  sensor: SensorData;
  isDarkMode: boolean;
}

export default function SensorCard({ sensor, isDarkMode }: SensorCardProps) {
  const Icon = ICON_MAP[sensor.type] || Activity;
  const color = COLOR_MAP[sensor.status];

  return (
    <div className={cn(
      "glass p-5 flex flex-col gap-4 transition-all hover:border-slate-600",
      isDarkMode ? "border-white/5" : "border-slate-200",
      sensor.status === 'DANGER' && "border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.1)]"
    )}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            sensor.status === 'SAFE' && "bg-ocp-green/10 text-ocp-green",
            sensor.status === 'WARNING' && "bg-amber-500/10 text-amber-400",
            sensor.status === 'DANGER' && "bg-rose-500/10 text-rose-400"
          )}>
            <Icon size={20} />
          </div>
          <div>
            <h3 className={cn("font-bold text-sm", isDarkMode ? "text-white" : "text-slate-900")}>{sensor.name}</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{sensor.location}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-baseline gap-1">
            <span className={cn("text-2xl font-bold", isDarkMode ? "text-white" : "text-slate-900")}>{sensor.value.toFixed(1)}</span>
            <span className="text-xs text-slate-500">{sensor.unit}</span>
          </div>
          {sensor.status !== 'SAFE' && (
            <div className={cn(
              "flex items-center gap-1 text-[10px] font-bold mt-1",
              sensor.status === 'DANGER' ? "text-rose-400" : "text-amber-400"
            )}>
              <AlertTriangle size={10} />
              {sensor.status}
            </div>
          )}
        </div>
      </div>

      <div className="h-24 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sensor.history}>
            <defs>
              <linearGradient id={`gradient-${sensor.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={color} 
              fillOpacity={1} 
              fill={`url(#gradient-${sensor.id})`} 
              strokeWidth={2}
              isAnimationActive={false}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: 'none', 
                borderRadius: '8px', 
                fontSize: '10px',
                color: '#fff'
              }}
              itemStyle={{ color: '#fff' }}
              labelStyle={{ display: 'none' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
