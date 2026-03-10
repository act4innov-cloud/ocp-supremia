import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, Archive, FileDown, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { db } from '../../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Report {
  id: string;
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  timestamp: string;
  pdfBase64: string;
  data: any[];
}

export default function ReportsPage({ isDarkMode }: { isDarkMode: boolean }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reportsData: Report[] = [];
      snapshot.forEach((doc) => {
        reportsData.push(doc.data() as Report);
      });
      setReports(reportsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const downloadPDF = (report: Report) => {
    const linkSource = `data:application/pdf;base64,${report.pdfBase64}`;
    const downloadLink = document.createElement("a");
    const fileName = `Rapport_${report.type}_${new Date(report.timestamp).toLocaleDateString().replace(/\//g, '-')}.pdf`;

    downloadLink.href = linkSource;
    downloadLink.download = fileName;
    downloadLink.click();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="glass p-6">
        <h3 className={cn("text-lg font-bold mb-6", isDarkMode ? "text-white" : "text-slate-900")}>Planification des Rapports Automatiques</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'Journalier', desc: 'Généré à 6h, 14h et 22h', icon: Calendar, color: 'bg-blue-600' },
            { title: 'Hebdomadaire', desc: 'Chaque Lundi à 8h', icon: FileText, color: 'bg-emerald-600' },
            { title: 'Mensuel', desc: 'Chaque 1er du mois à 0h', icon: Archive, color: 'bg-purple-600' },
          ].map((report, i) => (
            <div key={i} className="glass p-6 text-center transition-all group">
              <div className={`w-16 h-16 ${report.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                <report.icon className="text-white" size={32} />
              </div>
              <h4 className={cn("font-bold text-lg mb-1", isDarkMode ? "text-white" : "text-slate-900")}>{report.title}</h4>
              <p className="text-xs text-slate-500 mb-2">{report.desc}</p>
              <div className="text-[10px] uppercase font-bold text-ocp-green bg-ocp-green/10 py-1 px-3 rounded-full inline-block">
                Activé
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className={cn("text-lg font-bold", isDarkMode ? "text-white" : "text-slate-900")}>Archive des Rapports</h3>
          <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Voir tout</button>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-ocp-green" size={32} />
          </div>
        ) : reports.length > 0 ? (
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.id} className={cn("glass p-4 flex justify-between items-center transition-colors", isDarkMode ? "bg-slate-800/30 hover:bg-slate-800/50" : "bg-slate-100 hover:bg-slate-200")}>
                <div className="flex items-center gap-4">
                  <div className={cn("p-2 rounded-lg border", isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
                    <FileText className={cn(
                      report.type === 'DAILY' ? "text-blue-500" : 
                      report.type === 'WEEKLY' ? "text-emerald-500" : "text-purple-500"
                    )} size={20} />
                  </div>
                  <div>
                    <h4 className={cn("text-sm font-bold", isDarkMode ? "text-white" : "text-slate-900")}>
                      Rapport {report.type === 'DAILY' ? 'Journalier' : report.type === 'WEEKLY' ? 'Hebdomadaire' : 'Mensuel'}
                    </h4>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">
                      {new Date(report.timestamp).toLocaleString('fr-FR')} • {report.data.length} Capteurs
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => downloadPDF(report)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-blue-600 dark:text-blue-400 transition-colors"
                  title="Télécharger PDF"
                >
                  <Download size={18} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <FileDown size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-sm">Aucun rapport archivé pour le moment.</p>
            <p className="text-[10px] uppercase mt-2">Les rapports sont générés automatiquement selon le planning.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
