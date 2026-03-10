import React, { useState, useEffect } from 'react';
import { Brain, Zap, Wrench, Calendar, Lightbulb, TrendingUp, AlertTriangle, BarChart3, Activity, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from 'recharts';
import axios from 'axios';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface RiskData {
  zone: string;
  gas: string;
  risk: number;
  trend: string;
  probability: number;
}

interface SensorHealth {
  id: string;
  name: string;
  health: number;
  issue: string;
  lastMaintenance: string;
}

export default function AIPage({ isDarkMode }: { isDarkMode: boolean }) {
  const [predictions, setPredictions] = useState<{ risks: RiskData[], sensorHealth: SensorHealth[] }>({
    risks: [],
    sensorHealth: []
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const res = await axios.get('/api/ai/predictions');
        setPredictions(res.data);
      } catch (error) {
        console.error("Failed to fetch AI predictions", error);
      }
    };
    fetchPredictions();
  }, []);

  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => setIsAnalyzing(false), 2000);
  };

  const healthData = predictions.sensorHealth.map(s => ({ name: s.name, health: s.health }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
      {/* AI Header */}
      <div className="glass p-8 bg-gradient-to-r from-emerald-900/20 to-ocp-green/20 border-ocp-green/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Brain size={120} />
        </div>
        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          <div className="w-16 h-16 bg-ocp-green rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-900/40">
            <Brain className="text-black" size={32} />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className={cn("text-2xl font-bold mb-1", isDarkMode ? "text-white" : "text-slate-900")}>Intelligence Artificielle Prédictive</h3>
            <p className="text-slate-600 dark:text-slate-400">Analyse en temps réel des risques et maintenance préventive assistée par Gemini AI</p>
          </div>
          <button 
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
            className="bg-ocp-green hover:opacity-90 text-black px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-900/20"
          >
            {isAnalyzing ? <Activity className="animate-spin" size={18} /> : <Zap size={18} />}
            {isAnalyzing ? "Analyse en cours..." : "Lancer l'Analyse"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Predictions */}
        <div className="lg:col-span-2 glass p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-amber-500" size={20} />
              <h4 className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>Prédiction des Risques Industriels</h4>
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Modèle: Gemini-3-Flash</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {predictions.risks.map((p, i) => (
              <div key={i} className={cn("border p-4 rounded-xl", isDarkMode ? "bg-slate-800/40 border-slate-700" : "bg-white/50 border-slate-200")}>
                <div className="flex justify-between mb-2">
                  <span className={cn("text-sm font-bold", isDarkMode ? "text-white" : "text-slate-900")}>{p.zone}</span>
                  <span className={`text-xs font-bold ${p.risk > 50 ? 'text-rose-500' : 'text-amber-500'}`}>{p.risk}% Risque</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${p.risk}%` }}
                    className={`h-full ${p.risk > 50 ? 'bg-rose-500' : 'bg-amber-500'}`} 
                  />
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-slate-500 uppercase font-bold">
                  <span>Gaz: {p.gas}</span>
                  <span>Tendance: {p.trend}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="h-64 w-full bg-slate-800/20 rounded-xl p-4 border border-slate-800">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-4">Probabilité d'Incident par Zone</p>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={predictions.risks}>
                <XAxis dataKey="zone" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="probability" radius={[4, 4, 0, 0]}>
                  {predictions.risks.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.probability > 0.5 ? '#f43f5e' : '#BFFF00'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sensor Health */}
        <div className="glass p-6">
          <div className="flex items-center gap-3 mb-6">
            <Wrench className="text-ocp-green" size={20} />
            <h4 className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>Santé des Capteurs</h4>
          </div>
          <div className="space-y-4">
            {predictions.sensorHealth.map((s, i) => (
              <div key={i} className={cn("border p-4 rounded-xl", isDarkMode ? "bg-slate-800/40 border-slate-700" : "bg-white/50 border-slate-200")}>
                <div className="flex justify-between mb-2">
                  <div className="flex flex-col">
                    <span className={cn("text-sm font-bold", isDarkMode ? "text-white" : "text-slate-900")}>{s.name}</span>
                    <span className="text-[10px] text-slate-500">{s.id}</span>
                  </div>
                  <span className={`text-xs font-bold ${s.health < 60 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>{s.health}%</span>
                </div>
                <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${s.health}%` }}
                    className={`h-full ${s.health < 60 ? 'bg-rose-500' : 'bg-ocp-green'}`} 
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <p className="text-[10px] text-slate-500 italic">{s.issue}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{s.lastMaintenance}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-ocp-green/10 border border-ocp-green/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="text-ocp-green" size={16} />
              <span className="text-xs font-bold text-ocp-green uppercase">Indice de Fiabilité Global</span>
            </div>
            <div className={cn("text-2xl font-bold", isDarkMode ? "text-white" : "text-slate-900")}>92.4%</div>
            <p className="text-[10px] text-slate-500 mt-1">Basé sur 24 capteurs actifs</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Heatmap */}
        <div className="glass p-6">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="text-purple-500" size={20} />
            <h4 className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>Carte Thermique des Risques (Heatmap)</h4>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 16 }).map((_, i) => {
              const intensity = Math.floor(Math.random() * 100);
              return (
                <div 
                  key={i} 
                  className="aspect-square rounded-lg flex items-center justify-center text-[8px] font-bold transition-all hover:scale-105 cursor-help"
                  style={{ 
                    backgroundColor: intensity > 80 ? '#f43f5e' : intensity > 50 ? '#f59e0b' : intensity > 20 ? '#6366f1' : '#1e293b',
                    opacity: intensity / 100 + 0.2
                  }}
                  title={`Zone ${i+1}: ${intensity}% de charge de risque`}
                >
                  Z{i+1}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex justify-between items-center text-[10px] text-slate-500 uppercase font-bold">
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-800" /> Faible</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-ocp-green" /> Modéré</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Élevé</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Critique</div>
          </div>
        </div>

        {/* Maintenance Schedule */}
        <div className="glass p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="text-ocp-green" size={20} />
            <h4 className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>Planning de Maintenance Prédictive</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                  <th className="pb-4">Unité</th>
                  <th className="pb-4">Probabilité Panne</th>
                  <th className="pb-4">Temps Estimé</th>
                  <th className="pb-4">Action Recommandée</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className={cn("border-b", isDarkMode ? "border-white/5" : "border-slate-200")}>
                  <td className="py-4 font-bold text-emerald-600 dark:text-ocp-green">S02 - Safi Unit B</td>
                  <td className={cn("py-4", isDarkMode ? "text-slate-300" : "text-slate-700")}>78%</td>
                  <td className={cn("py-4", isDarkMode ? "text-slate-300" : "text-slate-700")}>3-5 jours</td>
                  <td className={cn("py-4 text-xs", isDarkMode ? "text-slate-400" : "text-slate-600")}>Remplacement batterie et recalibration</td>
                </tr>
                <tr className={cn("border-b", isDarkMode ? "border-white/5" : "border-slate-200")}>
                  <td className="py-4 font-bold text-emerald-600 dark:text-ocp-green">S01 - Jorf Unit A</td>
                  <td className={cn("py-4", isDarkMode ? "text-slate-300" : "text-slate-700")}>12%</td>
                  <td className={cn("py-4", isDarkMode ? "text-slate-300" : "text-slate-700")}>15-20 jours</td>
                  <td className={cn("py-4 text-xs", isDarkMode ? "text-slate-400" : "text-slate-600")}>Inspection de routine</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="glass p-6">
          <div className="flex items-center gap-3 mb-6">
            <Lightbulb className="text-amber-500" size={20} />
            <h4 className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>Recommandations IA & Insights</h4>
          </div>
          <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex gap-4">
              <div className="p-2 bg-amber-500/20 rounded-lg h-fit">
                <AlertTriangle className="text-amber-500" size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-500 mb-1">Alerte de Tendance CO</p>
                <p className="text-xs text-slate-300">
                  Augmentation anormale du CO détectée en Zone B. Bien que sous le seuil critique, la tendance suggère une fuite mineure potentielle. Inspection visuelle recommandée avant la fin du shift.
                </p>
              </div>
            </div>
            <div className="bg-ocp-green/10 border border-ocp-green/20 p-4 rounded-xl flex gap-4">
              <div className="p-2 bg-ocp-green/20 rounded-lg h-fit">
                <ShieldCheck className="text-ocp-green" size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-ocp-green mb-1">Optimisation Énergétique</p>
                <p className="text-xs text-slate-300">
                  Les capteurs de température indiquent une surchauffe légère des compresseurs. Réduire la charge de 5% permettrait d'économiser 12% d'énergie sans impacter la production.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
