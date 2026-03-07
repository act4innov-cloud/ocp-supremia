import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, ShieldAlert, Settings, FileText, Database, Activity, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import mqtt from 'mqtt';
import { motion, AnimatePresence } from 'motion/react';
import SensorCard from './components/SensorCard';
import Chatbot from './components/Chatbot';
import SensorsPage from './components/pages/SensorsPage';
import SafetyPage from './components/pages/SafetyPage';
import AIPage from './components/pages/AIPage';
import ReportsPage from './components/pages/ReportsPage';
import ConfigPage from './components/pages/ConfigPage';
import { SensorData, getStatus } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [sensors, setSensors] = useState<Record<string, SensorData>>({});
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Connexion MQTT Réelle
  useEffect(() => {
    const brokerUrl = 'wss://test.mosquitto.org:8081';
    const topic = 'supremia/data/client1';
    
    console.log('🔌 Connexion au broker MQTT...', brokerUrl);
    const client = mqtt.connect(brokerUrl);

    client.on('connect', () => {
      console.log('✅ Connecté au broker MQTT');
      client.subscribe(topic);
    });

    client.on('message', (receivedTopic, message) => {
      if (receivedTopic === topic) {
        try {
          const data = JSON.parse(message.toString());
          const sensorId = data.sensor_name || data.sensor_id;
          if (!sensorId) return;

          const now = Date.now();
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const updates: Partial<SensorData>[] = [];

          if (data.type === 'TEMP_HUM') {
            updates.push({ id: `${sensorId}_TEMP`, name: `${sensorId} Temp`, type: 'TEMP', value: data.temperature, unit: '°C', location: data.location });
            updates.push({ id: `${sensorId}_HUM`, name: `${sensorId} Hum`, type: 'HUM', value: data.humidity, unit: '%', location: data.location });
          } else if (data.type === 'CO2') {
            updates.push({ id: sensorId, name: sensorId, type: 'CO2', value: data.co2_ppm, unit: 'ppm', location: data.location });
          } else if (data.type === 'SMOKE') {
            updates.push({ id: `${sensorId}_SMOKE`, name: `${sensorId} Fumée`, type: 'SMOKE', value: data.smoke_ppm, unit: 'ppm', location: data.location });
            updates.push({ id: `${sensorId}_LPG`, name: `${sensorId} LPG`, type: 'LPG', value: data.lpg_ppm, unit: 'ppm', location: data.location });
          } else if (data.type === 'H2S') {
            updates.push({ id: sensorId, name: sensorId, type: 'H2S', value: data.h2s_ppm, unit: 'ppm', location: data.location });
          } else if (data.type === 'CO') {
            updates.push({ id: sensorId, name: sensorId, type: 'CO', value: data.co_ppm, unit: 'ppm', location: data.location });
          }

          setSensors(prev => {
            const next = { ...prev };
            updates.forEach(update => {
              const id = update.id!;
              const current = prev[id] || {
                id, name: update.name, location: update.location, type: update.type,
                value: 0, unit: update.unit, status: 'SAFE', lastUpdate: now, history: []
              };
              const status = getStatus(update.type!, update.value!);
              const newHistory = [...(current.history || []), { time: timeStr, value: update.value! }].slice(-20);
              next[id] = { ...current, ...update, status, lastUpdate: now, history: newHistory } as SensorData;
            });
            return next;
          });
        } catch (e) { console.error('❌ Erreur MQTT:', e); }
      }
    });

    const timeTimer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => { client.end(); clearInterval(timeTimer); };
  }, []);

  // Filtrage des capteurs "online" (mis à jour il y a moins de 130 secondes car le timer Arduino est de 60s)
  const onlineSensors = useMemo(() => {
    const now = Date.now();
    return (Object.values(sensors) as SensorData[]).filter(s => now - s.lastUpdate < 130000);
  }, [sensors]);

  const stats = useMemo(() => {
    const dangerCount = onlineSensors.filter(s => s.status === 'DANGER').length;
    const warningCount = onlineSensors.filter(s => s.status === 'WARNING').length;
    return { dangerCount, warningCount, total: onlineSensors.length };
  }, [onlineSensors]);

  const sensorContext = useMemo(() => {
    return onlineSensors.map(s => `${s.name} (${s.type}): ${s.value.toFixed(1)}${s.unit} - Statut: ${s.status}`).join('\n');
  }, [onlineSensors]);

  return (
    <div className="flex h-screen bg-[#0a0f1e] text-slate-200 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
            <ShieldAlert className="text-white" size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">OCP Monitor</h1>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Safety v4.0</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'sensors', icon: Activity, label: 'Capteurs Live' },
            { id: 'safety', icon: ShieldAlert, label: 'Sécurité ISO' },
            { id: 'reports', icon: FileText, label: 'Rapports' },
            { id: 'config', icon: Settings, label: 'Configuration' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                activeTab === item.id 
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/20" 
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
              )}
            >
              <item.icon size={20} />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="glass p-4 bg-slate-800/40">
            <div className="flex items-center gap-2 mb-2">
              <Database size={14} className="text-blue-400" />
              <span className="text-xs font-bold text-slate-400">MQTT BROKER</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-mono">CONNECTED: test.mosquitto.org</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-20 border-b border-slate-800 bg-slate-900/30 backdrop-blur-md flex items-center justify-between px-8">
          <div>
            <h2 className="text-xl font-bold text-white">Dashboard Industriel</h2>
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <Clock size={12} />
              Dernière mise à jour: {currentTime.toLocaleTimeString()}
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex gap-4">
              <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Alertes Critiques</p>
                <p className={cn("text-lg font-bold", stats.dangerCount > 0 ? "text-rose-500" : "text-slate-400")}>
                  {stats.dangerCount}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Avertissements</p>
                <p className={cn("text-lg font-bold", stats.warningCount > 0 ? "text-amber-500" : "text-slate-400")}>
                  {stats.warningCount}
                </p>
              </div>
            </div>
            <div className="h-10 w-px bg-slate-800" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                <CheckCircle2 className="text-emerald-500" size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Expert HSE</p>
                <p className="text-[10px] text-emerald-500">Système Sécurisé</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Status Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="glass p-6 border-l-4 border-blue-500">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-slate-400 font-bold text-xs uppercase tracking-widest">Capteurs en Ligne</h3>
                      <Activity className="text-blue-500" size={20} />
                    </div>
                    <p className="text-4xl font-bold text-white">{onlineSensors.length}</p>
                    <p className="text-xs text-slate-500 mt-2">Surveillance active sur tout le site</p>
                  </div>
                  <div className="glass p-6 border-l-4 border-amber-500">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-slate-400 font-bold text-xs uppercase tracking-widest">Zones à Risque</h3>
                      <AlertCircle className="text-amber-500" size={20} />
                    </div>
                    <p className="text-4xl font-bold text-white">{stats.warningCount}</p>
                    <p className="text-xs text-slate-500 mt-2">Attention requise dans ces zones</p>
                  </div>
                  <div className="glass p-6 border-l-4 border-rose-500">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-slate-400 font-bold text-xs uppercase tracking-widest">Alertes Critiques</h3>
                      <ShieldAlert className="text-rose-500" size={20} />
                    </div>
                    <p className="text-4xl font-bold text-white">{stats.dangerCount}</p>
                    <p className="text-xs text-slate-500 mt-2">Évacuation immédiate si &gt; 0</p>
                  </div>
                </div>

                {/* Sensors Grid */}
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Activity className="text-blue-500" size={20} />
                      Monitoring Temps Réel
                    </h3>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase">Sûr</span>
                      <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase">Avertissement</span>
                      <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold uppercase">Danger</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {onlineSensors.length > 0 ? (
                      onlineSensors.map(sensor => (
                        // @ts-ignore
                        <SensorCard key={sensor.id} sensor={sensor} />
                      ))
                    ) : (
                      <div className="col-span-full glass p-12 flex flex-col items-center justify-center text-slate-500 border-dashed">
                        <Database size={48} className="mb-4 opacity-20" />
                        <p className="text-lg font-medium">En attente de données MQTT...</p>
                        <p className="text-sm">Assurez-vous que vos capteurs sont alimentés et connectés au réseau.</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'sensors' && (
              // @ts-ignore
              <SensorsPage key="sensors" onlineSensors={onlineSensors} />
            )}
            {activeTab === 'safety' && (
              // @ts-ignore
              <SafetyPage key="safety" onlineSensors={onlineSensors} />
            )}
            {activeTab === 'ai' && <AIPage key="ai" />}
            {activeTab === 'reports' && <ReportsPage key="reports" />}
            {activeTab === 'config' && <ConfigPage key="config" />}
          </AnimatePresence>
        </div>
      </main>

      {/* Chatbot */}
      <Chatbot sensorContext={sensorContext} />
    </div>
  );
}
