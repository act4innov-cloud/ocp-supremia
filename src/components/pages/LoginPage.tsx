import React, { useState } from 'react';
import { ShieldAlert, LogIn, Mail, Lock, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { signInWithGoogle, loginWithEmail, registerWithEmail } from '../../firebase';

export default function LoginPage() {
  const [showRegister, setShowRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (showRegister) {
        await registerWithEmail(email, password, displayName);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError("L'authentification par Email/Mot de passe n'est pas activée dans votre console Firebase. Veuillez l'activer dans 'Authentication' > 'Sign-in method'.");
      } else {
        setError(err.message || "Une erreur est survenue lors de la connexion.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la connexion Google.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-slate-950">
      {/* Background with 50% transparency */}
      <div 
        className="absolute inset-0 z-0 opacity-50 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1513828583688-c52646db42da?q=80&w=2070&auto=format&fit=crop")' 
        }}
      />
      
      {/* Overlay for better readability */}
      <div className="absolute inset-0 z-10 bg-slate-950/40 backdrop-blur-[2px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-20 w-full max-w-md p-8"
      >
        <div className="glass p-8 space-y-8 border-slate-700/50 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-ocp-green/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-ocp-green/30">
              <ShieldAlert className="text-ocp-green" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">SUPREMIA MONITOR</h1>
            <p className="text-slate-400 text-sm">Système de Surveillance Industrielle Sécurisé</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3"
            >
              <ShieldAlert className="text-rose-500 shrink-0" size={18} />
              <p className="text-xs text-rose-200 leading-relaxed">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {showRegister && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Nom Complet</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    type="text" 
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Jean Dupont"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-ocp-green outline-none transition-all backdrop-blur-sm" 
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Email Professionnel</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@ocpgroup.ma"
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-ocp-green outline-none transition-all backdrop-blur-sm" 
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-ocp-green outline-none transition-all backdrop-blur-sm" 
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-ocp-green hover:opacity-90 disabled:opacity-50 text-black py-4 rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20 mt-2"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Chargement...
                </div>
              ) : (
                showRegister ? "Créer un compte" : "Se connecter"
              )}
            </button>
          </form>

          <div className="text-center">
            <button 
              onClick={() => setShowRegister(!showRegister)}
              className="text-xs text-slate-500 hover:text-ocp-green transition-colors"
            >
              {showRegister ? "Déjà un compte ? Se connecter" : "Pas encore de compte ? S'inscrire"}
            </button>
          </div>

          <div className="flex items-center gap-4 py-2">
            <div className="h-px flex-1 bg-slate-800" />
            <span className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">OU</span>
            <div className="h-px flex-1 bg-slate-800" />
          </div>

          <button 
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-900 py-3 rounded-xl font-bold flex items-center justify-center gap-3 transition-all"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="" />
            Continuer avec Google
          </button>
        </div>
        
        <p className="text-center mt-8 text-[10px] text-slate-500 uppercase tracking-[0.2em]">
          © 2026 SUPREMIA • Sécurité Industrielle
        </p>
      </motion.div>
    </div>
  );
}
