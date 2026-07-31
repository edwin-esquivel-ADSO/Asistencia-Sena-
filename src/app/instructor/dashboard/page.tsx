'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';
import {
  UserCheck, QrCode, Clock, LogOut, History, UserPlus, AlertCircle,
  ShieldCheck, RefreshCw, MapPin, Paperclip, Bell, Mail, Eye, Check, X, Filter, User, FileSpreadsheet
} from 'lucide-react';

function formatTime12(value: string | null | undefined): string {
  if (!value) return '';
  const match = String(value).match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return String(value);
  const hour = Number(match[1]);
  const minute = match[2];
  const suffix = hour >= 12 ? 'p. m.' : 'a. m.';
  return `${hour % 12 || 12}:${minute} ${suffix}`;
}

export default function InstructorDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [options, setOptions] = useState<any>({ fichas: [], ambientes: [], jornadas: ['Diurna', 'Tarde', 'Nocturna', 'Mixta'] });
  const [activeSession, setActiveSession] = useState<any>(null);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros por tarjeta clicable
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  // Bandeja de Entrada y Notificaciones
  const [notifications, setNotifications] = useState<any[]>([]);
  const [pendingExcuses, setPendingExcuses] = useState<any[]>([]);
  const [emailAlert, setEmailAlert] = useState('');
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [showInboxModal, setShowInboxModal] = useState(false);

  // Detalle de Aprendiz
  const [selectedAprendizDetail, setSelectedAprendizDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form State para iniciar sesión
  const [selectedFicha, setSelectedFicha] = useState('');
  const [customFichaCode, setCustomFichaCode] = useState('');
  const [customProgramName, setCustomProgramName] = useState('');
  const [rosterFile, setRosterFile] = useState<File | null>(null);
  const [rosterMessage, setRosterMessage] = useState<string | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);

  const [selectedAmbiente, setSelectedAmbiente] = useState('');
  const [customAmbienteName, setCustomAmbienteName] = useState('');

  const [jornada, setJornada] = useState('Diurna');
  const [grupo, setGrupo] = useState('Grupo 1');
  const [sede, setSede] = useState('Sede Principal');
  const [hoursDuration, setHoursDuration] = useState(6);
  const [saveMasterData, setSaveMasterData] = useState(false);

  // Modales existentes
  const [showLateQrModal, setShowLateQrModal] = useState(false);
  const [lateQrDataUrl, setLateQrDataUrl] = useState<string | null>(null);
  const [lateLoading, setLateLoading] = useState(false);

  const [showManualLateModal, setShowManualLateModal] = useState(false);
  const [manualStudentName, setManualStudentName] = useState('');
  const [manualStudentDoc, setManualStudentDoc] = useState('');
  const [manualExcuseNote, setManualExcuseNote] = useState('');
  const [manualStatus, setManualStatus] = useState('Tarde');
  const [manualHours, setManualHours] = useState(0);
  const [manualArrivalTime, setManualArrivalTime] = useState('');
  const [manualExcuseFile, setManualExcuseFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  useEffect(() => {
    initDashboard();
  }, []);

  const initDashboard = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (!meData.authenticated || meData.user.role !== 'instructor') {
        router.push('/login');
        return;
      }
      setCurrentUser(meData.user);

      const optRes = await fetch('/api/instructor/options');
      if (optRes.ok) {
        const optData = await optRes.json();
        setOptions(optData);
      }

      await checkActiveSession();
      await loadInstructorNotifications();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkActiveSession = async () => {
    const res = await fetch('/api/instructor/sessions');
    if (res.ok) {
      const data = await res.json();
      if (data.activeSession) {
        setActiveSession(data.activeSession);
        generateQrImage(data.activeSession.token, data.activeSession.rotativeToken);
        loadSessionAttendances(data.activeSession.id);
      } else {
        setActiveSession(null);
      }
    }
  };

  const loadInstructorNotifications = async () => {
    try {
      const res = await fetch('/api/instructor/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setPendingExcuses(data.pendingExcuses || []);
        if (data.settings?.alert_email) {
          setEmailAlert(data.settings.alert_email);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!activeSession) return;
    updateTimer(activeSession.expires_at);
    const timer = setInterval(() => updateTimer(activeSession.expires_at), 1000);
    const refresh = setInterval(() => {
      loadSessionAttendances(activeSession.id);
      fetch('/api/instructor/sessions')
        .then(r => r.json())
        .then(d => {
          if (d.activeSession) {
            setActiveSession(d.activeSession);
            generateQrImage(d.activeSession.token, d.activeSession.rotativeToken);
          } else {
            setActiveSession(null);
          }
        })
        .catch(console.error);
    }, 5000);
    return () => {
      clearInterval(timer);
      clearInterval(refresh);
    };
  }, [activeSession?.id]);

  const updateTimer = (expiresAtStr: string) => {
    const diffMs = new Date(expiresAtStr).getTime() - new Date().getTime();
    if (diffMs <= 0) {
      setTimeLeft('Expirado (00m 00s)');
    } else {
      const totalSec = Math.floor(diffMs / 1000);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      setTimeLeft(`${m < 10 ? '0' : ''}${m}m ${s < 10 ? '0' : ''}${s}s`);
    }
  };

  const generateQrImage = async (token: string, rotativeToken?: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const rotParam = rotativeToken ? `&rot=${rotativeToken}` : '';
    const registerUrl = `${origin}/aprendiz/register?token=${token}${rotParam}`;
    try {
      const url = await QRCode.toDataURL(registerUrl, { width: 350, margin: 2 });
      setQrDataUrl(url);
    } catch (err) {
      console.error('Error generating QR code image:', err);
    }
  };

  const loadSessionAttendances = async (sessionId: number) => {
    const res = await fetch(`/api/instructor/sessions/${sessionId}/attendances`);
    if (res.ok) {
      const data = await res.json();
      setAttendances(data.attendances || []);
    }
  };

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const fichaCode = selectedFicha === 'custom' || !selectedFicha ? customFichaCode : selectedFicha;
    const ambienteName = selectedAmbiente === 'custom' || !selectedAmbiente ? customAmbienteName : selectedAmbiente;

    if (!fichaCode.trim() || !ambienteName.trim()) {
      setError('Por favor proporcione la Ficha y el Ambiente.');
      return;
    }

    try {
      const res = await fetch('/api/instructor/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ficha_code: fichaCode.trim(),
          program_name: customProgramName.trim() || 'Formación SENA',
          jornada,
          ambiente_name: ambienteName.trim(),
          grupo,
          sede,
          hours_duration: hoursDuration,
          save_master_data: saveMasterData
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión.');
      } else {
        await checkActiveSession();
      }
    } catch (err) {
      setError('Error de conexión al iniciar sesión.');
    }
  };

  const handleFinishSession = async () => {
    if (!activeSession) return;
    if (!confirm('¿Estás seguro de finalizar la sesión? Se registrarán automáticamente las faltas de los aprendices que no registraron presencia.')) return;

    try {
      await fetch(`/api/instructor/sessions/${activeSession.id}/finish`, { method: 'POST' });
      setActiveSession(null);
      setQrDataUrl('');
      loadInstructorNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleImportRoster = async () => {
    setRosterMessage(null);
    if (!rosterFile || !customFichaCode.trim()) {
      setRosterMessage('Escriba primero el código de la ficha y seleccione el archivo Excel.');
      return;
    }
    setRosterLoading(true);
    try {
      const workbook = XLSX.read(await rosterFile.arrayBuffer(), { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
      const students = records.map((row) => {
        const normalized = Object.fromEntries(
          Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), value])
        );
        return {
          full_name: normalized['nombre completo'] || normalized['nombre'] || normalized['aprendiz'] || normalized['nombres completos'],
          document: normalized['documento'] || normalized['número de documento'] || normalized['numero de documento'] || normalized['identificación'] || normalized['identificacion']
        };
      });
      const res = await fetch('/api/instructor/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import',
          ficha_code: customFichaCode.trim(),
          program_name: customProgramName.trim() || 'Formación SENA',
          students
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo importar el listado.');
      setRosterMessage(`Ficha guardada. Se importaron ${data.imported} aprendices${data.rejected?.length ? `; ${data.rejected.length} filas fueron omitidas.` : '.'}`);
      const optRes = await fetch('/api/instructor/options');
      if (optRes.ok) setOptions(await optRes.json());
    } catch (err: any) {
      setRosterMessage(err.message || 'El Excel no pudo procesarse. Use columnas Nombre Completo y Documento.');
    } finally {
      setRosterLoading(false);
    }
  };

  const handleGenerateLateQr = async (sessionId: number) => {
    setLateLoading(true);
    try {
      const res = await fetch(`/api/instructor/sessions/${sessionId}/late-qr`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No fue posible generar el QR tardío.');
      setLateQrDataUrl(data.qr_data_url);
      setShowLateQrModal(true);
    } catch (err: any) {
      alert(err.message || 'No fue posible generar el QR tardío.');
    } finally {
      setLateLoading(false);
    }
  };

  const handleManualLate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    setManualError(null);
    setUploadingFile(true);
    try {
      let excusePath: string | null = null;
      if (manualExcuseFile) {
        const formData = new FormData();
        formData.append('file', manualExcuseFile);
        const uploadRes = await fetch('/api/excusas/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || 'No fue posible cargar el soporte.');
        excusePath = uploadData.filePath;
      }
      const res = await fetch('/api/instructor/attendances/manual-late', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: activeSession.id,
          aprendiz_name: manualStudentName,
          aprendiz_document: manualStudentDoc,
          arrival_time: manualArrivalTime,
          horas: manualHours,
          excuse_note: manualExcuseNote,
          excuse_path: excusePath,
          estado: manualStatus
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No fue posible registrar la tardanza.');
      setShowManualLateModal(false);
      setManualStudentName(''); setManualStudentDoc(''); setManualExcuseNote('');
      setManualExcuseFile(null); setManualArrivalTime(''); setManualHours(0);
      await loadSessionAttendances(activeSession.id);
    } catch (err: any) {
      setManualError(err.message || 'No fue posible registrar la tardanza manual.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleReviewExcuse = async (excuseId: number, action: 'approved' | 'rejected') => {
    const comment = prompt(action === 'approved' ? 'Comentario opcional para aprobación:' : 'Motivo de rechazo (obligatorio):');
    if (action === 'rejected' && (!comment || !comment.trim())) {
      alert('El motivo de rechazo es obligatorio.');
      return;
    }

    try {
      const res = await fetch(`/api/instructor/excusas/${excuseId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, instructor_comment: comment })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        loadInstructorNotifications();
        if (activeSession) loadSessionAttendances(activeSession.id);
      } else {
        alert(data.error || 'Error al procesar la excusa.');
      }
    } catch (err) {
      alert('Error al conectar con el servidor.');
    }
  };

  const handleSaveEmailAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMsg(null);
    try {
      const res = await fetch('/api/instructor/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_email: emailAlert })
      });
      const data = await res.json();
      if (res.ok) {
        setEmailMsg(data.message);
      } else {
        setEmailMsg(data.error || 'Error al guardar correo.');
      }
    } catch (err) {
      setEmailMsg('Error de red al guardar correo.');
    }
  };

  const handleViewAprendizDetail = async (aprendizId: number) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/instructor/aprendiz-detail?aprendiz_id=${aprendizId}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedAprendizDetail(data);
      } else {
        alert(data.error || 'Error al obtener detalle del aprendiz.');
      }
    } catch (err) {
      alert('Error de conexión.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <p style={{ fontSize: '1.1rem', color: '#64748b', fontWeight: 600 }}>Cargando Portal Instructor SENA...</p>
      </div>
    );
  }

  // Filtrado de lista por tarjeta clicable
  const filteredAttendances = attendances.filter(att => {
    if (!filterStatus) return true;
    if (filterStatus === 'Presente') return att.estado === 'Presente';
    if (filterStatus === 'Tarde') return String(att.estado).includes('Tarde');
    if (filterStatus === 'Falta') return att.estado === 'Falta';
    if (filterStatus === 'Justificado') return att.estado === 'Justificado';
    if (filterStatus === 'Tareas') return att.tarea_registrada;
    return true;
  });

  const countPresentes = attendances.filter(a => a.estado === 'Presente').length;
  const countTardes = attendances.filter(a => String(a.estado).includes('Tarde')).length;
  const countFaltas = attendances.filter(a => a.estado === 'Falta').length;
  const countJustificados = attendances.filter(a => a.estado === 'Justificado').length;
  const countTareas = attendances.filter(a => a.tarea_registrada).length;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Top Navbar */}
      <header className="header-bar">
        <div className="brand-title">
          <QrCode size={28} style={{ color: '#39a900' }} />
          <span>Gestión de Asistencia SENA</span>
          <span className="brand-badge">Instructor</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => setShowInboxModal(true)}
            className="btn-secondary"
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', position: 'relative' }}
          >
            <Bell size={16} /> Bandeja ({pendingExcuses.length})
            {pendingExcuses.length > 0 && (
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#dc2626', color: '#fff', borderRadius: '50%', padding: '2px 6px', fontSize: '0.7rem' }}>
                {pendingExcuses.length}
              </span>
            )}
          </button>
          <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
            Instructor: <strong>{currentUser?.full_name}</strong>
          </span>
          <button onClick={() => router.push('/instructor/aprendices')} className="btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}>
            <User size={16} /> Listado por ficha
          </button>
          <button onClick={() => router.push('/instructor/history')} className="btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}>
            <History size={16} /> Historial & Informes
          </button>
          <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}>
            <LogOut size={16} /> Salir
          </button>
        </div>
      </header>

      <main className="container">
        {/* VIEW 1: ACTIVE SESSION RUNNING */}
        {activeSession ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
                  Sesión de Asistencia Activa
                </h1>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  Ficha: <strong>{activeSession.ficha_code}</strong> | Ambiente: <strong>{activeSession.ambiente_name}</strong> | Jornada: <strong>{activeSession.jornada}</strong>
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button onClick={() => handleGenerateLateQr(activeSession.id)} disabled={lateLoading} className="btn-secondary" style={{ background: '#fef9c3', borderColor: '#fef08a', color: '#854d0e' }}>
                  <QrCode size={18} /> Generar QR para Tardíos (5 min)
                </button>
                <button onClick={() => setShowManualLateModal(true)} className="btn-secondary">
                  <UserPlus size={18} /> Agregar Tardío Manual
                </button>
                <button onClick={handleFinishSession} className="btn-danger">
                  Finalizar Sesión
                </button>
              </div>
            </div>

            {/* Tarjetas Clicables con Código de Color */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div
                onClick={() => setFilterStatus(filterStatus === 'Presente' ? null : 'Presente')}
                style={{
                  background: filterStatus === 'Presente' ? '#dcfce7' : '#f0fdf4',
                  border: '2px solid #bbf7d0',
                  padding: '0.85rem',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <div style={{ color: '#166534', fontSize: '0.75rem', fontWeight: 700 }}>Presentes</div>
                <div style={{ color: '#15803d', fontSize: '1.4rem', fontWeight: 800 }}>{countPresentes}</div>
              </div>

              <div
                onClick={() => setFilterStatus(filterStatus === 'Tarde' ? null : 'Tarde')}
                style={{
                  background: filterStatus === 'Tarde' ? '#fef3c7' : '#fffbeb',
                  border: '2px solid #fef08a',
                  padding: '0.85rem',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <div style={{ color: '#92400e', fontSize: '0.75rem', fontWeight: 700 }}>Tardes</div>
                <div style={{ color: '#b45309', fontSize: '1.4rem', fontWeight: 800 }}>{countTardes}</div>
              </div>

              <div
                onClick={() => setFilterStatus(filterStatus === 'Falta' ? null : 'Falta')}
                style={{
                  background: filterStatus === 'Falta' ? '#fee2e2' : '#fef2f2',
                  border: '2px solid #fecaca',
                  padding: '0.85rem',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <div style={{ color: '#991b1b', fontSize: '0.75rem', fontWeight: 700 }}>Faltas</div>
                <div style={{ color: '#dc2626', fontSize: '1.4rem', fontWeight: 800 }}>{countFaltas}</div>
              </div>

              <div
                onClick={() => setFilterStatus(filterStatus === 'Justificado' ? null : 'Justificado')}
                style={{
                  background: filterStatus === 'Justificado' ? '#e0f2fe' : '#f0f9ff',
                  border: '2px solid #bae6fd',
                  padding: '0.85rem',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <div style={{ color: '#075985', fontSize: '0.75rem', fontWeight: 700 }}>Justificados</div>
                <div style={{ color: '#0284c7', fontSize: '1.4rem', fontWeight: 800 }}>{countJustificados}</div>
              </div>

              <div
                onClick={() => setFilterStatus(filterStatus === 'Tareas' ? null : 'Tareas')}
                style={{
                  background: filterStatus === 'Tareas' ? '#f3e8ff' : '#faf5ff',
                  border: '2px solid #e9d5ff',
                  padding: '0.85rem',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <div style={{ color: '#6b21a8', fontSize: '0.75rem', fontWeight: 700 }}>Tareas</div>
                <div style={{ color: '#7e22ce', fontSize: '1.4rem', fontWeight: 800 }}>{countTareas}</div>
              </div>
            </div>

            <div className="grid-2" style={{ alignItems: 'start' }}>
              <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', padding: '0.5rem 1rem', borderRadius: '999px', fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem' }}>
                  <Clock size={18} /> Tiempo Restante: {timeLeft}
                </div>

                {qrDataUrl ? (
                  <div style={{ margin: '1rem 0' }}>
                    <img src={qrDataUrl} alt="Código QR Dinámico SENA" style={{ maxWidth: '290px', width: '100%', borderRadius: '16px', border: '4px solid #f1f5f9', background: '#fff', padding: '0.5rem' }} />
                  </div>
                ) : (
                  <p>Generando Código QR...</p>
                )}
              </div>

              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                    Aprendices ({filteredAttendances.length})
                    {filterStatus && <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>(Filtro: {filterStatus})</span>}
                  </h3>
                  <button onClick={() => loadSessionAttendances(activeSession.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#39a900' }}>
                    <RefreshCw size={18} />
                  </button>
                </div>

                {filteredAttendances.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                    <UserCheck size={48} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
                    <p style={{ fontSize: '0.95rem' }}>Sin registros para esta vista.</p>
                  </div>
                ) : (
                  <div style={{ maxHeight: '440px', overflowY: 'auto' }}>
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Hora</th>
                          <th>Aprendiz</th>
                          <th>Estado</th>
                          <th>Auditoría / Detalle</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAttendances.map((att) => (
                          <tr key={att.id}>
                            <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>{formatTime12(att.hora)}</td>
                            <td style={{ fontWeight: 600, color: '#0f172a' }}>{att.aprendiz_name}</td>
                            <td>
                              <span className={`badge-status ${
                                att.estado === 'Presente' ? 'badge-presente' :
                                att.estado.includes('Tarde') ? 'badge-tarde' :
                                att.estado === 'Falta' ? 'badge-falta' : 'badge-justificado'
                              }`}>
                                {att.estado}
                              </span>
                            </td>
                            <td>
                              {att.aprendiz_id ? (
                                <button
                                  onClick={() => handleViewAprendizDetail(att.aprendiz_id)}
                                  className="btn-secondary"
                                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                                >
                                  <Eye size={12} /> Ver Detalle
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Sin perfil</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* CREATE SESSION VIEW */
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
                Crear Nueva Sesión de Asistencia
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
                El código QR generado tendrá una vigencia fija de <strong>exactamente 5 minutos</strong>.
              </p>
            </div>

            <div className="glass-card" style={{ padding: '2rem' }}>
              <form onSubmit={handleStartSession}>
                <div className="form-group">
                  <label className="form-label">Ficha de Formación *</label>
                  <select className="form-select" value={selectedFicha} onChange={(e) => setSelectedFicha(e.target.value)}>
                    <option value="">-- Seleccionar Ficha --</option>
                    {options.fichas.map((f: any) => (
                      <option key={f.id} value={f.code}>{f.code} - {f.program_name}</option>
                    ))}
                    <option value="custom">+ Escribir Ficha Manualmente</option>
                  </select>
                </div>

                {selectedFicha === 'custom' && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
                    <strong style={{ color: '#166534', display: 'block', marginBottom: '0.75rem' }}>Nueva ficha y listado de aprendices</strong>
                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label">Código de ficha *</label>
                        <input className="form-input" value={customFichaCode} onChange={(e) => setCustomFichaCode(e.target.value)} placeholder="Ej. 2901122" required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Programa de formación *</label>
                        <input className="form-input" value={customProgramName} onChange={(e) => setCustomProgramName(e.target.value)} placeholder="Nombre del programa" required />
                      </div>
                    </div>
                    <label className="form-label">Listado de aprendices (.xlsx)</label>
                    <input type="file" accept=".xlsx,.xls" className="form-input" onChange={(e) => setRosterFile(e.target.files?.[0] || null)} style={{ padding: '0.4rem' }} />
                    <p style={{ fontSize: '0.78rem', color: '#475569', margin: '0.45rem 0' }}>El Excel debe incluir las columnas “Nombre Completo” y “Documento”. La ficha quedará guardada para seleccionarla en sesiones posteriores.</p>
                    <button type="button" onClick={handleImportRoster} disabled={rosterLoading} className="btn-secondary" style={{ fontSize: '0.85rem' }}>
                      <FileSpreadsheet size={16} /> {rosterLoading ? 'Importando listado...' : 'Guardar ficha e importar listado'}
                    </button>
                    {rosterMessage && <p style={{ marginTop: '0.6rem', color: rosterMessage.includes('No se') || rosterMessage.includes('Use columnas') ? '#b91c1c' : '#166534', fontSize: '0.82rem' }}>{rosterMessage}</p>}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Ambiente de Formación *</label>
                  <select className="form-select" value={selectedAmbiente} onChange={(e) => setSelectedAmbiente(e.target.value)}>
                    <option value="">-- Seleccionar Ambiente --</option>
                    {options.ambientes.map((a: any) => (
                      <option key={a.id} value={a.name}>{a.name}</option>
                    ))}
                    <option value="custom">+ Escribir Ambiente Manualmente</option>
                  </select>
                </div>

                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">Jornada *</label>
                    <select className="form-select" value={jornada} onChange={(e) => setJornada(e.target.value)}>
                      <option value="Diurna">Diurna</option>
                      <option value="Tarde">Tarde</option>
                      <option value="Nocturna">Nocturna</option>
                      <option value="Mixta">Mixta</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Grupo</label>
                    <input type="text" className="form-input" value={grupo} onChange={(e) => setGrupo(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sede</label>
                    <input type="text" className="form-input" value={sede} onChange={(e) => setSede(e.target.value)} />
                  </div>
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', marginTop: '1rem' }}>
                  <QrCode size={20} /> Iniciar Sesión QR (5 Minutos)
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* MODAL BANDEJA DE ENTRADA Y EXCUSAS */}
      {showInboxModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                Bandeja de Entrada & Excusas Pendientes
              </h2>
              <button onClick={() => setShowInboxModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Configuración de correo de alertas */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail size={16} /> Configuración de Alertas por Correo
              </h3>
              {emailMsg && <p style={{ fontSize: '0.8rem', color: '#166534', marginBottom: '0.5rem' }}>{emailMsg}</p>}
              <form onSubmit={handleSaveEmailAlert} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="email"
                  className="form-input"
                  placeholder="su_correo@sena.edu.co"
                  value={emailAlert}
                  onChange={(e) => setEmailAlert(e.target.value)}
                  style={{ flex: 1, padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
                />
                <button type="submit" className="btn-primary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}>
                  Guardar
                </button>
              </form>
            </div>

            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>
              Solicitudes de Excusa por Revisar ({pendingExcuses.length})
            </h3>

            {pendingExcuses.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No hay excusas pendientes.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
                {pendingExcuses.map((exc: any) => (
                  <div key={exc.id} style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '0.85rem', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.9rem' }}>
                      <span>{exc.aprendiz_name} (Ficha {exc.ficha_code})</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{exc.start_date} a {exc.end_date}</span>
                    </div>
                    <p style={{ fontSize: '0.825rem', color: '#475569', margin: '0.3rem 0' }}>Motivo: {exc.reason}</p>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                      <a href={exc.file_path} target="_blank" rel="noopener noreferrer" style={{ color: '#0284c7', fontSize: '0.8rem', fontWeight: 600 }}>
                        Ver Soporte
                      </a>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
                        <button onClick={() => handleReviewExcuse(exc.id, 'approved')} className="btn-primary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.775rem' }}>
                          Aprobar
                        </button>
                        <button onClick={() => handleReviewExcuse(exc.id, 'rejected')} className="btn-danger" style={{ padding: '0.2rem 0.6rem', fontSize: '0.775rem' }}>
                          Rechazar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE APRENDIZ CON AUDITORÍA Y FOTO FIRMADA */}
      {selectedAprendizDetail && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                Detalle y Auditoría del Aprendiz
              </h2>
              <button onClick={() => setSelectedAprendizDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', marginBottom: '1rem' }}>
              <p style={{ fontWeight: 700, color: '#0f172a' }}>{selectedAprendizDetail.aprendiz?.full_name}</p>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Documento: {selectedAprendizDetail.aprendiz?.document} | Ficha: {selectedAprendizDetail.aprendiz?.ficha_code}
              </p>
              <p style={{ fontSize: '0.8rem', color: '#166534', marginTop: '0.25rem' }}>
                Estado Facial: {selectedAprendizDetail.aprendiz?.face_registered ? 'Registrado y Verificado' : 'Sin registro facial'}
              </p>

              {selectedAprendizDetail.aprendiz?.signed_face_url && (
                <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                  <img
                    src={selectedAprendizDetail.aprendiz.signed_face_url}
                    alt="Rostro Referencia"
                    style={{ maxWidth: '140px', borderRadius: '12px', border: '2px solid #39a900' }}
                  />
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                    Imagen Servida con URL Firmada Temporal (5 min)
                  </div>
                </div>
              )}
            </div>

            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
              Historial de Asistencias
            </h3>
            <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '1rem' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th>GPS</th>
                    <th>IP & Navegador</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedAprendizDetail.attendances?.map((att: any) => (
                    <tr key={att.id}>
                      <td style={{ fontSize: '0.775rem' }}>{new Date(att.fecha).toLocaleDateString()} {att.hora}</td>
                      <td>
                        <span className={`badge-status ${
                          att.estado === 'Presente' ? 'badge-presente' :
                          att.estado.includes('Tarde') ? 'badge-tarde' : 'badge-falta'
                        }`}>
                          {att.estado}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.7rem' }}>{att.latitud !== 'Ubicación no disponible' ? 'Válido' : 'No disp.'}</td>
                      <td style={{ fontSize: '0.7rem' }}>{att.ip_publica} - {att.navegador}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={() => setSelectedAprendizDetail(null)} className="btn-secondary" style={{ width: '100%' }}>
              Cerrar Detalle
            </button>
          </div>
        </div>
      )}

      {/* Modales existentes Late QR y Manual Late */}
      {showLateQrModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
              Código QR Exclusivo para Tardíos (5 Minutos)
            </h2>
            {lateQrDataUrl ? (
              <img src={lateQrDataUrl} alt="Código QR para tardíos" style={{ width: '100%', maxWidth: '320px', margin: '1rem auto', border: '3px solid #fef08a', borderRadius: '12px', padding: '0.5rem' }} />
            ) : <p style={{ color: '#64748b' }}>Generando QR para tardíos...</p>}
            <button onClick={() => setShowLateQrModal(false)} className="btn-secondary" style={{ width: '100%', marginTop: '1rem' }}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {showManualLateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '560px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>Registrar tardío manual</h2>
            <form onSubmit={handleManualLate}>
              {manualError && <p style={{ color: '#b91c1c', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{manualError}</p>}
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Nombre completo *</label><input required className="form-input" value={manualStudentName} onChange={(e) => setManualStudentName(e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Documento *</label><input required className="form-input" value={manualStudentDoc} onChange={(e) => setManualStudentDoc(e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Hora de llegada</label><input type="time" className="form-input" value={manualArrivalTime} onChange={(e) => setManualArrivalTime(e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Horas certificadas</label><input type="number" min="0" max="12" className="form-input" value={manualHours} onChange={(e) => setManualHours(Number(e.target.value))} /></div>
              </div>
              <div className="form-group"><label className="form-label">Estado</label><select className="form-select" value={manualStatus} onChange={(e) => setManualStatus(e.target.value)}><option value="Tarde">Tarde</option><option value="Justificado">Justificado</option></select></div>
              <div className="form-group"><label className="form-label">Excusa escrita</label><textarea className="form-textarea" rows={3} value={manualExcuseNote} onChange={(e) => setManualExcuseNote(e.target.value)} placeholder="Motivo u observación" /></div>
              <div className="form-group"><label className="form-label">Soporte de excusa (PNG o PDF)</label><input type="file" accept="image/png,application/pdf" className="form-input" style={{ padding: '0.4rem' }} onChange={(e) => setManualExcuseFile(e.target.files?.[0] || null)} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}><button type="button" className="btn-secondary" onClick={() => setShowManualLateModal(false)}>Cancelar</button><button type="submit" className="btn-primary" disabled={uploadingFile}>{uploadingFile ? 'Guardando...' : 'Guardar tardío'}</button></div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
