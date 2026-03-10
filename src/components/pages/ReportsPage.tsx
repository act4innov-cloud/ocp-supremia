import React from 'react';
import { FileText, Download, Calendar, Archive, FileDown } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ReportsPage({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="glass p-6">
        <h3 className={cn("text-lg font-bold mb-6", isDarkMode ? "text-white" : "text-slate-900")}>Génération de Rapports PDF</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'Journalier', desc: 'Dernières 24 heures', icon: Calendar, color: 'bg-blue-600' },
            { title: 'Hebdomadaire', desc: '7 derniers jours', icon: FileText, color: 'bg-emerald-600' },
            { title: 'Mensuel', desc: 'Synthèse complète', icon: Archive, color: 'bg-purple-600' },
          ].map((report, i) => (
            <div key={i} className="glass p-6 text-center hover:border-slate-400 dark:hover:border-slate-600 transition-all group">
              <div className={`w-16 h-16 ${report.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                <report.icon className="text-white" size={32} />
              </div>
              <h4 className={cn("font-bold text-lg mb-1", isDarkMode ? "text-white" : "text-slate-900")}>{report.title}</h4>
              <p className="text-xs text-slate-500 mb-6">{report.desc}</p>
              <button className="w-full py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                <FileDown size={16} />
                Générer PDF
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="glass p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className={cn("text-lg font-bold", isDarkMode ? "text-white" : "text-slate-900")}>Archive des Rapports</h3>
          <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Voir tout</button>
        </div>
        <div className="space-y-3">
          {[
            { title: 'Rapport Journalier - 2026-03-06', type: 'Daily', size: '1.2 MB' },
            { title: 'Rapport Hebdomadaire - Semaine 09', type: 'Weekly', size: '4.5 MB' },
            { title: 'Alerte Critique Zone A - 2026-03-05', type: 'Incident', size: '0.8 MB' },
          ].map((item, i) => (
            <div key={i} className={cn("glass p-4 flex justify-between items-center transition-colors", isDarkMode ? "bg-slate-800/30 hover:bg-slate-800/50" : "bg-slate-100 hover:bg-slate-200")}>
              <div className="flex items-center gap-4">
                <div className={cn("p-2 rounded-lg border", isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
                  <FileText className="text-slate-400" size={20} />
                </div>
                <div>
                  <h4 className={cn("text-sm font-bold", isDarkMode ? "text-white" : "text-slate-900")}>{item.title}</h4>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">{item.type} • {item.size}</p>
                </div>
              </div>
              <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-blue-600 dark:text-blue-400 transition-colors">
                <Download size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
