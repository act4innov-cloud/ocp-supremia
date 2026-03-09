import React, { useState, useEffect } from 'react';
import { Cpu, Plus, Trash2, Wifi, Info, X, Edit2 } from 'lucide-react';
import { SensorData } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query } from 'firebase/firestore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SensorConfig {
  id: string;
  type: string;
  mac: string;
  ip: string;
  location: string;
}

export default function SensorsPage({ onlineSensors }: { onlineSensors: SensorData[] }) {
  const [sensors, setSensors] = useState<SensorConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'sensors'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sensorList: SensorConfig[] = [];
      snapshot.forEach((doc) => {
        sensorList.push(doc.data() as SensorConfig);
      });
      setSensors(sensorList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sensors');
    });

    return () => unsubscribe();
  }, []);

  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingSensorId, setEditingSensorId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SensorConfig>({
    id: '',
    type: 'ESP32',
    mac: '',
    ip: '',
    location: ''
  });

  const handleOpenAddForm = () => {
    setEditingSensorId(null);
    setFormData({ id: '', type: 'ESP32', mac: '', ip: '', location: '' });
    setIsFormVisible(true);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const handleOpenEditForm = (sensor: SensorConfig) => {
    setEditingSensorId(sensor.id);
    setFormData(sensor);
    setIsFormVisible(true);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.location) return;

    try {
      await setDoc(doc(db, 'sensors', formData.id), formData);
      setIsFormVisible(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `sensors/${formData.id}`);
    }
  };

  const handleDeleteSensor = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'sensors', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sensors/${id}`);
    }
  };

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
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Capteurs Détectés en Direct</h3>
            <p className="text-sm text-slate-500">Liste des capteurs envoyant des données via MQTT</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20">
            <Wifi size={18} className="animate-pulse" />
            <span className="text-sm font-bold">{onlineSensors.length} En Ligne</span>
          </div>
        </div>

        <div className="overflow-x-auto mb-12">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] text-slate-500 uppercase tracking-widest border-b border-slate-800">
                <th className="pb-4 font-bold">Nom / ID</th>
                <th className="pb-4 font-bold">Type</th>
                <th className="pb-4 font-bold">Valeur</th>
                <th className="pb-4 font-bold">Localisation</th>
                <th className="pb-4 font-bold">Statut</th>
                <th className="pb-4 font-bold">Dernière MAJ</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {onlineSensors.length > 0 ? onlineSensors.map((s) => (
                <tr key={s.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                  <td className="py-4 font-bold text-white">{s.name}</td>
                  <td className="py-4"><span className="bg-slate-800 px-2 py-1 rounded text-xs text-white">{s.type}</span></td>
                  <td className="py-4 font-mono text-emerald-400">{s.value.toFixed(1)} {s.unit}</td>
                  <td className="py-4 text-slate-300">{s.location}</td>
                  <td className="py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                      s.status === 'SAFE' && "bg-emerald-500/10 text-emerald-400",
                      s.status === 'WARNING' && "bg-amber-500/10 text-amber-400",
                      s.status === 'DANGER' && "bg-rose-500/10 text-rose-400"
                    )}>
                      {s.status}
                    </span>
                  </td>
                  <td className="py-4 text-slate-500 text-xs">
                    {new Date(s.lastUpdate).toLocaleTimeString()}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 italic">
                    Aucun capteur détecté en direct sur le réseau MQTT.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mb-6 pt-8 border-t border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Inventaire des Capteurs</h3>
            <p className="text-sm text-slate-500">Gestion et configuration des unités ESP enregistrées</p>
          </div>
          <button 
            onClick={handleOpenAddForm}
            className="bg-ocp-green hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
          >
            <Plus size={18} />
            <span>Ajouter à l'Inventaire</span>
          </button>
        </div>

        <div className="overflow-x-auto mb-12">
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
              {sensors.length > 0 ? sensors.map((s) => {
                const isOnline = onlineSensors.some(os => os.id === s.id);
                return (
                  <tr key={s.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 font-mono text-emerald-400">{s.id}</td>
                    <td className="py-4"><span className="bg-slate-800 px-2 py-1 rounded text-xs text-white">{s.type}</span></td>
                    <td className="py-4 font-mono text-xs text-slate-400">{s.mac}</td>
                    <td className="py-4 font-mono text-xs text-slate-400">{s.ip}</td>
                    <td className="py-4 text-slate-300">{s.location}</td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
                        <span className={isOnline ? 'text-emerald-400' : 'text-slate-500'}>
                          {isOnline ? 'En ligne' : 'Hors ligne'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleOpenEditForm(s)}
                          className="text-slate-500 hover:text-emerald-500 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteSensor(s.id)}
                          className="text-slate-500 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 italic">
                    Aucun capteur configuré. Utilisez le formulaire ci-dessous pour en ajouter un.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Formulaire en bas */}
        <AnimatePresence>
          {isFormVisible && (
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="mt-12 p-8 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-emerald-900/30 rounded-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Plus className="text-ocp-green" />
                  {editingSensorId ? 'Modifier le Capteur' : 'Ajouter un Nouveau Capteur'}
                </h3>
                <button onClick={() => setIsFormVisible(false)} className="text-slate-500 hover:text-rose-500">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">ID Capteur (ex: SUP_ESP32_04)</label>
                  <input 
                    required
                    type="text" 
                    value={formData.id}
                    onChange={(e) => setFormData({...formData, id: e.target.value})}
                    disabled={!!editingSensorId}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-ocp-green outline-none transition-all disabled:opacity-50 text-slate-900 dark:text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Type d'unité</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-ocp-green outline-none transition-all text-slate-900 dark:text-white"
                  >
                    <option value="ESP32">ESP32</option>
                    <option value="ESP8266">ESP8266</option>
                    <option value="D1MINI">D1 Mini</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Adresse MAC</label>
                  <input 
                    type="text" 
                    placeholder="XX:XX:XX:XX:XX:XX"
                    value={formData.mac}
                    onChange={(e) => setFormData({...formData, mac: e.target.value})}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-ocp-green outline-none transition-all text-slate-900 dark:text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Adresse IP</label>
                  <input 
                    type="text" 
                    placeholder="192.168.X.X"
                    value={formData.ip}
                    onChange={(e) => setFormData({...formData, ip: e.target.value})}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-ocp-green outline-none transition-all text-slate-900 dark:text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Localisation</label>
                  <input 
                    required
                    type="text" 
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-ocp-green outline-none transition-all text-slate-900 dark:text-white" 
                  />
                </div>
                <div className="flex items-end">
                  <button type="submit" className="w-full bg-ocp-green hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20">
                    {editingSensorId ? 'Mettre à jour' : 'Enregistrer l\'unité'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
