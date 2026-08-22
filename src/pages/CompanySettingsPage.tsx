import React, { useState, useRef } from 'react';
import { 
  Building2, Upload, Image as ImageIcon, Save, CheckCircle2, 
  AlertCircle, Sparkles, Trash2, RefreshCw
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { uploadToCloudinary } from '../lib/cloudinary';

export const CompanySettingsPage: React.FC = () => {
  const { companyConfig, updateCompanyConfig } = useData();
  const { hasPermission } = useAuth();

  const canEdit = hasPermission('edit_company_settings') || hasPermission('view_company_settings');

  const [nombre, setNombre] = useState<string>(companyConfig.nombre || 'PRESTAPP');
  const [slogan, setSlogan] = useState<string>(companyConfig.slogan || '');
  const [nit, setNit] = useState<string>(companyConfig.nit || '');
  const [logoUrl, setLogoUrl] = useState<string>(companyConfig.logo_url || '');
  
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', message: 'Por favor selecciona un archivo de imagen válido (PNG, JPG, WEBP).' });
      return;
    }

    setIsUploading(true);
    setFeedback(null);
    try {
      const url = await uploadToCloudinary(file);
      if (url) {
        setLogoUrl(url);
        setFeedback({ type: 'success', message: 'Logo procesado y cargado correctamente.' });
      } else {
        setFeedback({ type: 'error', message: 'No se pudo procesar la imagen del logo.' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al subir el logo';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
    setFeedback({ type: 'success', message: 'Logo removido. Recuerda guardar los cambios.' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setFeedback({ type: 'error', message: 'El nombre de la empresa es obligatorio.' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      await updateCompanyConfig({
        nombre: nombre.trim(),
        slogan: slogan.trim(),
        nit: nit.trim(),
        logo_url: logoUrl.trim()
      });
      setFeedback({ type: 'success', message: '¡Configuración de empresa guardada con éxito!' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la configuración';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-2 sm:px-0">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-emerald-400" />
            Configuración de Empresa
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Personaliza la identidad, logo, slogan y NIT que se reflejarán en la aplicación, login y comprobantes térmicos.
          </p>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-center gap-3 animate-in fade-in duration-200 ${
          feedback.type === 'success' 
            ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300' 
            : 'bg-red-950/70 border-red-800 text-red-300'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* FORMULARIO DE AJUSTES */}
        <div className="lg:col-span-7 glass-panel p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* LOGO DE LA EMPRESA */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> Logo de la Empresa (PNG Transparente Recomendado)
              </label>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                {/* Visualizador del Logo */}
                <div className="w-24 h-24 rounded-2xl bg-slate-950/80 border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden shrink-0 relative group">
                  {logoUrl ? (
                    <img 
                      src={logoUrl} 
                      alt="Logo Empresa" 
                      className="w-full h-full object-contain p-2"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="text-center p-2">
                      <ImageIcon className="w-8 h-8 mx-auto text-slate-600 mb-1" />
                      <span className="text-[10px] text-slate-500 font-medium">Sin logo</span>
                    </div>
                  )}

                  {isUploading && (
                    <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
                      <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Acciones del Logo */}
                <div className="flex-1 space-y-2 text-center sm:text-left w-full">
                  <p className="text-xs text-slate-300">
                    Se mostrará en la barra superior, login y en los comprobantes de pago.
                  </p>
                  
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleLogoUpload} 
                      accept="image/png,image/jpeg,image/webp,image/svg+xml" 
                      className="hidden" 
                    />
                    <button
                      type="button"
                      disabled={isUploading || !canEdit}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition active:scale-95"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{logoUrl ? 'Cambiar Logo' : 'Subir Logo PNG'}</span>
                    </button>

                    {logoUrl && (
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={handleRemoveLogo}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 text-xs font-semibold transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover</span>
                      </button>
                    )}
                  </div>

                  {logoUrl && (
                    <div className="mt-2 text-[11px] text-slate-400 truncate">
                      {logoUrl.includes('cloudinary.com') ? (
                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Cloudinary: {logoUrl}
                        </span>
                      ) : (
                        <span className="text-amber-400 font-medium">
                          ⚠️ Logo local en Base64. Haz clic en "Cambiar Logo" para subirlo a Cloudinary.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* NOMBRE DE LA EMPRESA */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Nombre de la Empresa <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                disabled={!canEdit}
                placeholder="Ej. PRESTAMAX COLOMBIA S.A.S"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* SLOGAN O LEMA */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Slogan / Lema (Opcional)
              </label>
              <input
                type="text"
                disabled={!canEdit}
                placeholder="Ej. Manejo Financiero Fácil y Rápido"
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Aparece debajo del nombre de la empresa en los encabezados de los recibos impresos y digitales.
              </p>
            </div>

            {/* NIT O IDENTIFICACIÓN FISCAL */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                NIT / Identificación Fiscal (Opcional)
              </label>
              <input
                type="text"
                disabled={!canEdit}
                placeholder="Ej. NIT: 900.123.456-7 o RUT"
                value={nit}
                onChange={(e) => setNit(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* BOTÓN GUARDAR */}
            {canEdit && (
              <div className="pt-3 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-white font-black text-sm shadow-xl shadow-emerald-500/25 transition active:scale-95"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Guardando Cambios...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Guardar Configuración de Empresa</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* VISTA PREVIA EN VIVO */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 border-b border-slate-800 pb-3">
              <Sparkles className="w-4 h-4" />
              <h3 className="font-bold text-xs sm:text-sm text-white uppercase tracking-wider">
                Vista Previa de Comprobante Térmico
              </h3>
            </div>

            {/* TICKET DE PRUEBA */}
            <div className="bg-amber-50/95 text-slate-900 p-4 rounded-xl shadow-inner thermal-font text-xs space-y-3 border border-amber-200">
              <div className="text-center pb-2 border-b border-dashed border-slate-400">
                {logoUrl && (
                  <div className="w-16 h-16 mx-auto mb-1 flex items-center justify-center">
                    <img 
                      src={logoUrl} 
                      alt="Logo Recibo" 
                      className="max-h-full max-w-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <h2 className="text-base font-bold tracking-wider uppercase">{nombre || 'PRESTAPP'}</h2>
                {slogan && <p className="text-[10px] text-slate-600 uppercase tracking-widest">{slogan}</p>}
                {nit && <p className="text-[10px] text-slate-500 mt-0.5">NIT: {nit}</p>}
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-600">Recibo #:</span>
                  <span className="font-bold">REC-849201</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Fecha/Hora:</span>
                  <span>{new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Cliente:</span>
                  <span className="font-bold">Carlos Mendoza</span>
                </div>
              </div>

              <div className="border-t border-b border-dashed border-slate-400 py-1.5 text-center font-bold text-xs text-emerald-800">
                VALOR RECIBIDO: $50.000 COP
              </div>

              <div className="text-center pt-2 text-[10px] text-slate-600">
                <p className="font-semibold">¡Gracias por su pago puntual!</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              Así es como tus clientes y cobradores visualizarán e imprimirán los recibos en físico y por WhatsApp.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};

export default CompanySettingsPage;
