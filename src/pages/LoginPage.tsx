import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { companyConfig } = useData();
  const navigate = useNavigate();

  const [correo, setCorreo] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const appName = companyConfig.nombre || 'PRESTAPP';
  const appSlogan = companyConfig.slogan || 'Sistema de Gestión Financiera y Cobranza';

  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!correo || !password) {
      setErrorMsg('Por favor completa tu correo y la contraseña.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(correo, password);

      if (result.success && result.user) {
        if (result.user.rol === 'ADMIN') {
          navigate('/', { replace: true });
        } else {
          navigate('/field-route', { replace: true });
        }
      } else {
        setErrorMsg(result.message || 'Error de autenticación.');
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ocurrió un error al iniciar sesión.';
      setErrorMsg(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl relative z-10 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header App Info */}
        <div className="text-center space-y-2">
          {companyConfig.logo_url ? (
            <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-900 border border-slate-700/80 flex items-center justify-center overflow-hidden p-1 shadow-lg shadow-emerald-500/10">
              <img 
                src={companyConfig.logo_url} 
                alt="Logo" 
                className="max-h-full max-w-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-slate-950 text-3xl shadow-lg shadow-emerald-500/25">
              {appName.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-2xl font-extrabold text-white tracking-tight uppercase">{appName}</h1>
          <p className="text-xs text-emerald-400 font-semibold uppercase tracking-widest">
            {appSlogan}
          </p>
        </div>

        {/* Success or Error banners */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-950/70 border border-red-800/80 text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-4 pt-2">
          
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Tu Email o Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                placeholder="correo@ejemplo.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-11 py-3 bg-slate-900 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-base shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <span>Ingresar al Sistema</span>
              )}
            </button>
          </div>

        </form>

      </div>

      <div className="text-xs text-slate-500 mt-6 text-center">
        PRESTAPP © 2026 • Sistema de Control Financiero
      </div>

    </div>
  );
};

export default LoginPage;

