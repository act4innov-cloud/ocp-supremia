import React, { useState, useRef } from 'react';
import { User, Camera, Lock, Save, ShieldCheck, AlertCircle, Upload, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { auth, updateUserProfile, updateUserPassword, uploadProfileImage } from '../../firebase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ProfilePage({ isDarkMode }: { isDarkMode: boolean }) {
  const user = auth.currentUser;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation basique
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: "Veuillez sélectionner une image valide." });
      return;
    }
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      setMessage({ type: 'error', text: "L'image est trop volumineuse (max 2Mo)." });
      return;
    }

    setIsUploading(true);
    setMessage(null);
    try {
      const downloadURL = await uploadProfileImage(file);
      setPhotoURL(downloadURL);
      setMessage({ type: 'success', text: "Image téléchargée ! N'oubliez pas d'enregistrer les modifications." });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || "Erreur lors de l'upload." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    try {
      await updateUserProfile(displayName, photoURL);
      setMessage({ type: 'success', text: "Profil mis à jour avec succès !" });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || "Erreur lors de la mise à jour du profil." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: "Les mots de passe ne correspondent pas." });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: "Le mot de passe doit contenir au moins 6 caractères." });
      return;
    }

    setIsLoading(true);
    setMessage(null);
    try {
      await updateUserPassword(newPassword);
      setMessage({ type: 'success', text: "Mot de passe mis à jour avec succès !" });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || "Erreur lors de la mise à jour du mot de passe." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8 pb-12"
    >
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-ocp-green rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-900/20">
          <User className="text-black" size={24} />
        </div>
        <div>
          <h2 className={cn("text-2xl font-bold", isDarkMode ? "text-white" : "text-slate-900")}>Mon Profil</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">Gérez vos informations personnelles et votre sécurité</p>
        </div>
      </div>

      {message && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "p-4 rounded-xl flex items-center gap-3 border",
            message.type === 'success' ? "bg-ocp-green/10 border-ocp-green/20 text-ocp-green" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
          )}
        >
          {message.type === 'success' ? <ShieldCheck size={20} /> : <AlertCircle size={20} />}
          <p className="text-sm font-medium">{message.text}</p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Informations Personnelles */}
        <div className="glass p-8 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Camera className="text-ocp-green" size={20} />
            <h3 className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>Informations Personnelles</h3>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full border-2 border-ocp-green/30 overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                  {isUploading ? (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                      <Loader2 className="text-ocp-green animate-spin" size={24} />
                    </div>
                  ) : null}
                  <img 
                    src={photoURL || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + (user?.uid || 'default')} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Upload className="text-white" size={24} />
                  </button>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Cliquez pour changer la photo</p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Nom d'affichage</label>
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-ocp-green outline-none transition-all"
                placeholder="Votre nom"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">URL de la Photo (Optionnel)</label>
              <input 
                type="text" 
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                className="w-full bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-ocp-green outline-none transition-all"
                placeholder="https://images.unsplash.com/..."
              />
            </div>

            <button 
              type="submit"
              disabled={isLoading || isUploading}
              className="w-full bg-ocp-green hover:opacity-90 disabled:opacity-50 text-black py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              <Save size={18} />
              Enregistrer les modifications
            </button>
          </form>
        </div>

        {/* Sécurité */}
        <div className="glass p-8 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Lock className="text-ocp-green" size={20} />
            <h3 className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>Sécurité du Compte</h3>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Nouveau Mot de passe</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-ocp-green outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Confirmer le Mot de passe</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-ocp-green outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl">
              <p className="text-[10px] text-amber-500/80 leading-relaxed">
                <AlertCircle size={10} className="inline mr-1" />
                Pour des raisons de sécurité, le changement de mot de passe peut nécessiter une reconnexion récente si votre session est ancienne.
              </p>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-900 dark:text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700"
            >
              <Lock size={18} />
              Changer le mot de passe
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
