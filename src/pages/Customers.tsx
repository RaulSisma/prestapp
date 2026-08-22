import React, { useState } from 'react';
import { 
  Search, MapPin, Phone, 
  FileText, UserPlus, DollarSign, X, Camera, UploadCloud, Eye,
  Pencil, Receipt, Trash2, AlertTriangle, CheckCircle
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Customer } from '../types';
import { LoanModal } from '../components/LoanModal';
import { CustomerPaymentHistoryModal } from '../components/CustomerPaymentHistoryModal';
import { uploadToCloudinary } from '../lib/cloudinary';

export const Customers: React.FC = () => {
  const { customers, routes, loans, addCustomer, updateCustomer, deleteCustomer } = useData();
  const { currentUser, role, hasPermission } = useAuth();

  const isGlobalViewer = role === 'ADMIN' || role === 'SUPERVISOR';

  const allowedRoutes = isGlobalViewer 
    ? routes 
    : routes.filter(r => r.usuario_id === currentUser?.id);

  const allowedRouteIds = allowedRoutes.map(r => r.id);

  const scopedCustomers = isGlobalViewer
    ? customers
    : customers.filter(c => allowedRouteIds.includes(c.ruta_id));

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>('TODAS');
  
  const [showAddCustomerModal, setShowAddCustomerModal] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showLoanModalForCustomer, setShowLoanModalForCustomer] = useState<Customer | null>(null);
  const [showPaymentHistoryCustomer, setShowPaymentHistoryCustomer] = useState<Customer | null>(null);
  const [viewPhotosCustomer, setViewPhotosCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formNombre, setFormNombre] = useState<string>('');
  const [formDocumento, setFormDocumento] = useState<string>('');
  const [formTelefono, setFormTelefono] = useState<string>('');
  const [formDireccion, setFormDireccion] = useState<string>('');
  const [formBarrio, setFormBarrio] = useState<string>('');
  const [formAlias, setFormAlias] = useState<string>('');
  const [formRutaId, setFormRutaId] = useState<string>(allowedRoutes[0]?.id || '');
  
  const [formFotoCasa, setFormFotoCasa] = useState<string>('');
  const [formFotoCliente, setFormFotoCliente] = useState<string>('');
  const [formFotoDocumento, setFormFotoDocumento] = useState<string>('');
  
  const [uploadingCasa, setUploadingCasa] = useState<boolean>(false);
  const [uploadingCliente, setUploadingCliente] = useState<boolean>(false);
  const [uploadingDocumento, setUploadingDocumento] = useState<boolean>(false);

  const openNewCustomerForm = () => {
    setEditingCustomer(null);
    setFormNombre('');
    setFormDocumento('');
    setFormTelefono('');
    setFormDireccion('');
    setFormBarrio('');
    setFormAlias('');
    setFormFotoCasa('');
    setFormFotoCliente('');
    setFormFotoDocumento('');
    setFormRutaId(allowedRoutes[0]?.id || '');
    setShowAddCustomerModal(true);
  };

  const openEditCustomerForm = (c: Customer) => {
    setEditingCustomer(c);
    setFormNombre(c.nombre);
    setFormDocumento(c.documento || '');
    setFormTelefono(c.telefono);
    setFormDireccion(c.direccion);
    setFormBarrio(c.barrio);
    setFormAlias(c.alias || '');
    setFormFotoCasa(c.foto_casa || '');
    setFormFotoCliente(c.foto_cliente || '');
    setFormFotoDocumento(c.foto_documento || '');
    setFormRutaId(c.ruta_id);
    setShowAddCustomerModal(true);
  };

  const handleFileUpload = async (
    file: File, 
    setPhotoUrl: (url: string) => void, 
    setUploading: (u: boolean) => void
  ) => {
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      if (url) {
        setPhotoUrl(url);
      }
    } catch (err) {
      console.warn('Error al procesar imagen:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre || !formTelefono || !formRutaId) return;

    if (editingCustomer) {
      await updateCustomer(editingCustomer.id, {
        nombre: formNombre,
        documento: formDocumento,
        telefono: formTelefono,
        direccion: formDireccion,
        barrio: formBarrio,
        alias: formAlias,
        foto_casa: formFotoCasa,
        foto_cliente: formFotoCliente,
        foto_documento: formFotoDocumento,
        ruta_id: formRutaId
      });
      setShowAddCustomerModal(false);
    } else {
      const newCustomer = await addCustomer({
        nombre: formNombre,
        documento: formDocumento,
        telefono: formTelefono,
        direccion: formDireccion,
        barrio: formBarrio,
        alias: formAlias,
        foto_casa: formFotoCasa,
        foto_cliente: formFotoCliente,
        foto_documento: formFotoDocumento,
        ruta_id: formRutaId,
        estado: 'ACTIVO'
      });
      setShowAddCustomerModal(false);
      setNotification({ type: 'success', text: 'Cliente Agregado a nueva Ruta ' });
      // AUTOMÁTICAMENTE ABRE EL MODAL DE NUEVO PRÉSTAMO PARA EL CLIENTE recién CREADO
      setShowLoanModalForCustomer(newCustomer);
    }
  };

  const filteredCustomers = scopedCustomers.filter(c => {
    const matchesSearch = c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.barrio.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.telefono.includes(searchTerm);
    const matchesRoute = selectedRouteFilter === 'TODAS' || c.ruta_id === selectedRouteFilter;
    return matchesSearch && matchesRoute;
  });

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto px-2 sm:px-0">
      
      {/* HEADER ADAPTATIVO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5 flex-wrap">
            {role === 'ADMIN' ? 'Gestión de Clientes' : 'Mis Clientes de Ruta'}
            <span className="text-xs px-2.5 py-0.5 sm:py-1 rounded-full bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
              {scopedCustomers.length} Asignados
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {role === 'ADMIN' ? 'Administración global de clientes y fotografías.' : 'Lista de clientes con fotos de fachada, cliente y documento.'}
          </p>
        </div>

        {hasPermission('create_customer') && (
          <button
            onClick={openNewCustomerForm}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            Nuevo Cliente
          </button>
        )}
      </div>

      {/* NOTIFICACIÓN ALERTA */}
      {notification && (
        <div className={`p-4 rounded-2xl text-xs sm:text-sm flex items-center justify-between border ${
          notification.type === 'error' 
            ? 'bg-red-950/70 border-red-800 text-red-300' 
            : 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* BARRA BUSCADOR Y FILTROS */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, barrio o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {allowedRoutes.length > 1 && (
          <select
            value={selectedRouteFilter}
            onChange={(e) => setSelectedRouteFilter(e.target.value)}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs sm:text-sm font-semibold text-white focus:outline-none"
          >
            <option value="TODAS">Todas mis Rutas</option>
            {allowedRoutes.map(r => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
        )}
      </div>

      {/* GRID CLIENTES ADAPTATIVO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full p-8 text-center glass-panel rounded-3xl border border-slate-800 text-slate-400 text-xs sm:text-sm">
            No se encontraron clientes asignados en tus rutas.
          </div>
        ) : (
          filteredCustomers.map(customer => {
            const route = routes.find(r => r.id === customer.ruta_id);
            const customerLoans = loans.filter(l => l.cliente_id === customer.id);
            const activeLoan = customerLoans.find(l => l.estado === 'ACTIVO' || l.estado === 'EN_MORA');

            const hasPhotos = customer.foto_casa || customer.foto_cliente || customer.foto_documento;

            return (
              <div 
                key={customer.id}
                className="glass-card p-4 sm:p-5 rounded-3xl border border-slate-800/80 flex flex-col justify-between hover:border-slate-700 transition"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {customer.foto_cliente ? (
                        <img 
                          src={customer.foto_cliente} 
                          alt={customer.nombre} 
                          className="w-11 h-11 rounded-2xl object-cover border border-emerald-500/40 shadow-sm shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-sm shrink-0">
                          {customer.nombre.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm sm:text-base text-white truncate">{customer.nombre}</h3>
                        {customer.alias && (
                          <span className="text-xs text-emerald-400 font-medium block truncate">"{customer.alias}"</span>
                        )}
                        {hasPermission('edit_customer') && (
                          <button
                            onClick={() => openEditCustomerForm(customer)}
                            className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition border border-slate-700/60"
                            title="Editar información y fotos del cliente"
                          >
                            <Pencil className="w-2.5 h-2.5 text-emerald-400" />
                            <span>Editar / Fotos</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {route?.nombre || 'Sin Ruta'}
                      </span>
                      {hasPermission('delete_customer') && (
                        <button
                          onClick={() => setCustomerToDelete(customer)}
                          className="p-1.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition active:scale-95"
                          title="Eliminar Cliente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{customer.telefono}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{customer.direccion} ({customer.barrio})</span>
                    </div>
                    {customer.documento && (
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>C.C: {customer.documento}</span>
                      </div>
                    )}
                  </div>

                  {hasPhotos && (
                    <button
                      onClick={() => setViewPhotosCustomer(customer)}
                      className="w-full flex items-center justify-between p-2 sm:p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition"
                    >
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-emerald-400" />
                        <span className="font-semibold text-[11px] sm:text-xs">Fotos Adjuntas:</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {customer.foto_casa && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Casa</span>}
                        {customer.foto_cliente && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">Perfil</span>}
                        {customer.foto_documento && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">Doc</span>}
                        <Eye className="w-3.5 h-3.5 text-slate-400 ml-1" />
                      </div>
                    </button>
                  )}

                  {activeLoan ? (
                    <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Préstamo Activo:</span>
                        <span className="font-bold text-emerald-400">${activeLoan.monto.toLocaleString('es-CO')}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Saldo Pendiente:</span>
                        <span className="font-extrabold text-red-400">${activeLoan.saldo.toLocaleString('es-CO')}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-2xl bg-slate-900/40 text-center text-xs text-slate-500">
                      Sin préstamo activo
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setShowPaymentHistoryCustomer(customer)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 font-bold text-xs border border-slate-700/80 transition shadow-sm"
                    title="Historial de abonos, proyección de cuotas e indicador de cumplimiento"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Historial de Pagos</span>
                  </button>

                  {hasPermission('create_loan') && (
                    <button
                      onClick={() => setShowLoanModalForCustomer(customer)}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 font-semibold text-xs border border-blue-500/30 transition"
                    >
                      <DollarSign className="w-3.5 h-3.5" /> Nuevo Préstamo
                    </button>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* MODAL CREAR / EDITAR CLIENTE */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
            
            <div className="flex justify-between items-center px-5 sm:px-6 py-4 border-b border-slate-800">
              <h3 className="font-bold text-white text-base sm:text-lg">
                {editingCustomer ? 'Editar Cliente y Fotos' : 'Registrar Nuevo Cliente'}
              </h3>
              <button onClick={() => setShowAddCustomerModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCustomer} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={formNombre}
                  onChange={e => setFormNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Teléfono *</label>
                  <input
                    type="text"
                    required
                    value={formTelefono}
                    onChange={e => setFormTelefono(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Cédula / Documento</label>
                  <input
                    type="text"
                    value={formDocumento}
                    onChange={e => setFormDocumento(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Dirección *</label>
                <input
                  type="text"
                  required
                  value={formDireccion}
                  onChange={e => setFormDireccion(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Barrio *</label>
                  <input
                    type="text"
                    required
                    value={formBarrio}
                    onChange={e => setFormBarrio(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Alias / Apodo</label>
                  <input
                    type="text"
                    value={formAlias}
                    onChange={e => setFormAlias(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Ruta Asignada *</label>
                <select
                  value={formRutaId}
                  onChange={e => setFormRutaId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {allowedRoutes.map(r => (
                    <option key={r.id} value={r.id}>{r.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-800">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-4 h-4" />
                  Fotografías de Verificación (Cloudinary)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-center space-y-2">
                    <span className="text-[11px] font-bold text-slate-300 block">1. Fachada Casa</span>
                    {formFotoCasa ? (
                      <div className="relative group">
                        <img src={formFotoCasa} alt="Casa" className="w-full h-20 object-cover rounded-xl border border-emerald-500/40" />
                        <button
                          type="button"
                          onClick={() => setFormFotoCasa('')}
                          className="absolute top-1 right-1 p-1 bg-red-600 rounded-full text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center justify-center h-20 rounded-xl border border-dashed border-slate-600 hover:border-emerald-500 bg-slate-900/50 transition">
                        <UploadCloud className="w-5 h-5 text-slate-400 mb-1" />
                        <span className="text-[10px] text-slate-400">
                          {uploadingCasa ? 'Subiendo...' : 'Subir Foto'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            if (e.target.files?.[0]) {
                              handleFileUpload(e.target.files[0], setFormFotoCasa, setUploadingCasa);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-center space-y-2">
                    <span className="text-[11px] font-bold text-slate-300 block">2. Foto Cliente</span>
                    {formFotoCliente ? (
                      <div className="relative group">
                        <img src={formFotoCliente} alt="Cliente" className="w-full h-20 object-cover rounded-xl border border-blue-500/40" />
                        <button
                          type="button"
                          onClick={() => setFormFotoCliente('')}
                          className="absolute top-1 right-1 p-1 bg-red-600 rounded-full text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center justify-center h-20 rounded-xl border border-dashed border-slate-600 hover:border-blue-500 bg-slate-900/50 transition">
                        <UploadCloud className="w-5 h-5 text-slate-400 mb-1" />
                        <span className="text-[10px] text-slate-400">
                          {uploadingCliente ? 'Subiendo...' : 'Subir Foto'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            if (e.target.files?.[0]) {
                              handleFileUpload(e.target.files[0], setFormFotoCliente, setUploadingCliente);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-center space-y-2">
                    <span className="text-[11px] font-bold text-slate-300 block">3. Documento / ID</span>
                    {formFotoDocumento ? (
                      <div className="relative group">
                        <img src={formFotoDocumento} alt="Documento" className="w-full h-20 object-cover rounded-xl border border-purple-500/40" />
                        <button
                          type="button"
                          onClick={() => setFormFotoDocumento('')}
                          className="absolute top-1 right-1 p-1 bg-red-600 rounded-full text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center justify-center h-20 rounded-xl border border-dashed border-slate-600 hover:border-purple-500 bg-slate-900/50 transition">
                        <UploadCloud className="w-5 h-5 text-slate-400 mb-1" />
                        <span className="text-[10px] text-slate-400">
                          {uploadingDocumento ? 'Subiendo...' : 'Subir Foto'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            if (e.target.files?.[0]) {
                              handleFileUpload(e.target.files[0], setFormFotoDocumento, setUploadingDocumento);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>

                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={uploadingCasa || uploadingCliente || uploadingDocumento}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
                >
                  {editingCustomer ? 'Guardar Cambios' : 'Registrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VER FOTOS */}
      {viewPhotosCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-4 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-400" />
                Fotografías de {viewPhotosCustomer.nombre}
              </h3>
              <button onClick={() => setViewPhotosCustomer(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2">
              <div className="space-y-1 text-center">
                <span className="text-xs font-bold text-emerald-400 block">Fachada Casa</span>
                {viewPhotosCustomer.foto_casa ? (
                  <a href={viewPhotosCustomer.foto_casa} target="_blank" rel="noreferrer">
                    <img src={viewPhotosCustomer.foto_casa} alt="Casa" className="w-full h-44 object-cover rounded-2xl border border-slate-700 hover:opacity-90 transition" />
                  </a>
                ) : (
                  <div className="w-full h-44 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center justify-center text-xs text-slate-500">Sin foto</div>
                )}
              </div>

              <div className="space-y-1 text-center">
                <span className="text-xs font-bold text-blue-400 block">Perfil Cliente</span>
                {viewPhotosCustomer.foto_cliente ? (
                  <a href={viewPhotosCustomer.foto_cliente} target="_blank" rel="noreferrer">
                    <img src={viewPhotosCustomer.foto_cliente} alt="Cliente" className="w-full h-44 object-cover rounded-2xl border border-slate-700 hover:opacity-90 transition" />
                  </a>
                ) : (
                  <div className="w-full h-44 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center justify-center text-xs text-slate-500">Sin foto</div>
                )}
              </div>

              <div className="space-y-1 text-center">
                <span className="text-xs font-bold text-purple-400 block">Documento de Identidad</span>
                {viewPhotosCustomer.foto_documento ? (
                  <a href={viewPhotosCustomer.foto_documento} target="_blank" rel="noreferrer">
                    <img src={viewPhotosCustomer.foto_documento} alt="Documento" className="w-full h-44 object-cover rounded-2xl border border-slate-700 hover:opacity-90 transition" />
                  </a>
                ) : (
                  <div className="w-full h-44 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center justify-center text-xs text-slate-500">Sin foto</div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewPhotosCustomer(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showLoanModalForCustomer && (
        <LoanModal
          customer={showLoanModalForCustomer}
          onClose={() => setShowLoanModalForCustomer(null)}
        />
      )}

      {showPaymentHistoryCustomer && (
        <CustomerPaymentHistoryModal
          customer={showPaymentHistoryCustomer}
          onClose={() => setShowPaymentHistoryCustomer(null)}
          onNewPayment={() => {
            setShowLoanModalForCustomer(showPaymentHistoryCustomer);
          }}
        />
      )}

      {/* MODAL CONFIRMAR ELIMINACIÓN DE CLIENTE */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base sm:text-lg">¿Eliminar Cliente?</h3>
                <p className="text-xs text-slate-400">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Nombre:</span>
                <span className="font-bold text-white">{customerToDelete.nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Teléfono:</span>
                <span className="text-slate-300 font-mono">{customerToDelete.telefono}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Dirección:</span>
                <span className="text-slate-300 truncate max-w-[200px]">{customerToDelete.direccion}</span>
              </div>
              {(() => {
                const custLoans = loans.filter(l => l.cliente_id === customerToDelete.id);
                const activeLoans = custLoans.filter(l => l.saldo > 0);
                const totalDebt = activeLoans.reduce((sum, l) => sum + l.saldo, 0);

                if (activeLoans.length > 0) {
                  return (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                      <div>
                        <strong className="block font-bold">¡Atención!</strong>
                        El cliente tiene {activeLoans.length} préstamo(s) activo(s) con un saldo total de ${totalDebt.toLocaleString('es-CO')}. Se eliminarán sus créditos y pagos asociados.
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await deleteCustomer(customerToDelete.id);
                    setCustomerToDelete(null);
                  } catch (err) {
                    console.error('Error al eliminar cliente:', err);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar Cliente'}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setCustomerToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Customers;
