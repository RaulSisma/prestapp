import React, { useState } from 'react';
import { X, Key, CheckCircle, Shield, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

interface UserProfileModalProps {
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ onClose }) => {
  const { currentUser } = useAuth();
  const { updateUserPassword } = useData();

  const [currentPasswordInput, setCurrentPasswordInput] = useState<string>('');
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  
  const [showPass, setShowPass] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!currentUser) return null;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Validar contraseña actual si existe en el objeto de usuario
    if (currentUser.password && currentPasswordInput !== currentUser.password) {
      setErrorMsg('La contraseña actual ingresada no es correcta.');
      return;
    }

    if (newPasswordInput.length < 4) {
      setErrorMsg('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setErrorMsg('La confirmación de la contraseña no coincide.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateUserPassword(currentUser.id, newPasswordInput);
      setSuccessMsg('¡Tu contraseña ha sido actualizada correctamente!');
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
    } catch {
      setErrorMsg('Error al actualizar la contraseña.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Mi Perfil y Seguridad</h3>
              <p className="text-xs text-slate-400">Actualiza tu contraseña de acceso</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <div className="p-6 space-y-5">
          
          {/* Card Info Usuario */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Usuario Activo:</span>
              <span className="font-bold text-white text-sm">{currentUser.nombre}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Correo:</span>
              <span className="text-slate-300">{currentUser.correo}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">N° Documento:</span>
              <span className="font-mono text-emerald-400 font-bold">{currentUser.documento}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Rol:</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300">
                {currentUser.rol}
              </span>
            </div>
          </div>

          {/* Formulario Cambio de Clave */}
          <form onSubmit={handlePasswordChange} className="space-y-4">
            
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Contraseña Actual *
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                required
                placeholder="Ingresa tu contraseña actual"
                value={currentPasswordInput}
                onChange={(e) => setCurrentPasswordInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nueva Contraseña *
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  placeholder="Mínimo 4 caracteres"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Confirmar Nueva Contraseña *
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                required
                placeholder="Repite la nueva contraseña"
                value={confirmPasswordInput}
                onChange={(e) => setConfirmPasswordInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-600/20 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4" />
                {isSubmitting ? 'Guardando...' : 'Actualizar Contraseña'}
              </button>
            </div>

          </form>

        </div>

      </div>
    </div>
  );
};
