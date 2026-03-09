import React from 'react';
import { ShieldCheck, AlertTriangle, Skull, Info } from 'lucide-react';
import { SensorData } from '../../types';
import { motion } from 'motion/react';

export default function SafetyPage({ onlineSensors }: { onlineSensors: SensorData[] }) {
  const grouped = {
    SAFE: onlineSensors.filter(s => s.status === 'SAFE'),
    WARNING: onlineSensors.filter(s => s.status === 'WARNING'),
    DANGER: onlineSensors.filter(s => s.status === 'DANGER'),
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {/* ISO 45001 Limits Table */}
      <div className="glass p-6">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="text-ocp-green" size={24} />
          <h3 className="text-lg font-bold text-white">Limites d'Exposition ISO 45001</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] text-slate-500 uppercase tracking-widest border-b border-slate-800">
                <th className="pb-4">Substance / Paramètre</th>
                <th className="pb-4 text-emerald-400">Sûr (TWA)</th>
                <th className="pb-4 text-amber-400">Avertissement (STEL)</th>
                <th className="pb-4 text-rose-400">Toxique (IDLH)</th>
                <th className="pb-4">Unité</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {[
                { name: 'H₂S (Sulfure d\'hydrogène)', safe: '≤ 10', warn: '10 - 15', danger: '> 100', unit: 'ppm' },
                { name: 'CO (Monoxyde de carbone)', safe: '≤ 25', warn: '25 - 100', danger: '> 300', unit: 'ppm' },
                { name: 'Température Ambiante', safe: '≤ 40', warn: '40 - 50', danger: '> 60', unit: '°C' },
              ].map((row, i) => (
                <tr key={i} className="border-b border-slate-800/50">
                  <td className="py-4 font-bold text-slate-200">{row.name}</td>
                  <td className="py-4 text-emerald-400 font-mono">{row.safe}</td>
                  <td className="py-4 text-amber-400 font-mono">{row.warn}</td>
                  <td className="py-4 text-rose-400 font-mono">{row.danger}</td>
                  <td className="py-4 text-slate-500">{row.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Zone Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 border-t-4 border-emerald-500">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-emerald-400 uppercase text-xs">Zones Sûres</h4>
            <ShieldCheck size={20} className="text-emerald-500" />
          </div>
          <p className="text-4xl font-bold text-white mb-2">{grouped.SAFE.length}</p>
          <div className="space-y-2">
            {grouped.SAFE.map(s => (
              <div key={s.id} className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded text-[10px] text-emerald-400">
                {s.name} - {s.location}
              </div>
            ))}
          </div>
        </div>

        <div className="glass p-6 border-t-4 border-amber-500">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-amber-400 uppercase text-xs">Avertissement</h4>
            <AlertTriangle size={20} className="text-amber-500" />
          </div>
          <p className="text-4xl font-bold text-white mb-2">{grouped.WARNING.length}</p>
          <div className="space-y-2">
            {grouped.WARNING.map(s => (
              <div key={s.id} className="bg-amber-500/10 border border-amber-500/20 p-2 rounded text-[10px] text-amber-400">
                {s.name} - {s.location}
              </div>
            ))}
          </div>
        </div>

        <div className="glass p-6 border-t-4 border-rose-500 bg-rose-500/5">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-rose-400 uppercase text-xs">Zones Toxiques</h4>
            <Skull size={20} className="text-rose-500" />
          </div>
          <p className="text-4xl font-bold text-white mb-2">{grouped.DANGER.length}</p>
          <div className="space-y-2">
            {grouped.DANGER.map(s => (
              <div key={s.id} className="bg-rose-500/10 border border-rose-500/20 p-2 rounded text-[10px] text-rose-400 animate-pulse">
                {s.name} - {s.location}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
