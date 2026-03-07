import React from 'react';
import { Brain, Zap, Wrench, Calendar, Lightbulb, TrendingUp, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

export default function AIPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* AI Header */}
      <div className="glass p-8 bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border-indigo-500/30">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-900/40">
            <Brain className="text-white" size={32} />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-white mb-1">Intelligence Artificielle Prédictive</h3>
            <p className="text-slate-400">Analyse en temps réel des risques et maintenance préventive assistée par Gemini AI</p>
          </div>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2">
            <Zap size={18} />
            Lancer l'Analyse
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Risk Predictions */}
        <div className="glass p-6">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="text-amber-500" size={20} />
            <h4 className="font-bold text-white">Prédiction des Risques Gazeux</h4>
          </div>
          <div className="space-y-4">
            {[
              { zone: 'Jorf Lasfar Unit A', gas: 'H₂S', risk: 35, trend: 'Croissante' },
              { zone: 'Safi Storage', gas: 'CO', risk: 68, trend: 'Stable' },
            ].map((p, i) => (
              <div key={i} className="bg-slate-800/40 border border-slate-700 p-4 rounded-xl">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-bold text-white">{p.zone}</span>
                  <span className={`text-xs font-bold ${p.risk > 50 ? 'text-rose-400' : 'text-amber-400'}`}>{p.risk}% Risque</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full ${p.risk > 50 ? 'bg-rose-500' : 'bg-amber-500'}`} style={{ width: `${p.risk}%` }} />
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-slate-500 uppercase font-bold">
                  <span>Gaz: {p.gas}</span>
                  <span>Tendance: {p.trend}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sensor Health */}
        <div className="glass p-6">
          <div className="flex items-center gap-3 mb-6">
            <Wrench className="text-blue-500" size={20} />
            <h4 className="font-bold text-white">État de Santé des Capteurs</h4>
          </div>
          <div className="space-y-4">
            {[
              { id: 'S01', health: 87, issue: 'Dérive de calibration' },
              { id: 'S02', health: 45, issue: 'Batterie critique' },
            ].map((s, i) => (
              <div key={i} className="bg-slate-800/40 border border-slate-700 p-4 rounded-xl">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-bold text-white">Capteur {s.id}</span>
                  <span className="text-xs font-bold text-blue-400">{s.health}% Santé</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${s.health}%` }} />
                </div>
                <p className="text-[10px] text-slate-500 mt-2 italic">{s.issue}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Maintenance Schedule */}
      <div className="glass p-6">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="text-emerald-500" size={20} />
          <h4 className="font-bold text-white">Planning de Maintenance Prédictive</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] text-slate-500 uppercase tracking-widest border-b border-slate-800">
                <th className="pb-4">Unité</th>
                <th className="pb-4">Probabilité Panne</th>
                <th className="pb-4">Temps Estimé</th>
                <th className="pb-4">Action Recommandée</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className="border-b border-slate-800/50">
                <td className="py-4 font-bold text-blue-400">S02 - Safi Unit B</td>
                <td className="py-4">78%</td>
                <td className="py-4">3-5 jours</td>
                <td className="py-4">Remplacement batterie et recalibration</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="glass p-6">
        <div className="flex items-center gap-3 mb-6">
          <Lightbulb className="text-amber-500" size={20} />
          <h4 className="font-bold text-white">Recommandations IA</h4>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex gap-4">
          <div className="p-2 bg-amber-500/20 rounded-lg h-fit">
            <AlertTriangle className="text-amber-500" size={20} />
          </div>
          <p className="text-sm text-slate-300">
            Augmentation anormale du CO détectée en Zone B. Bien que sous le seuil critique, la tendance suggère une fuite mineure potentielle. Inspection visuelle recommandée avant la fin du shift.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
