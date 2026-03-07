import React from 'react';
import { Settings, Database, Bell, Monitor, Moon, Volume2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function ConfigPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="glass p-6">
        <div className="flex items-center gap-3 mb-6">
          <Database className="text-blue-500" size={24} />
          <h3 className="text-lg font-bold text-white">Configuration MQTT</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Serveur MQTT (Broker)</label>
            <input type="text" defaultValue="test.mosquitto.org" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Port WebSocket</label>
            <input type="number" defaultValue="8081" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all" />
          </div>
          <div className="col-span-full space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Topic de Base</label>
            <input type="text" defaultValue="supremia/data/client1" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all" />
          </div>
          <button className="col-span-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all">
            Sauvegarder et Reconnecter
          </button>
        </div>
      </div>

      <div className="glass p-6">
        <div className="flex items-center gap-3 mb-6">
          <Monitor className="text-emerald-500" size={24} />
          <h3 className="text-lg font-bold text-white">Paramètres d'Affichage</h3>
        </div>
        <div className="space-y-4">
          {[
            { label: 'Alertes Sonores', desc: 'Activer les notifications audio en cas de danger', icon: Volume2, checked: true },
            { label: 'Mode Sombre', desc: 'Interface sombre pour réduire la fatigue visuelle', icon: Moon, checked: true },
            { label: 'Notifications Push', desc: 'Recevoir des alertes sur le bureau', icon: Bell, checked: false },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-800">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-slate-800 rounded-lg">
                  <item.icon className="text-slate-400" size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{item.label}</h4>
                  <p className="text-[10px] text-slate-500">{item.desc}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked={item.checked} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
