'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  UserCheck, ShieldCheck, UserPlus, LogOut, CheckCircle, XCircle, Search,
  Edit3, BarChart3, FileSpreadsheet, MapPin, Paperclip, Globe, Monitor
} from 'lucide-react';
import { formatDateBogota, formatTimeBogota, formatDateFilenameBogota } from '@/lib/date-utils';

interface User {
  id: number;
  document: string;
  full_name: string;
  username: string | null;
  email: string | null;
  role: 'coordinador' | 'instructor';
  is_active: boolean;
  created_at: string;
}

export default function CoordinatorDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [instructors, setInstructors] = useState<User[]>([]);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [activeTab, setActiveTab] = useState<'instructores' | 'historial'>('instructores');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    document: '',
    username: '',
    email: '',
    role: 'instructor',
    is_active: true
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (!meData.authenticated || meData.user.role !== 'coordinador') {
        router.push('/login');
        return;
      }
      setCurrentUser(meData.user);

      await Promise.all([loadInstructors(), loadHistory()]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadInstructors = async () => {
    const res = await fetch('/api/coordinador/instructores');
    if (res.ok) {
      const data = await res.json();
      setInstructors(data.users || []);
    }
  };

  const loadHistory = async () => {
    const res = await fetch('/api/coordinador/history');
    if (res.ok) {
      const data = await res.json();
      setAttendances(data.attendances || []);
      setStats(data.stats || {});
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const exportToExcel = () => {
    const dataToExport = filteredAttendances.map(att => {
      const host = typeof window !== 'undefined' ? window.location.host : '';
      const fullExcuseUrl = att.excuse_path ? `${window.location.protocol}//${host}${att.excuse_path}` : 'Sin soporte';
      const hasGps = att.latitud && att.latitud !== 'Ubicación no disponible';
      const mapsUrl = hasGps ? `https://maps.google.com/?q=${att.latitud},${att.longitud}` : 'Sin GPS';

      return {
        'ID Sesión': att.qr_session_id || '',
        'Fecha (DD/MM/AAAA)': formatDateBogota(att.fecha),
        'Hora Oficial Servidor (HH:MM:SS)': formatTimeBogota(att.hora),
        'Estudiante': att.aprendiz_name || '',
        'Documento ID': att.aprendiz_document || '',
        'Estado': att.estado || '',
        'Horas Certificadas': att.horas || 0,
        'Tipo Registro': att.registro_tipo ? att.registro_tipo.replace('_', ' ') : 'Puntual',
        'Justificación / Excusa': att.excuse_note || '',
        'Enlace Soporte Excusa': fullExcuseUrl,
        'Ficha': att.ficha_code || '',
        'Ambiente': att.ambiente_name || '',
        'Jornada': att.jornada || '',
        'Grupo': att.grupo || '',
        'Sede': att.sede || '',
        'Instructor': att.instructor_name || '',
        'Coordenadas GPS': hasGps ? `${att.latitud}, ${att.longitud}` : att.location_status || 'Sin GPS',
        'Precisión GPS': att.precision_gps || 'No disponible',
        'IP Pública': att.ip_publica || 'Desconocida',
        'Dispositivo': att.dispositivo || 'Desconocido',
        'Navegador': att.navegador || 'Desconocido',
        'Estado Ubicación': att.location_status || 'No capturada',
        'Enlace Mapa Google': mapsUrl
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Auditoría Global SENA');

    const fileName = `Reporte_Global_Coordinacion_SENA_${formatDateFilenameBogota(new Date())}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      full_name: '',
      document: '',
      username: '',
      email: '',
      role: 'instructor',
      is_active: true
    });
    setFormError(null);
    setFormSuccess(null);
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name,
      document: user.document,
      username: user.username || '',
      email: user.email || '',
      role: user.role,
      is_active: user.is_active
    });
    setFormError(null);
    setFormSuccess(null);
    setShowModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const method = editingUser ? 'PUT' : 'POST';
    const payload = editingUser ? { id: editingUser.id, ...formData } : formData;

    try {
      const res = await fetch('/api/coordinador/instructores', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Error al guardar usuario.');
      } else {
        setFormSuccess(editingUser ? 'Usuario actualizado exitosamente.' : 'Instructor registrado exitosamente.');
        await loadInstructors();
        setTimeout(() => setShowModal(false), 1200);
      }
    } catch (err) {
      setFormError('Error de conexión con el servidor.');
    }
  };

  const toggleUserStatus = async (user: User) => {
    try {
      const res = await fetch('/api/coordinador/instructores', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, is_active: !user.is_active })
      });
      if (res.ok) {
        await loadInstructors();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredInstructors = instructors.filter(i =>
    i.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.document.includes(searchTerm) ||
    (i.username && i.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredAttendances = attendances.filter(a =>
    a.aprendiz_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.aprendiz_document.includes(searchTerm) ||
    a.ficha_code.includes(searchTerm) ||
    a.instructor_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <p style={{ fontSize: '1.1rem', color: '#64748b', fontWeight: 600 }}>Cargando Panel de Coordinación SENA...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <header className="header-bar">
        <div className="brand-title">
          <ShieldCheck size={28} style={{ color: '#39a900' }} />
          <span>Panel de Coordinación SENA</span>
          <span className="brand-badge">Coordinador</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
            Hola, <strong>{currentUser?.full_name}</strong>
          </span>
          <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            <LogOut size={16} /> Salir
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="container">
        {/* Navigation Tabs & Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', background: '#e2e8f0', padding: '0.35rem', borderRadius: '12px' }}>
            <button
              onClick={() => setActiveTab('instructores')}
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                background: activeTab === 'instructores' ? '#ffffff' : 'transparent',
                color: activeTab === 'instructores' ? '#0f172a' : '#64748b',
                boxShadow: activeTab === 'instructores' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              <UserCheck size={18} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'text-bottom' }} />
              Instructores Registrados ({instructors.length})
            </button>
            <button
              onClick={() => setActiveTab('historial')}
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                background: activeTab === 'historial' ? '#ffffff' : 'transparent',
                color: activeTab === 'historial' ? '#0f172a' : '#64748b',
                boxShadow: activeTab === 'historial' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              <FileSpreadsheet size={18} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'text-bottom' }} />
              Auditoría de Asistencias ({attendances.length})
            </button>
          </div>

          {activeTab === 'instructores' ? (
            <button id="addInstructorBtn" onClick={openCreateModal} className="btn-primary">
              <UserPlus size={18} /> Registrar Instructor (Sin contraseña)
            </button>
          ) : (
            <button onClick={exportToExcel} className="btn-primary">
              <FileSpreadsheet size={18} /> Exportar Excel Auditoría (.xlsx)
            </button>
          )}
        </div>

        {/* Stats Summary Panel */}
        <div className="grid-3" style={{ marginBottom: '2rem' }}>
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.825rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Total Registros</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>{stats.total_registros || 0}</div>
          </div>
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.825rem', color: '#166534', textTransform: 'uppercase', fontWeight: 700 }}>Asistencias Presentes</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#166534', marginTop: '0.25rem' }}>{stats.presentes || 0}</div>
          </div>
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.825rem', color: '#854d0e', textTransform: 'uppercase', fontWeight: 700 }}>Llegadas Tardías / Justificadas</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#854d0e', marginTop: '0.25rem' }}>{(stats.tardes || 0) + (stats.justificados || 0)}</div>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '1.5rem', position: 'relative', maxWidth: '400px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Buscar por nombre, documento, ficha..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
          <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        </div>

        {/* TAB 1: Instructores Management */}
        {activeTab === 'instructores' && (
          <div className="glass-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nombre Completo</th>
                  <th>Documento ID</th>
                  <th>Usuario</th>
                  <th>Correo Institucional</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredInstructors.map((usr) => (
                  <tr key={usr.id}>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>{usr.full_name}</td>
                    <td>{usr.document}</td>
                    <td><code style={{ background: '#f1f5f9', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{usr.username || '-'}</code></td>
                    <td>{usr.email || '-'}</td>
                    <td>
                      <span style={{ textTransform: 'capitalize', fontWeight: 600, color: usr.role === 'coordinador' ? '#0284c7' : '#334155' }}>
                        {usr.role}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => toggleUserStatus(usr)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        title="Haz clic para cambiar estado"
                      >
                        {usr.is_active ? (
                          <span className="badge-status badge-presente"><CheckCircle size={14} /> Activo</span>
                        ) : (
                          <span className="badge-status badge-falta"><XCircle size={14} /> Inactivo</span>
                        )}
                      </button>
                    </td>
                    <td>
                      <button
                        onClick={() => openEditModal(usr)}
                        className="btn-secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        <Edit3 size={14} /> Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: Attendance Audit Log */}
        {activeTab === 'historial' && (
          <div className="glass-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Fecha & Hora</th>
                  <th>Estudiante</th>
                  <th>Documento</th>
                  <th>Instructor</th>
                  <th>Ficha</th>
                  <th>Jornada</th>
                  <th>Ambiente</th>
                  <th>Estado</th>
                  <th>Auditoría GPS & Dispositivo</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendances.map((att) => (
                  <tr key={att.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{formatDateBogota(att.fecha)}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{formatTimeBogota(att.hora)}</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{att.aprendiz_name}</td>
                    <td style={{ fontSize: '0.85rem' }}>{att.aprendiz_document}</td>
                    <td style={{ fontSize: '0.85rem' }}>{att.instructor_name}</td>
                    <td><code style={{ background: '#f1f5f9', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{att.ficha_code}</code></td>
                    <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>{att.jornada}</td>
                    <td style={{ fontSize: '0.85rem' }}>{att.ambiente_name}</td>
                    <td>
                      <span className={`badge-status ${
                        att.estado === 'Presente' ? 'badge-presente' :
                        att.estado.includes('Tarde') ? 'badge-tarde' :
                        att.estado === 'Justificado' ? 'badge-justificado' : 'badge-falta'
                      }`}>
                        {att.estado}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.775rem', color: '#475569' }}>
                      {att.latitud && att.latitud !== 'Ubicación no disponible' ? (
                        <div>
                          <a
                            href={`https://maps.google.com/?q=${att.latitud},${att.longitud}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#0284c7', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                          >
                            <MapPin size={12} /> Maps ({att.precision_gps || 'GPS'})
                          </a>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>{att.location_status || 'Sin GPS'}</span>
                      )}
                      <div>IP: {att.ip_publica || 'N/A'} | {att.dispositivo || ''}</div>
                      {att.excuse_path && (
                        <a href={att.excuse_path} target="_blank" rel="noopener noreferrer" style={{ color: '#39a900', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.1rem' }}>
                          <Paperclip size={12} /> Ver Excusa
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal: Create/Edit User Form (Sin Contraseña) */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: '1.5rem' }}>
              {editingUser ? 'Editar Datos del Usuario' : 'Registrar Nuevo Instructor (Sin Contraseña)'}
            </h2>

            {formError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {formError}
              </div>
            )}
            {formSuccess && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleSaveUser}>
              <div className="form-group">
                <label className="form-label">Nombre Completo del Instructor *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. María Fernanda López"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Número de Documento *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. 1098765432"
                    value={formData.document}
                    onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nombre de Usuario (Opcional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. mlopez"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Correo Institucional (Opcional)</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="Ej. mlopez@sena.edu.co"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Rol del Sistema</label>
                  <select
                    className="form-select"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  >
                    <option value="instructor">Instructor</option>
                    <option value="coordinador">Coordinador</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Estado de la Cuenta</label>
                  <select
                    className="form-select"
                    value={formData.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingUser ? 'Guardar Cambios' : 'Crear Instructor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
