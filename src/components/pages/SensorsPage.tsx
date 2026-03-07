import React, { useState } from 'react';
import { Cpu, Plus, Trash2, Wifi, Info } from 'lucide-react';
import { SensorData } from '../../types';
import { motion } from 'motion/react';

interface SensorConfig {
  id: string;
  type: string;
  mac: string;
  ip: string;
  location: string;
}

export default function SensorsPage({ onlineSensors }: { onlineSensors: SensorData[] }) {
  const [sensors, setSensors] = useState<SensorConfig[]>([
    { id: 'S01', type: 'ESP32', mac: '24:6F:28:XX:XX:01', ip: '192.168.1.101', location: 'Zone A - Réacteur' },
    { id: 'S02', type: 'ESP8266', mac: '50:02:91:XX:XX:02', ip: '192.168.1.102', location: 'Zone B - Stockage' },
  ]);

  const counts = {
    ESP32: sensors.filter(s => s.type === 'ESP32').length,
    ESP8266: sensors.filter(s => s.type === 'ESP8266').length,
    D1MINI: sensors.filter(s => s.type === 'D1MINI').length,
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="glass p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">Gestion des Capteurs</h3>
            <p className="text-sm text-slate-500">Ajouter et configurer les unités ESP sur le réseau</p>
          </div>
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all">
            <Plus size={18} />
            <span>Ajouter Capteur</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { label: 'ESP32', count: counts.ESP32, color: 'from-blue-600/20 to-blue-900/20', border: 'border-blue-500/30' },
            { label: 'ESP8266', count: counts.ESP8266, color: 'from-purple-600/20 to-purple-900/20', border: 'border-purple-500/30' },
            { label: 'D1 Mini', count: counts.D1MINI, color: 'from-emerald-600/20 to-emerald-900/20', border: 'border-emerald-500/30' },
          ].map((card, i) => (
            <div key={i} className={`glass p-6 bg-gradient-to-br ${card.color} ${card.border}`}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-slate-900/50 rounded-xl flex items-center justify-center">
                  <Cpu className="text-white" size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-white">{card.label}</h4>
                  <p className="text-[10px] text-slate-400 uppercase">Architecture</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-white">{card.count}</p>
              <p className="text-xs text-slate-500 mt-1">Unités configurées</p>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] text-slate-500 uppercase tracking-widest border-b border-slate-800">
                <th className="pb-4 font-bold">ID Capteur</th>
                <th className="pb-4 font-bold">Type</th>
                <th className="pb-4 font-bold">MAC Address</th>
                <th className="pb-4 font-bold">IP Address</th>
                <th className="pb-4 font-bold">Localisation</th>
                <th className="pb-4 font-bold">État</th>
                <th className="pb-4 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {sensors.map((s) => {
                const isOnline = onlineSensors.some(os => os.id === s.id);
                return (
                  <tr key={s.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 font-mono text-blue-400">{s.id}</td>
                    <td className="py-4"><span className="bg-slate-800 px-2 py-1 rounded text-xs">{s.type}</span></td>
                    <td className="py-4 font-mono text-xs text-slate-400">{s.mac}</td>
                    <td className="py-4 font-mono text-xs text-slate-400">{s.ip}</td>
                    <td className="py-4">{s.location}</td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
                        <span className={isOnline ? 'text-emerald-400' : 'text-slate-500'}>
                          {isOnline ? 'En ligne' : 'Hors ligne'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4">
                      <button className="text-slate-500 hover:text-rose-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
