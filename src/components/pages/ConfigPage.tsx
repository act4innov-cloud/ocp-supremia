import React, { useState, useEffect } from 'react';
import { Settings, Database, Bell, Monitor, Moon, Volume2, Mail, MessageSquare, Phone, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { NotificationConfig } from '../../services/notificationService';
import { MQTTConfig } from '../../services/configService';
import { AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ConfigPageProps {
  key?: string;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  notifConfig: NotificationConfig;
  setNotifConfig: React.Dispatch<React.SetStateAction<NotificationConfig>>;
  mqttConfig: MQTTConfig;
  setMqttConfig: React.Dispatch<React.SetStateAction<MQTTConfig>>;
  isMqttConnected: boolean;
  mqttError: string | null;
  onReconnect: () => void;
  onSave: (notif?: NotificationConfig, mqtt?: MQTTConfig) => void;
}

export default function ConfigPage({ isDarkMode, setIsDarkMode, notifConfig, setNotifConfig, mqttConfig, setMqttConfig, isMqttConnected, mqttError, onReconnect, onSave }: ConfigPageProps) {
  const [showSaved, setShowSaved] = useState(false);
  const [localMqtt, setLocalMqtt] = useState<MQTTConfig>(mqttConfig);
  const [serviceStatus, setServiceStatus] = useState<{ email: boolean, twilio: boolean } | null>(null);

  // Sync local state if prop changes from outside (e.g. Firestore sync)
  useEffect(() => {
    setLocalMqtt(mqttConfig);
  }, [mqttConfig]);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setServiceStatus(data.notifications))
      .catch(() => setServiceStatus(null));
  }, []);

  const handleSave = () => {
    onSave(notifConfig, localMqtt);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 3000);
  };

  const handleNotifToggle = (key: keyof NotificationConfig) => {
    setNotifConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleInputChange = (key: keyof NotificationConfig, value: string) => {
    setNotifConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleMQTTChange = (key: keyof MQTTConfig, value: string | number) => {
    setLocalMqtt(prev => ({ ...prev, [key]: value }));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* MQTT Config */}
      <div className="glass p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Database className="text-ocp-green" size={24} />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Configuration MQTT</h3>
          </div>
          <div className={cn(
            "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
            isMqttConnected ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
          )}>
            <span className={cn("w-1.5 h-1.5 rounded-full", isMqttConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
            {isMqttConnected ? "Connecté" : "Déconnecté"}
          </div>
        </div>
        
        {mqttError && !isMqttConnected && (
          <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3">
            <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
            <p className="text-xs text-rose-500 font-medium">
              Erreur : {mqttError}
            </p>
          </div>
        )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Serveur MQTT (Broker)</label>
            <input 
              type="text" 
              value={localMqtt.broker}
              onChange={(e) => handleMQTTChange('broker', e.target.value)}
              placeholder="ex: test.mosquitto.org"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-ocp-green outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Port WebSocket</label>
            <input 
              type="number" 
              value={localMqtt.port}
              onChange={(e) => handleMQTTChange('port', parseInt(e.target.value) || 0)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-ocp-green outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400" 
            />
          </div>
          <div className="col-span-full p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <p className="text-xs text-blue-500 leading-relaxed">
              <strong>Note sur le protocole :</strong> Ce dashboard étant servi via HTTPS, il utilise automatiquement <strong>WSS</strong> (WebSocket Secure). 
              Nous recommandons <code>broker.emqx.io</code> sur le port <strong>8084</strong> pour une stabilité optimale. 
              Même si vos capteurs Arduino utilisent <code>ws://</code> sur ce port, le navigateur requiert <code>wss://</code> pour des raisons de sécurité.
            </p>
          </div>
          <div className="flex justify-end gap-4 mt-4">
            <button 
              onClick={onReconnect}
              className="text-xs text-blue-500 hover:text-blue-600 transition-colors font-bold uppercase"
            >
              Forcer la reconnexion
            </button>
            <button 
              onClick={() => {
                const defaultConfig = {
                  broker: 'broker.emqx.io',
                  port: 8084,
                  clientId: `sup_${Math.random().toString(16).slice(2, 10)}`
                };
                setLocalMqtt(defaultConfig);
                onSave(undefined, defaultConfig);
              }}
              className="text-xs text-slate-500 hover:text-ocp-green transition-colors font-bold uppercase"
            >
              Réinitialiser aux paramètres recommandés
            </button>
          </div>
          <button 
            onClick={handleSave}
            className="col-span-full bg-ocp-green hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20"
          >
            Sauvegarder et Reconnecter
          </button>
        </div>
      </div>

      {/* Notifications Config */}
      <div className="glass p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="text-amber-500" size={24} />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Notifications d'Alerte</h3>
          </div>
          <AnimatePresence>
            {showSaved && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2 text-emerald-500 text-xs font-bold"
              >
                <CheckCircle2 size={14} />
                <span>Enregistré</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="space-y-6">
          {/* Email */}
          <div className="flex flex-col gap-4 p-4 bg-slate-100 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-ocp-green/10 rounded-lg">
                  <Mail className="text-ocp-green" size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Email</h4>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] text-slate-500">Envoyer les alertes critiques par courriel</p>
                    {serviceStatus && (
                      <span className={cn(
                        "text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase",
                        serviceStatus.email ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                      )}>
                        {serviceStatus.email ? "Réel" : "Démo"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={notifConfig.emailEnabled} onChange={() => handleNotifToggle('emailEnabled')} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ocp-green"></div>
              </label>
            </div>
          </div>

          {/* WhatsApp */}
          <div className="flex flex-col gap-4 p-4 bg-slate-100 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <MessageSquare className="text-emerald-500" size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">WhatsApp</h4>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] text-slate-500">Alertes via l'API Twilio WhatsApp</p>
                    {serviceStatus && (
                      <span className={cn(
                        "text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase",
                        serviceStatus.twilio ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                      )}>
                        {serviceStatus.twilio ? "Réel" : "Démo"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={notifConfig.whatsappEnabled} onChange={() => handleNotifToggle('whatsappEnabled')} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>

          {/* SMS */}
          <div className="flex flex-col gap-4 p-4 bg-slate-100 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Phone className="text-purple-500" size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">SMS</h4>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] text-slate-500">Alertes par SMS classiques</p>
                    {serviceStatus && (
                      <span className={cn(
                        "text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase",
                        serviceStatus.twilio ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                      )}>
                        {serviceStatus.twilio ? "Réel" : "Démo"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={notifConfig.smsEnabled} onChange={() => handleNotifToggle('smsEnabled')} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>

          {/* Coordonnées de Réception */}
          <div className="mt-8 p-6 bg-emerald-50/50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-ocp-green/10 rounded-lg">
                <Phone className="text-ocp-green" size={20} />
              </div>
              <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-400 uppercase tracking-wider">Coordonnées de Réception</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase">Email de destination</label>
                <input 
                  type="email" 
                  placeholder="votre@email.com" 
                  value={notifConfig.emailRecipient}
                  onChange={(e) => handleInputChange('emailRecipient', e.target.value)}
                  className="w-full bg-white dark:bg-slate-900/50 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-ocp-green focus:ring-2 focus:ring-ocp-green/20 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase">Numéro de téléphone (WhatsApp/SMS)</label>
                <input 
                  type="text" 
                  placeholder="+212600000000" 
                  value={notifConfig.phoneRecipient}
                  onChange={(e) => handleInputChange('phoneRecipient', e.target.value)}
                  className="w-full bg-white dark:bg-slate-900/50 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-ocp-green focus:ring-2 focus:ring-ocp-green/20 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <div>
                  <h3 className="font-bold text-amber-800 dark:text-amber-400">Mode Simulation</h3>
                  <p className="text-sm text-amber-700 dark:text-amber-500">Activez ceci si vos quotas Twilio/SendGrid sont atteints pour tester l'interface.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    onChange={(e) => {
                      import('../../services/notificationService').then(m => {
                        m.notificationService.setSimulateMode(e.target.checked);
                      });
                    }}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              <div className="flex justify-end gap-4">
                <button 
                  onClick={async () => {
                  try {
                    const res = await fetch('/api/health');
                    const data = await res.json();
                    alert(`Connexion Serveur OK: ${data.timestamp}`);
                  } catch (e) {
                    alert(`Erreur Connexion Serveur: ${e instanceof Error ? e.message : String(e)}`);
                  }
                }}
                className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-6 py-3 rounded-xl font-bold transition-all active:scale-95"
              >
                Vérifier Serveur
              </button>
              <button 
                onClick={() => {
                  import('../../services/notificationService').then(m => {
                    m.notificationService.sendAlert('TEST_UNIT', 'CO', 50, 'ppm', 'ZONE_TEST', 'DANGER');
                  });
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95"
              >
                Tester les Alertes
              </button>
              <button 
                onClick={handleSave}
                className="bg-ocp-green hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-95"
              >
                <CheckCircle2 size={18} />
                Sauvegarder les Coordonnées
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Display Config */}
      <div className="glass p-6">
        <div className="flex items-center gap-3 mb-6">
          <Monitor className="text-ocp-green" size={24} />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Paramètres d'Affichage</h3>
        </div>
        <div className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-slate-200 dark:bg-slate-800 rounded-lg">
                    <Moon className="text-slate-600 dark:text-slate-400" size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Mode Sombre</h4>
                    <p className="text-[10px] text-slate-500">Interface sombre pour réduire la fatigue visuelle</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={isDarkMode} onChange={() => setIsDarkMode(!isDarkMode)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ocp-green"></div>
                </label>
              </div>
              <button 
                onClick={handleSave}
                className="w-full bg-ocp-green hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-95"
              >
                <CheckCircle2 size={18} />
                Sauvegarder les Préférences d'Affichage
              </button>
            </div>
        </div>
      </div>
    </motion.div>
  );
}
