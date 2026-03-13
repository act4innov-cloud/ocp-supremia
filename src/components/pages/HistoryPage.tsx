import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Clock, Download, Search, Filter, AlertTriangle, Info, AlertCircle, Database } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, query, orderBy, onSnapshot, limit, Timestamp } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface NotificationEvent {
  id: string;
  type: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'DANGER' | 'ERROR';
  sensorId: string;
  timestamp: Timestamp;
}

export default function HistoryPage({ isDarkMode }: { isDarkMode: boolean }) {
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'INFO' | 'WARNING' | 'DANGER' | 'ERROR'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('timestamp', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const evs: NotificationEvent[] = [];
      snapshot.forEach(doc => {
        evs.push({ id: doc.id, ...doc.data() } as NotificationEvent);
      });
      setEvents(evs);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredEvents = events.filter(ev => {
    const matchesSearch = ev.message.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          ev.sensorId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'ALL' || ev.severity === filter;
    return matchesSearch && matchesFilter;
  });

  const exportPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Historique des Notifications SUPREMIA', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Généré le : ${new Date().toLocaleString()}`, 14, 30);

    const tableData = filteredEvents.map(ev => {
      // Clean up message for PDF rendering (strip emojis and special chars that break jsPDF default font)
      // jsPDF default font (Helvetica) doesn't support emojis and some unicode symbols
      const cleanMsg = ev.message
        .replace(/✅/g, '[OK]')
        .replace(/⚠️/g, '[ATTENTION]')
        .replace(/🚨/g, '[DANGER]')
        .replace(/🟢/g, '[EN LIGNE]')
        .replace(/🔴/g, '[HORS LIGNE]')
        .replace(/➔/g, '->')
        // Remove other emojis and non-standard characters using a robust regex
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        // Replace newlines with spaces for table compatibility
        .replace(/\n/g, ' ')
        .trim();

      return [
        ev.timestamp?.toDate().toLocaleString() || 'N/A',
        ev.severity,
        ev.sensorId,
        cleanMsg
      ];
    });

    autoTable(doc, {
      startY: 35,
      head: [['Date', 'Sévérité', 'Source', 'Message']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] }, // OCP Green
    });

    doc.save(`supremia_historique_${Date.now()}.pdf`);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'DANGER': return <AlertCircle className="text-rose-500" size={18} />;
      case 'ERROR': return <AlertCircle className="text-rose-600" size={18} />;
      case 'WARNING': return <AlertTriangle className="text-amber-500" size={18} />;
      default: return <Info className="text-blue-500" size={18} />;
    }
  };

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'DANGER': return isDarkMode ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50 border-rose-100';
      case 'ERROR': return isDarkMode ? 'bg-rose-600/10 border-rose-600/20' : 'bg-rose-100 border-rose-200';
      case 'WARNING': return isDarkMode ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-100';
      default: return isDarkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={isDarkMode ? "text-2xl font-bold text-white" : "text-2xl font-bold text-slate-900"}>
            Historique des Événements
          </h2>
          <p className="text-slate-500 text-sm">Consultez et exportez les notifications du système</p>
        </div>
        
        <button 
          onClick={exportPDF}
          disabled={filteredEvents.length === 0}
          className="bg-ocp-green hover:opacity-90 disabled:opacity-50 text-black px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg shadow-emerald-900/10"
        >
          <Download size={18} /> Exporter PDF
        </button>
      </div>

      <div className="glass p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text"
            placeholder="Rechercher un message ou un capteur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/20 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-ocp-green transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <Filter size={16} className="text-slate-500 shrink-0" />
          {(['ALL', 'INFO', 'WARNING', 'DANGER', 'ERROR'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                filter === f 
                  ? 'bg-ocp-green text-black' 
                  : 'bg-slate-800/50 text-slate-400 hover:text-white'
              }`}
            >
              {f === 'ALL' ? 'Tous' : f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <div className="w-8 h-8 border-2 border-ocp-green/30 border-t-ocp-green rounded-full animate-spin mb-4" />
            <p>Chargement de l'historique...</p>
          </div>
        ) : filteredEvents.length > 0 ? (
          filteredEvents.map((ev, index) => (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`p-4 rounded-2xl border flex items-start gap-4 ${getSeverityClass(ev.severity)}`}
            >
              <div className="mt-1">{getSeverityIcon(ev.severity)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {ev.sensorId} • {ev.type}
                  </span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Clock size={10} />
                    {ev.timestamp?.toDate().toLocaleString()}
                  </span>
                </div>
                <p className={`text-sm leading-relaxed ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                  {ev.message}
                </p>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="glass p-12 flex flex-col items-center justify-center text-slate-500 border-dashed">
            <Clock size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">Aucun événement trouvé</p>
            <p className="text-sm">Essayez de modifier vos filtres ou votre recherche.</p>
          </div>
        )}
      </div>
    </div>
  );
}
