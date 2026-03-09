import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LayoutDashboard, ShieldAlert, Settings, FileText, Database, Activity, AlertCircle, CheckCircle2, Clock, LogOut, LogIn, Menu, X, Brain, TrendingUp, User as UserIcon } from 'lucide-react';
import mqtt from 'mqtt';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Legend } from 'recharts';
import SensorCard from './components/SensorCard';
import Chatbot from './components/Chatbot';
import SensorsPage from './components/pages/SensorsPage';
import SafetyPage from './components/pages/SafetyPage';
import AIPage from './components/pages/AIPage';
import ReportsPage from './components/pages/ReportsPage';
import ConfigPage from './components/pages/ConfigPage';
import LoginPage from './components/pages/LoginPage';
import ProfilePage from './components/pages/ProfilePage';
import { SensorData, getStatus } from './types';
import { notificationService, NotificationConfig } from './services/notificationService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, signInWithGoogle, logout, db, handleFirestoreError, OperationType, loginWithEmail, registerWithEmail } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection } from 'firebase/firestore';

import { configService, MQTTConfig } from './services/configService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [sensors, setSensors] = useState<Record<string, SensorData>>({});
  const [inventory, setInventory] = useState<Record<string, any>>({});
  const inventoryRef = useRef<Record<string, any>>({});
  const prevSensorsRef = useRef<Record<string, SensorData>>({});
  const prevOnlineStatusRef = useRef<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [mqttConfig, setMqttConfig] = useState<MQTTConfig>(configService.getConfig().mqtt);
  const [notifConfig, setNotifConfig] = useState<NotificationConfig>({
    emailEnabled: true,
    whatsappEnabled: true,
    smsEnabled: false,
    emailRecipient: 'act4innov@gmail.com',
    phoneRecipient: '+212600000000',
  });

  // Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
  }, []);

  // Sync Settings and Inventory with Firestore
  useEffect(() => {
    if (!user) return;

    // Sync Inventory
    const sensorsRef = collection(db, 'sensors');
    const unsubInventory = onSnapshot(sensorsRef, (snapshot) => {
      const inv: Record<string, any> = {};
      snapshot.forEach(doc => {
        inv[doc.id] = doc.data();
      });
      setInventory(inv);
      inventoryRef.current = inv;
    });

    // Sync User Profile
    const userRef = doc(db, 'users', user.uid);
    const unsubUser = onSnapshot(userRef, (docSnap) => {
      if (!docSnap.exists()) {
        setDoc(userRef, {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'Utilisateur',
          role: 'user',
          createdAt: new Date()
        }).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`));
      }
    });

    const settingsRef = doc(db, 'settings', user.uid);
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.isDarkMode !== undefined) setIsDarkMode(data.isDarkMode);
        if (data.notifConfig) setNotifConfig(data.notifConfig);
        if (data.mqttConfig) {
          setMqttConfig(data.mqttConfig);
          configService.saveMQTTConfig(data.mqttConfig);
        }
      } else {
        // Initialize default settings in Firestore
        setDoc(settingsRef, { isDarkMode, notifConfig, mqttConfig }).catch(e => 
          handleFirestoreError(e, OperationType.WRITE, `settings/${user.uid}`)
        );
      }
    });

    return () => {
      unsubscribe();
      unsubUser();
      unsubInventory();
    };
  }, [user]);

  // Save settings to Firestore
  const handleSaveSettings = (newNotif?: NotificationConfig, newMqtt?: MQTTConfig) => {
    if (!user || !authReady) return;
    const finalNotif = newNotif || notifConfig;
    const finalMqtt = newMqtt || mqttConfig;

    const settingsRef = doc(db, 'settings', user.uid);
    setDoc(settingsRef, { isDarkMode, notifConfig: finalNotif, mqttConfig: finalMqtt }, { merge: true }).catch(e => 
      handleFirestoreError(e, OperationType.WRITE, `settings/${user.uid}`)
    );
    configService.saveMQTTConfig(finalMqtt);
    configService.saveNotificationConfig(finalNotif);

    if (newNotif) setNotifConfig(newNotif);
    if (newMqtt) setMqttConfig(newMqtt);
  };

  // Auto-save theme only
  useEffect(() => {
    if (!user || !authReady) return;
    const settingsRef = doc(db, 'settings', user.uid);
    setDoc(settingsRef, { isDarkMode }, { merge: true }).catch(e => 
      handleFirestoreError(e, OperationType.WRITE, `settings/${user.uid}`)
    );
  }, [isDarkMode, user, authReady]);

  // Appliquer le thème
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Mettre à jour le service de notification quand la config change
  useEffect(() => {
    notificationService.updateConfig(notifConfig);
  }, [notifConfig]);

  // Connexion MQTT Réelle
  useEffect(() => {
    const brokerUrl = `wss://${mqttConfig.broker}:${mqttConfig.port}`;
    const baseTopic = 'supremia/data';
    const subscriptionTopic = `${baseTopic}/#`;
    
    console.log('🔌 Connexion au broker MQTT...', brokerUrl);
    const client = mqtt.connect(brokerUrl, {
      clientId: mqttConfig.clientId
    });

    client.on('connect', () => {
      console.log('✅ Connecté au broker MQTT');
      client.subscribe(subscriptionTopic);
    });

    client.on('message', (receivedTopic, message) => {
      if (receivedTopic.startsWith(baseTopic)) {
        try {
          const payload = message.toString().trim();
          if (!payload) {
            console.warn(`⚠️ Message MQTT vide reçu sur [${receivedTopic}]`);
            return;
          }
          console.log(`📥 MQTT [${receivedTopic}]:`, payload);
          
          // Nettoyage du payload pour gérer les valeurs non-standard (inf, -inf, nan)
          const sanitizedPayload = payload
            .replace(/:\s*(-?inf)\b/gi, ': null')
            .replace(/:\s*(nan)\b/gi, ': null');
            
          const data = JSON.parse(sanitizedPayload);
          
          // Extraire l'ID du topic
          const topicParts = receivedTopic.split('/');
          const topicId = topicParts[topicParts.length - 1];
          
          // Déterminer l'ID du capteur : 
          // 1. Priorité absolue au champ sensor_name s'il commence par OCP_
          // 2. Sinon le dernier segment du topic s'il commence par OCP_
          let sensorId = "";
          if (data.sensor_name && data.sensor_name.startsWith('OCP_')) {
            sensorId = data.sensor_name;
          } else if (topicId && topicId.startsWith('OCP_')) {
            sensorId = topicId;
          }
          
          // Filtrage strict : on n'accepte QUE les capteurs commençant par OCP_
          if (!sensorId || !sensorId.startsWith('OCP_')) {
            return;
          }

          // Enrichissement via l'inventaire Firestore
          const invData = inventoryRef.current[sensorId] || {};
          const location = invData.location || data.location || 'Inconnue';
          const sensorName = invData.name || sensorId;

          const now = Date.now();
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const updates: Partial<SensorData>[] = [];

          if (data.type === 'TEMP_HUM') {
            updates.push({ id: `${sensorId}_TEMP`, name: `${sensorName} Temp`, type: 'TEMP', value: data.temperature ?? data.temp, unit: '°C', location: location });
            updates.push({ id: `${sensorId}_HUM`, name: `${sensorName} Hum`, type: 'HUM', value: data.humidity ?? data.hum, unit: '%', location: location });
          } else if (data.type === 'CO2' || data.type === 'CO2_TVOC') {
            const co2Val = data.co2_ppm ?? data.co2 ?? data.value;
            if (co2Val !== undefined) {
              updates.push({ id: sensorId, name: sensorName, type: 'CO2', value: co2Val, unit: 'ppm', location: location });
            }
            if (data.tvoc !== undefined) {
              updates.push({ id: `${sensorId}_TVOC`, name: `${sensorName} TVOC`, type: 'VOC', value: data.tvoc, unit: 'ppb', location: location });
            }
          } else if (data.type === 'SMOKE' || data.type === 'SMOKE_LPG') {
            const smokeVal = data.smoke_ppm ?? data.smoke;
            const lpgVal = data.lpg_ppm ?? data.lpg;
            if (smokeVal !== undefined) updates.push({ id: `${sensorId}_SMOKE`, name: `${sensorName} Fumée`, type: 'SMOKE', value: smokeVal, unit: 'ppm', location: location });
            if (lpgVal !== undefined) updates.push({ id: `${sensorId}_LPG`, name: `${sensorName} LPG`, type: 'LPG', value: lpgVal, unit: 'ppm', location: location });
          } else if (data.type === 'H2S') {
            const h2sVal = data.h2s_ppm ?? data.h2s ?? data.value;
            if (h2sVal !== undefined) updates.push({ id: sensorId, name: sensorName, type: 'H2S', value: h2sVal, unit: 'ppm', location: location });
          } else if (data.type === 'CO') {
            const coVal = data.co_ppm ?? data.co ?? data.value;
            if (coVal !== undefined) updates.push({ id: sensorId, name: sensorName, type: 'CO', value: coVal, unit: 'ppm', location: location });
          } else {
            // Fallback pour tout autre type de donnée ou format simplifié
            // On ne crée une mise à jour que si une valeur numérique est présente
            const value = data.value !== undefined ? data.value : (data.val !== undefined ? data.val : undefined);
            
            if (value !== undefined) {
              updates.push({ 
                id: sensorId, 
                name: sensorName, 
                type: data.type || 'GENERIC', 
                value, 
                unit: data.unit || '', 
                location: location 
              });
            } else {
              // Si pas de valeur, on met juste à jour le timestamp pour dire qu'il est en ligne
              // mais on ne crée pas de nouvelle entrée si le capteur n'existe pas encore
              setSensors(prev => {
                if (prev[sensorId]) {
                  return {
                    ...prev,
                    [sensorId]: { ...prev[sensorId], lastUpdate: now }
                  };
                }
                return prev;
              });
              return;
            }
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
              
              // Détection de changement de statut
              if (current.status !== status) {
                notificationService.sendStatusChange(
                  update.name || id,
                  update.type!,
                  current.status,
                  status,
                  update.value!,
                  update.unit || ''
                );
              }

              // Déclencher notification d'alerte si WARNING ou DANGER (avec cooldown géré dans le service)
              if (status === 'DANGER' || status === 'WARNING') {
                notificationService.sendAlert(
                  update.name || id, 
                  update.type!, 
                  update.value!, 
                  update.unit || '', 
                  update.location || 'Inconnue',
                  status
                );
              }

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
  }, [mqttConfig]);

  // Surveillance de la connectivité (Online/Offline)
  useEffect(() => {
    const checkConnectivity = () => {
      const now = Date.now();
      const currentOnlineStatus: Record<string, boolean> = {};
      
      (Object.values(sensors) as SensorData[]).forEach(sensor => {
        const isOnline = now - sensor.lastUpdate < 45000;
        currentOnlineStatus[sensor.id] = isOnline;
        
        const prevStatus = prevOnlineStatusRef.current[sensor.id];
        
        // Si le statut a changé (et n'était pas indéfini au premier tour)
        if (prevStatus !== undefined && prevStatus !== isOnline) {
          notificationService.sendConnectivityChange(sensor.name, isOnline);
        }
      });
      
      prevOnlineStatusRef.current = currentOnlineStatus;
    };

    const interval = setInterval(checkConnectivity, 10000); // Vérifier toutes les 10 secondes
    return () => clearInterval(interval);
  }, [sensors]);

  // Filtrage des capteurs "online"
  const onlineSensors = useMemo(() => {
    const now = Date.now();
    return (Object.values(sensors) as SensorData[]).filter(s => now - s.lastUpdate < 45000);
  }, [sensors]);

  const stats = useMemo(() => {
    const dangerCount = onlineSensors.filter(s => s.status === 'DANGER').length;
    const warningCount = onlineSensors.filter(s => s.status === 'WARNING').length;
    return { dangerCount, warningCount, total: onlineSensors.length };
  }, [onlineSensors]);

  const sensorContext = useMemo(() => {
    return onlineSensors.map(s => `${s.name} (${s.type}): ${s.value.toFixed(1)}${s.unit} - Statut: ${s.status}`).join('\n');
  }, [onlineSensors]);

  const [sensorHistory, setSensorHistory] = useState<Record<string, { time: string, value: number }[]>>({});

  useEffect(() => {
    if (onlineSensors.length > 0) {
      setSensorHistory(prev => {
        const newHistory = { ...prev };
        const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        onlineSensors.forEach(sensor => {
          if (!newHistory[sensor.id]) newHistory[sensor.id] = [];
          newHistory[sensor.id] = [...newHistory[sensor.id], { time, value: sensor.value }].slice(-15);
        });
        
        return newHistory;
      });
    }
  }, [onlineSensors]);

  const combinedHistory = useMemo(() => {
    const times = Array.from(new Set(Object.values(sensorHistory).flatMap((h: { time: string, value: number }[]) => h.map(d => d.time))));
    return times.map(time => {
      const entry: any = { time };
      Object.keys(sensorHistory).forEach(id => {
        const found = sensorHistory[id].find(d => d.time === time);
        if (found) entry[id] = found.value;
      });
      return entry;
    }).sort((a, b) => a.time.localeCompare(b.time));
  }, [sensorHistory]);

  if (!authReady) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className={cn(
      "flex h-screen text-slate-200 overflow-hidden relative transition-colors duration-300",
      isDarkMode ? "bg-dark-bg" : "bg-slate-50"
    )}>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-all duration-300 lg:relative lg:translate-x-0",
        isDarkMode ? "bg-[#0a1403] border-ocp-green/10" : "bg-white border-slate-200 shadow-xl",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        "border-r"
      )}>
        <div className={cn(
          "p-6 flex items-center justify-between border-b transition-colors duration-300",
          isDarkMode ? "border-ocp-green/10" : "border-slate-100"
        )}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-ocp-green rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/20">
              <ShieldAlert className="text-white" size={24} />
            </div>
            <div>
              <h1 className={cn("font-bold text-lg tracking-tight", isDarkMode ? "text-white" : "text-emerald-900")}>SUPREMIA MONITOR</h1>
              <p className="text-[10px] text-ocp-yellow font-mono uppercase tracking-widest font-bold">Safety v4.0</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-emerald-500"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'sensors', icon: Activity, label: 'Capteurs Live', badge: onlineSensors.length },
            { id: 'ai', icon: Brain, label: 'Analyse IA' },
            { id: 'safety', icon: ShieldAlert, label: 'Sécurité ISO' },
            { id: 'reports', icon: FileText, label: 'Rapports' },
            { id: 'config', icon: Settings, label: 'Configuration' },
            { id: 'profile', icon: UserIcon, label: 'Mon Profil' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (window.innerWidth < 1024) setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200",
                activeTab === item.id 
                  ? (isDarkMode ? "bg-ocp-green/10 text-ocp-yellow border border-ocp-green/20" : "bg-ocp-green text-white shadow-md shadow-emerald-900/20") 
                  : (isDarkMode ? "text-slate-500 hover:text-emerald-400 hover:bg-emerald-900/20" : "text-slate-600 hover:text-emerald-700 hover:bg-emerald-50")
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} />
                <span className="font-medium text-sm">{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold min-w-[20px] text-center",
                  activeTab === item.id 
                    ? "bg-white text-ocp-green" 
                    : (item.badge > 0 ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400")
                )}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className={cn("p-4 border-t transition-colors duration-300", isDarkMode ? "border-ocp-green/10" : "border-slate-100")}>
          <div className={cn("glass p-4", isDarkMode ? "bg-ocp-green/5" : "bg-emerald-50/50 border-emerald-100")}>
            <div className="flex items-center gap-2 mb-2">
              <Database size={14} className="text-ocp-green" />
              <span className={cn("text-xs font-bold uppercase", isDarkMode ? "text-slate-400" : "text-emerald-800")}>MQTT BROKER</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className={cn("text-[10px] font-mono", isDarkMode ? "text-emerald-400" : "text-emerald-600 font-bold")}>CONNECTED: {mqttConfig.broker}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className={cn(
          "h-20 border-b backdrop-blur-md flex items-center justify-between px-4 lg:px-8 transition-colors duration-300",
          isDarkMode ? "bg-dark-bg/20 border-ocp-green/10" : "bg-white/80 border-slate-200"
        )}>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className={cn("lg:hidden p-2 rounded-lg transition-colors", isDarkMode ? "bg-ocp-green/20 text-ocp-green" : "bg-ocp-green/10 text-ocp-green")}
            >
              <Menu size={20} />
            </button>
            <div>
              <h2 className={cn("text-lg lg:text-xl font-bold", isDarkMode ? "text-white" : "text-black")}>Dashboard Industriel</h2>
              <p className="text-[10px] lg:text-xs text-slate-500 flex items-center gap-2">
                <Clock size={12} />
                Dernière mise à jour: {currentTime.toLocaleTimeString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-6">
            <div className="hidden sm:flex gap-4">
              <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Alertes Critiques</p>
                <p className={cn("text-lg font-bold", stats.dangerCount > 0 ? "text-rose-500" : (isDarkMode ? "text-slate-400" : "text-slate-300"))}>
                  {stats.dangerCount}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Avertissements</p>
                <p className={cn("text-lg font-bold", stats.warningCount > 0 ? "text-amber-500" : (isDarkMode ? "text-slate-400" : "text-slate-300"))}>
                  {stats.warningCount}
                </p>
              </div>
            </div>
            <div className={cn("h-10 w-px", isDarkMode ? "bg-ocp-green/10" : "bg-slate-200")} />
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <button 
                    onClick={() => setActiveTab('profile')}
                    className={cn("w-10 h-10 rounded-full border overflow-hidden transition-transform hover:scale-105", isDarkMode ? "bg-ocp-green/20 border-ocp-green/30" : "bg-ocp-green/10 border-ocp-green/20")}
                  >
                    <img src={user.photoURL || undefined} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                  <div>
                    <button 
                      onClick={() => setActiveTab('profile')}
                      className={cn("text-sm font-bold hover:text-ocp-green transition-colors", isDarkMode ? "text-white" : "text-black")}
                    >
                      {user.displayName || 'Utilisateur'}
                    </button>
                    <button onClick={logout} className="text-[10px] text-rose-500 hover:underline flex items-center gap-1">
                      <LogOut size={10} /> Déconnexion
                    </button>
                  </div>
                </>
              ) : (
                <button 
                  onClick={signInWithGoogle}
                  className="bg-ocp-green hover:opacity-90 text-black px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-all"
                >
                  <LogIn size={16} /> Connexion
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
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
                  <div className={cn("glass p-6 border-l-4 border-ocp-green", isDarkMode ? "" : "bg-white")}>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className={cn("font-bold text-xs uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-600")}>Capteurs en Ligne</h3>
                      <Activity className="text-ocp-green" size={20} />
                    </div>
                    <p className={cn("text-4xl font-bold", isDarkMode ? "text-white" : "text-black")}>{onlineSensors.length}</p>
                    <p className="text-xs text-slate-500 mt-2">Surveillance active sur tout le site</p>
                  </div>
                  <div className={cn("glass p-6 border-l-4 border-amber-500", isDarkMode ? "" : "bg-white")}>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className={cn("font-bold text-xs uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-600")}>Zones à Risque</h3>
                      <AlertCircle className="text-amber-500" size={20} />
                    </div>
                    <p className={cn("text-4xl font-bold", isDarkMode ? "text-white" : "text-black")}>{stats.warningCount}</p>
                    <p className="text-xs text-slate-500 mt-2">Attention requise dans ces zones</p>
                  </div>
                  <div className={cn("glass p-6 border-l-4 border-rose-500", isDarkMode ? "" : "bg-white")}>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className={cn("font-bold text-xs uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-600")}>Alertes Critiques</h3>
                      <ShieldAlert className="text-rose-500" size={20} />
                    </div>
                    <p className={cn("text-4xl font-bold", isDarkMode ? "text-white" : "text-black")}>{stats.dangerCount}</p>
                    <p className="text-xs text-slate-500 mt-2">Évacuation immédiate si &gt; 0</p>
                  </div>
                </div>

                {/* Evolution Chart */}
                <div className={cn("glass p-6", isDarkMode ? "bg-dark-bg/40" : "bg-white")}>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className={cn("text-lg font-bold flex items-center gap-2", isDarkMode ? "text-white" : "text-black")}>
                      <TrendingUp className="text-ocp-green" size={20} />
                      Évolution des Capteurs
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-ocp-green" />
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Valeurs Actuelles</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={combinedHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#1a2e05" : "#f1f5f9"} vertical={false} />
                        <XAxis 
                          dataKey="time" 
                          stroke={isDarkMode ? "#334155" : "#94a3b8"} 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                        />
                        <YAxis 
                          stroke={isDarkMode ? "#334155" : "#94a3b8"} 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                          tickFormatter={(value) => `${value}`}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: isDarkMode ? '#064e3b' : '#fff', 
                            border: 'none', 
                            borderRadius: '12px', 
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                            fontSize: '12px'
                          }}
                          itemStyle={{ color: isDarkMode ? '#fff' : '#1e293b' }}
                        />
                        <Legend 
                          wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }}
                        />
                        {onlineSensors.map((sensor, index) => (
                          <Line
                            key={sensor.id}
                            type="monotone"
                            dataKey={sensor.id}
                            name={sensor.name}
                            stroke={index === 0 ? '#BFFF00' : index === 1 ? '#f59e0b' : index === 2 ? '#3b82f6' : '#8b5cf6'}
                            strokeWidth={3}
                            dot={{ r: 4, strokeWidth: 2, fill: isDarkMode ? '#080c02' : '#fff' }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                            animationDuration={1000}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Sensors Grid */}
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className={cn("text-lg font-bold flex items-center gap-2", isDarkMode ? "text-white" : "text-black")}>
                      <Activity className="text-ocp-green" size={20} />
                      Monitoring Temps Réel
                    </h3>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 rounded-full bg-ocp-green/10 text-ocp-green border border-ocp-green/20 text-[10px] font-bold uppercase">Sûr</span>
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
            {activeTab === 'profile' && <ProfilePage key="profile" />}
            {activeTab === 'config' && (
              <ConfigPage 
                key="config" 
                isDarkMode={isDarkMode} 
                setIsDarkMode={setIsDarkMode}
                notifConfig={notifConfig}
                setNotifConfig={setNotifConfig}
                mqttConfig={mqttConfig}
                setMqttConfig={setMqttConfig}
                onSave={handleSaveSettings}
              />
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Chatbot */}
      <Chatbot sensorContext={sensorContext} />
    </div>
  );
}
