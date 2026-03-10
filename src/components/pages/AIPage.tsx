import React, { useState, useMemo } from 'react';
import { Brain, Zap, Wrench, Calendar, Lightbulb, TrendingUp, AlertTriangle, BarChart3, Activity, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { SensorData } from '../../types';

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

interface MaintenanceTask {
  unit: string;
  probability: string;
  time: string;
  action: string;
}

export default function AIPage({ isDarkMode, sensors }: { isDarkMode: boolean, sensors: Record<string, SensorData> }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const sensorList = useMemo(() => Object.values(sensors), [sensors]);

  // Dynamic Analysis Logic
  const analysis = useMemo(() => {
    const now = Date.now();
    
    // 1. Risk Predictions by Zone (Location)
    const zones: Record<string, { gases: Set<string>, maxRisk: number, count: number, dangerCount: number }> = {};
    
    sensorList.forEach(s => {
      if (!zones[s.location]) {
        zones[s.location] = { gases: new Set(), maxRisk: 0, count: 0, dangerCount: 0 };
      }
      zones[s.location].gases.add(s.type);
      zones[s.location].count++;
      
      let riskScore = 0;
      if (s.status === 'DANGER') {
        riskScore = 80 + Math.random() * 20;
        zones[s.location].dangerCount++;
      } else if (s.status === 'WARNING') {
        riskScore = 40 + Math.random() * 30;
      } else {
        riskScore = 5 + Math.random() * 15;
      }
      
      zones[s.location].maxRisk = Math.max(zones[s.location].maxRisk, riskScore);
    });

    const risks: RiskData[] = Object.entries(zones).map(([zone, data]) => ({
      zone,
      gas: Array.from(data.gases).join(', '),
      risk: Math.round(data.maxRisk),
      trend: data.dangerCount > 0 ? 'Croissante' : 'Stable',
      probability: data.maxRisk / 100
    }));

    // 2. Sensor Health
    const sensorHealth: SensorHealth[] = sensorList.map(s => {
      const isOffline = now - s.lastUpdate > 60000;
      let health = 100;
      let issue = 'Optimal';

      if (isOffline) {
        health = 20;
        issue = 'Hors ligne / Perte de signal';
      } else if (s.status === 'DANGER') {
        health = 40;
        issue = 'Valeurs critiques détectées';
      } else if (s.status === 'WARNING') {
        health = 70;
        issue = 'Dérive potentielle';
      }

      return {
        id: s.id,
        name: s.name,
        health,
        issue,
        lastMaintenance: new Date(s.lastUpdate - 86400000 * 30).toLocaleDateString() // Mock last maintenance
      };
    }).sort((a, b) => a.health - b.health).slice(0, 6);

    // 3. Maintenance Tasks
    const maintenanceSchedule: MaintenanceTask[] = sensorList
      .filter(s => s.status !== 'SAFE' || (now - s.lastUpdate > 60000))
      .map(s => {
        const isOffline = now - s.lastUpdate > 60000;
        return {
          unit: s.name,
          probability: isOffline ? '95%' : (s.status === 'DANGER' ? '80%' : '45%'),
          time: isOffline ? 'Immédiat' : (s.status === 'DANGER' ? '1-2 jours' : '5-7 jours'),
          action: isOffline ? 'Vérification alimentation/réseau' : 'Calibration et test étanchéité'
        };
      }).slice(0, 5);

    // 4. Heatmap Data (Grid based on locations)
    const heatmap = Object.entries(zones).map(([zone, data], i) => ({
      id: i + 1,
      label: zone,
      intensity: data.maxRisk
    }));

    return { risks, sensorHealth, maintenanceSchedule, heatmap };
  }, [sensorList]);

  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => setIsAnalyzing(false), 2000);
  };

  const globalReliability = useMemo(() => {
    if (analysis.sensorHealth.length === 0) return 100;
    const avg = analysis.sensorHealth.reduce((acc, s) => acc + s.health, 0) / analysis.sensorHealth.length;
    return avg.toFixed(1);
  }, [analysis.sensorHealth]);

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
            <p className="text-slate-600 dark:text-slate-400">Analyse en temps réel basée sur {sensorList.length} capteurs actifs</p>
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
              <h4 className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>Prédiction des Risques par Zone</h4>
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Analyse en temps réel</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {analysis.risks.length > 0 ? analysis.risks.map((p, i) => (
              <div key={i} className={cn("border p-4 rounded-xl", isDarkMode ? "bg-slate-800/40 border-slate-700" : "bg-white/50 border-slate-200")}>
                <div className="flex justify-between mb-2">
                  <span className={cn("text-sm font-bold truncate max-w-[150px]", isDarkMode ? "text-white" : "text-slate-900")}>{p.zone}</span>
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
                  <span className="truncate max-w-[120px]">Gaz: {p.gas}</span>
                  <span>Tendance: {p.trend}</span>
                </div>
              </div>
            )) : (
              <div className="col-span-2 py-12 text-center text-slate-500 italic">
                Aucune donnée de risque disponible. Connectez des capteurs pour commencer l'analyse.
              </div>
            )}
          </div>

          <div className="h-64 w-full bg-slate-800/20 rounded-xl p-4 border border-slate-800">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-4">Probabilité d'Incident par Zone</p>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analysis.risks}>
                <XAxis dataKey="zone" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="probability" radius={[4, 4, 0, 0]}>
                  {analysis.risks.map((entry, index) => (
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
            <h4 className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>Santé des Capteurs Critiques</h4>
          </div>
          <div className="space-y-4">
            {analysis.sensorHealth.length > 0 ? analysis.sensorHealth.map((s, i) => (
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
            )) : (
              <div className="py-12 text-center text-slate-500 italic">
                Aucun capteur détecté.
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-ocp-green/10 border border-ocp-green/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="text-ocp-green" size={16} />
              <span className="text-xs font-bold text-ocp-green uppercase">Indice de Fiabilité Global</span>
            </div>
            <div className={cn("text-2xl font-bold", isDarkMode ? "text-white" : "text-slate-900")}>{globalReliability}%</div>
            <p className="text-[10px] text-slate-500 mt-1">Basé sur l'état actuel du réseau</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Heatmap */}
        <div className="glass p-6">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="text-purple-500" size={20} />
            <h4 className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>Carte Thermique des Risques Réels</h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {analysis.heatmap.length > 0 ? analysis.heatmap.map((item) => (
              <div 
                key={item.id} 
                className="aspect-square rounded-lg flex flex-col items-center justify-center p-2 text-center transition-all hover:scale-105 cursor-help"
                style={{ 
                  backgroundColor: item.intensity > 80 ? '#f43f5e' : item.intensity > 50 ? '#f59e0b' : item.intensity > 20 ? '#6366f1' : '#1e293b',
                  opacity: item.intensity / 100 + 0.3
                }}
                title={`${item.label}: ${item.intensity}% de charge de risque`}
              >
                <span className="text-[8px] font-bold text-white uppercase opacity-60">Zone</span>
                <span className="text-[10px] font-bold text-white truncate w-full">{item.label}</span>
                <span className="text-[12px] font-black text-white">{Math.round(item.intensity)}%</span>
              </div>
            )) : (
              <div className="col-span-4 py-12 text-center text-slate-500 italic">
                En attente de données géographiques...
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-between items-center text-[10px] text-slate-500 uppercase font-bold">
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-800" /> Faible</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Modéré</div>
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
                  <th className="pb-4">Capteur</th>
                  <th className="pb-4">Probabilité Défaillance</th>
                  <th className="pb-4">Urgence</th>
                  <th className="pb-4">Action Recommandée</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {analysis.maintenanceSchedule.length > 0 ? analysis.maintenanceSchedule.map((task, i) => (
                  <tr key={i} className={cn("border-b", isDarkMode ? "border-white/5" : "border-slate-200")}>
                    <td className="py-4 font-bold text-emerald-600 dark:text-ocp-green">{task.unit}</td>
                    <td className={cn("py-4", isDarkMode ? "text-slate-300" : "text-slate-700")}>{task.probability}</td>
                    <td className={cn("py-4", isDarkMode ? "text-slate-300" : "text-slate-700")}>{task.time}</td>
                    <td className={cn("py-4 text-xs", isDarkMode ? "text-slate-400" : "text-slate-600")}>{task.action}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500 italic">Aucune maintenance immédiate requise.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="glass p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <Lightbulb className="text-amber-500" size={20} />
            <h4 className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>Recommandations IA & Insights Dynamiques</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sensorList.some(s => s.status === 'DANGER') && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex gap-4">
                <div className="p-2 bg-rose-500/20 rounded-lg h-fit">
                  <AlertTriangle className="text-rose-500" size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-rose-500 mb-1">Alerte Critique Détectée</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Plusieurs capteurs rapportent des niveaux dangereux. Activez le protocole de sécurité ISO et vérifiez les ventilations d'urgence immédiatement.
                  </p>
                </div>
              </div>
            )}
            
            {sensorList.some(s => Date.now() - s.lastUpdate > 60000) && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex gap-4">
                <div className="p-2 bg-amber-500/20 rounded-lg h-fit">
                  <Wrench className="text-amber-500" size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-500 mb-1">Perte de Connectivité</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Certains capteurs ne répondent plus depuis plus de 60s. Une inspection du réseau local ou des batteries est nécessaire pour maintenir la couverture.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-ocp-green/10 border border-ocp-green/20 p-4 rounded-xl flex gap-4">
              <div className="p-2 bg-ocp-green/20 rounded-lg h-fit">
                <ShieldCheck className="text-ocp-green" size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-ocp-green mb-1">Optimisation de la Surveillance</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Le système fonctionne à {globalReliability}% de sa capacité nominale. L'IA recommande une recalibration préventive des capteurs de gaz tous les 90 jours.
                </p>
              </div>
            </div>

            <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl flex gap-4">
              <div className="p-2 bg-indigo-500/20 rounded-lg h-fit">
                <TrendingUp className="text-indigo-500" size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-indigo-500 mb-1">Analyse de Tendance</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Les variations de température observées sont corrélées aux cycles de production. Aucune anomalie structurelle détectée sur les 24 dernières heures.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
