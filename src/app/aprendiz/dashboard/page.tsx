'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserCheck, FileText, Bell, CheckCircle2, Clock, XCircle, AlertCircle, LogOut, Upload, ShieldCheck, Sparkles } from 'lucide-react';
import { formatDateBogota, formatTimeBogota } from '@/lib/date-utils';

export default function AprendizDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'historial' | 'excusas' | 'notificaciones'>('historial');

  // Formulario excusa
  const [excuseReason, setExcuseReason] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [excuseFile, setExcuseFile] = useState<File | null>(null);
  const [uploadingExcuse, setUploadingExcuse] = useState(false);
  const [excuseMsg, setExcuseMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/aprendiz/profile');
      const data = await res.json();
      if (!res.ok) {
        router.push('/aprendiz/acceso');
      } else {
        setProfileData(data);
      }
    } catch (err) {
      router.push('/aprendiz/acceso');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    document.cookie = 'sena_aprendiz_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/login');
  };

  const handleExcuseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setExcuseMsg(null);

    if (!startDate || !endDate || !excuseReason.trim() || !excuseFile) {
      setExcuseMsg({ type: 'error', text: 'Por favor complete todos los campos obligatorios y adjunte el archivo de soporte.' });
      return;
    }

    setUploadingExcuse(true);

    try {
      const formData = new FormData();
      formData.append('start_date', startDate);
      formData.append('end_date', endDate);
      formData.append('reason', excuseReason.trim());
      formData.append('file', excuseFile);

      const res = await fetch('/api/aprendiz/excusas/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        setExcuseMsg({ type: 'error', text: data.error || 'Error al radicar la excusa.' });
      } else {
        setExcuseMsg({ type: 'success', text: data.message || 'Excusa radicada exitosamente.' });
        setExcuseReason('');
        setStartDate('');
        setEndDate('');
        setExcuseFile(null);
        loadProfile();
      }
    } catch (err: any) {
      setExcuseMsg({ type: 'error', text: 'Error de red al subir la excusa.' });
    } finally {
      setUploadingExcuse(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <p style={{ color: '#64748b' }}>Cargando panel del aprendiz...</p>
      </div>
    );
  }

  const { aprendiz, attendances = [], excuses = [], notifications = [] } = profileData || {};

  const presentesCount = attendances.filter((a: any) => a.estado === 'Presente').length;
  const tardesCount = attendances.filter((a: any) => String(a.estado).includes('Tarde')).length;
  const faltasCount = attendances.filter((a: any) => a.estado === 'Falta').length;
  const justificadosCount = attendances.filter((a: any) => a.estado === 'Justificado').length;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Top Header Bar */}
      <header className="header-bar">
        <div className="brand-title">
          <UserCheck size={28} style={{ color: '#39a900' }} />
          <span>Portal Aprendiz SENA</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
            {aprendiz?.full_name} <code style={{ background: '#e2e8f0', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.775rem' }}>{aprendiz?.ficha_code}</code>
          </span>
          <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
            <LogOut size={16} /> Salir
          </button>
        </div>
      </header>

      <main className="container" style={{ maxWidth: '1100px', padding: '2rem 1rem' }}>

        {/* Status Card Banner */}
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem', background: '#ffffff', borderRadius: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
                ¡Bienvenido(a), {aprendiz?.full_name}!
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                Programa: <strong>{aprendiz?.program_name}</strong> (Ficha {aprendiz?.ficha_code})
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span className={`badge-status ${aprendiz?.face_registered ? 'badge-presente' : 'badge-tarde'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <ShieldCheck size={14} /> {aprendiz?.face_registered ? 'Verificación Facial Activa' : 'Revisión Manual Pendiente'}
              </span>
            </div>
          </div>

          {/* Stat Counter Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ color: '#166534', fontSize: '0.8rem', fontWeight: 600 }}>Presentes</div>
              <div style={{ color: '#15803d', fontSize: '1.5rem', fontWeight: 800 }}>{presentesCount}</div>
            </div>
            <div style={{ background: '#fffbeb', border: '1px solid #fef08a', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ color: '#92400e', fontSize: '0.8rem', fontWeight: 600 }}>Tardes</div>
              <div style={{ color: '#b45309', fontSize: '1.5rem', fontWeight: 800 }}>{tardesCount}</div>
            </div>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ color: '#991b1b', fontSize: '0.8rem', fontWeight: 600 }}>Faltas</div>
              <div style={{ color: '#dc2626', fontSize: '1.5rem', fontWeight: 800 }}>{faltasCount}</div>
            </div>
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ color: '#075985', fontSize: '0.8rem', fontWeight: 600 }}>Justificados</div>
              <div style={{ color: '#0284c7', fontSize: '1.5rem', fontWeight: 800 }}>{justificadosCount}</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0' }}>
          <button
            onClick={() => setActiveTab('historial')}
            style={{
              padding: '0.75rem 1.25rem',
              fontWeight: 700,
              fontSize: '0.95rem',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'historial' ? '3px solid #39a900' : 'none',
              color: activeTab === 'historial' ? '#39a900' : '#64748b',
              cursor: 'pointer'
            }}
          >
            Mi Historial de Asistencias
          </button>
          <button
            onClick={() => setActiveTab('excusas')}
            style={{
              padding: '0.75rem 1.25rem',
              fontWeight: 700,
              fontSize: '0.95rem',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'excusas' ? '3px solid #39a900' : 'none',
              color: activeTab === 'excusas' ? '#39a900' : '#64748b',
              cursor: 'pointer'
            }}
          >
            Mis Excusas y Justificaciones ({excuses.length})
          </button>
          <button
            onClick={() => setActiveTab('notificaciones')}
            style={{
              padding: '0.75rem 1.25rem',
              fontWeight: 700,
              fontSize: '0.95rem',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'notificaciones' ? '3px solid #39a900' : 'none',
              color: activeTab === 'notificaciones' ? '#39a900' : '#64748b',
              cursor: 'pointer'
            }}
          >
            Bandeja de Notificaciones ({notifications.length})
          </button>
        </div>

        {/* TAB 1: Historial */}
        {activeTab === 'historial' && (
          <div className="glass-card" style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>
              Registros Personales de Formación
            </h2>
            {attendances.length === 0 ? (
              <p style={{ color: '#94a3b8', padding: '2rem 0', textAlign: 'center' }}>No registra asistencias aún.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Fecha & Hora</th>
                      <th>Instructor</th>
                      <th>Ambiente</th>
                      <th>Jornada</th>
                      <th>Estado</th>
                      <th>Horas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendances.map((att: any) => (
                      <tr key={att.id}>
                        <td>{att.fecha ? formatDateBogota(att.fecha) : ''} {formatTimeBogota(att.hora)}</td>
                        <td style={{ fontWeight: 600 }}>{att.instructor_name}</td>
                        <td>{att.ambiente_name}</td>
                        <td>{att.jornada}</td>
                        <td>
                          <span className={`badge-status ${
                            att.estado === 'Presente' ? 'badge-presente' :
                            att.estado.includes('Tarde') ? 'badge-tarde' :
                            att.estado === 'Falta' ? 'badge-falta' : 'badge-justificado'
                          }`}>
                            {att.estado}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{att.horas}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Excusas */}
        {activeTab === 'excusas' && (
          <div>
            {/* Formulario Radicar Excusa */}
            <div className="glass-card" style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '16px', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Upload size={18} style={{ color: '#39a900' }} /> Radicar Nueva Excusa
              </h2>

              {excuseMsg && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  fontSize: '0.875rem',
                  background: excuseMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
                  border: excuseMsg.type === 'success' ? '1px solid #bbf7d0' : '1px solid #fecaca',
                  color: excuseMsg.type === 'success' ? '#166534' : '#991b1b'
                }}>
                  {excuseMsg.text}
                </div>
              )}

              <form onSubmit={handleExcuseSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label">Fecha Inicio *</label>
                    <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                  </div>
                  <div>
                    <label className="form-label">Fecha Fin *</label>
                    <input type="date" className="form-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Motivo o Justificación *</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Describa brevemente el motivo de la inasistencia..."
                    value={excuseReason}
                    onChange={(e) => setExcuseReason(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label">Adjuntar Soporte (PDF / JPG / PNG max 10MB) *</label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setExcuseFile(e.target.files ? e.target.files[0] : null)}
                    required
                  />
                </div>

                <button type="submit" disabled={uploadingExcuse} className="btn-primary">
                  {uploadingExcuse ? 'Radicando...' : 'Radicar Excusa'}
                </button>
              </form>
            </div>

            {/* Listado de Excusas */}
            <div className="glass-card" style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '16px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>
                Historial de Excusas Radicadas
              </h2>
              {excuses.length === 0 ? (
                <p style={{ color: '#94a3b8' }}>No ha radicado excusas aún.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Fecha Radicado</th>
                        <th>Periodo</th>
                        <th>Motivo</th>
                        <th>Estado</th>
                        <th>Respuesta Instructor</th>
                        <th>Soporte</th>
                      </tr>
                    </thead>
                    <tbody>
                      {excuses.map((exc: any) => (
                        <tr key={exc.id}>
                          <td>{new Date(exc.created_at).toLocaleDateString()}</td>
                          <td>{exc.start_date} a {exc.end_date}</td>
                          <td>{exc.reason}</td>
                          <td>
                            <span className={`badge-status ${
                              exc.status === 'approved' ? 'badge-presente' :
                              exc.status === 'rejected' ? 'badge-falta' : 'badge-tarde'
                            }`}>
                              {exc.status === 'pending' ? 'Pendiente' : exc.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                            </span>
                          </td>
                          <td>{exc.instructor_comment || '-'}</td>
                          <td>
                            <a href={exc.file_path} target="_blank" rel="noopener noreferrer" style={{ color: '#39a900', fontWeight: 600, fontSize: '0.85rem' }}>
                              Ver Documento
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Notificaciones */}
        {activeTab === 'notificaciones' && (
          <div className="glass-card" style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>
              Notificaciones Internas
            </h2>
            {notifications.length === 0 ? (
              <p style={{ color: '#94a3b8' }}>No tiene notificaciones.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {notifications.map((notif: any) => (
                  <div key={notif.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '12px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{notif.title}</div>
                    <div style={{ color: '#475569', fontSize: '0.875rem', marginTop: '0.2rem' }}>{notif.body}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                      {new Date(notif.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
