'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import {
  UserCheck, QrCode, Clock, LogOut, History, UserPlus, AlertCircle,
  ShieldCheck, RefreshCw, MapPin, Paperclip, AlertTriangle, Globe, Monitor
} from 'lucide-react';

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

  // Form State for starting session
  const [selectedFicha, setSelectedFicha] = useState('');
  const [customFichaCode, setCustomFichaCode] = useState('');
  const [customProgramName, setCustomProgramName] = useState('');

  const [selectedAmbiente, setSelectedAmbiente] = useState('');
  const [customAmbienteName, setCustomAmbienteName] = useState('');

  const [jornada, setJornada] = useState('Diurna');
  const [grupo, setGrupo] = useState('Grupo 1');
  const [sede, setSede] = useState('Sede Principal');
  const [hoursDuration, setHoursDuration] = useState(6);
  const [saveMasterData, setSaveMasterData] = useState(false);

  // Late QR Modal State
  const [showLateQrModal, setShowLateQrModal] = useState(false);
  const [lateQrDataUrl, setLateQrDataUrl] = useState<string | null>(null);
  const [lateLoading, setLateLoading] = useState(false);

  // Manual Late Modal State (Sin Hora de Llegada manual)
  const [showManualLateModal, setShowManualLateModal] = useState(false);
  const [manualStudentName, setManualStudentName] = useState('');
  const [manualStudentDoc, setManualStudentDoc] = useState('');
  const [manualExcuseNote, setManualExcuseNote] = useState('');
  const [manualStatus, setManualStatus] = useState('Tarde');
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

      // Load master dropdown options
      const optRes = await fetch('/api/instructor/options');
      if (optRes.ok) {
        const optData = await optRes.json();
        setOptions(optData);
      }

      await checkActiveSession();
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

  // Poll attendances and refresh rotative QR every 3 seconds
  useEffect(() => {
    if (!activeSession) return;

    const interval = setInterval(() => {
      loadSessionAttendances(activeSession.id);
      updateTimer(activeSession.expires_at);
      // Re-query active session token rotation
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
    }, 3000);

    return () => clearInterval(interval);
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
    if (!confirm('¿Estás seguro de finalizar la sesión de asistencia actual?')) return;

    try {
      await fetch(`/api/instructor/sessions/${activeSession.id}/finish`, { method: 'POST' });
      setActiveSession(null);
      setQrDataUrl('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateLateQr = async () => {
    if (!activeSession) return;
    setLateLoading(true);
    try {
      const res = await fetch(`/api/instructor/sessions/${activeSession.id}/late-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success && data.qr_data_url) {
        setLateQrDataUrl(data.qr_data_url);
      }
    } catch (err) {
      console.error('Error generating late QR:', err);
    } finally {
      setLateLoading(false);
    }
  };

  const handleRegisterManualLate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    setManualError(null);

    let excuseFilePath = null;

    if (manualExcuseFile) {
      setUploadingFile(true);
      try {
        const formData = new FormData();
        formData.append('file', manualExcuseFile);

        const uploadRes = await fetch('/api/excusas/upload', {
          method: 'POST',
          body: formData
        });
        const uploadData = await uploadRes.json();

        if (!uploadRes.ok) {
          setManualError(uploadData.error || 'Error al subir el archivo de excusa.');
          setUploadingFile(false);
          return;
        }
        excuseFilePath = uploadData.filePath;
      } catch (err) {
        setManualError('Error de red al subir la excusa.');
        setUploadingFile(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/instructor/attendances/manual-late', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: activeSession.id,
          aprendiz_name: manualStudentName.trim(),
          aprendiz_document: manualStudentDoc.trim(),
          excuse_note: manualExcuseNote.trim(),
          excuse_path: excuseFilePath,
          estado: manualStatus
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setManualError(data.error || 'Error al registrar tardanza manual.');
      } else {
        setShowManualLateModal(false);
        setManualStudentName('');
        setManualStudentDoc('');
        setManualExcuseNote('');
        setManualExcuseFile(null);
        loadSessionAttendances(activeSession.id);
      }
    } catch (err) {
      setManualError('Error de conexión al registrar tardanza.');
    } finally {
      setUploadingFile(false);
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

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Top Navbar */}
      <header className="header-bar">
        <div className="brand-title">
          <QrCode size={28} style={{ color: '#39a900' }} />
          <span>Gestión de Asistencia SENA</span>
          <span className="brand-badge">Instructor</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
            Instructor: <strong>{currentUser?.full_name}</strong>
          </span>
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
                <button onClick={() => { setShowLateQrModal(true); handleGenerateLateQr(); }} className="btn-secondary" style={{ background: '#fef9c3', borderColor: '#fef08a', color: '#854d0e' }}>
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

            {/* Security Warning Banner */}
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.85rem 1.25rem', borderRadius: '14px', marginBottom: '1.5rem', color: '#166534', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <ShieldCheck size={22} style={{ flexShrink: 0, color: '#39a900' }} />
              <div>
                <strong>Seguridad Antifraude Activa:</strong> El código QR rotativo tiene una vigencia exacta de 5 minutos, requiere estar físicamente presente en el ambiente y exige ubicación GPS obligatoria del aprendiz.
              </div>
            </div>

            <div className="grid-2" style={{ alignItems: 'start' }}>
              {/* QR Display Card (Sin botones de copiar enlace ni descargar para evitar reenvíos) */}
              <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', padding: '0.5rem 1rem', borderRadius: '999px', fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem' }}>
                  <Clock size={18} /> Tiempo Restante: {timeLeft}
                </div>

                {qrDataUrl ? (
                  <div style={{ margin: '1rem 0' }}>
                    <img
                      src={qrDataUrl}
                      alt="Código QR Dinámico de Asistencia SENA"
                      style={{ maxWidth: '290px', width: '100%', borderRadius: '16px', border: '4px solid #f1f5f9', background: '#fff', padding: '0.5rem' }}
                    />
                  </div>
                ) : (
                  <p>Generando Código QR Dinámico...</p>
                )}

                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.75rem', lineHeight: '1.5' }}>
                  Presente este código QR en pantalla. Los aprendices deben escanearlo físicamente en el ambiente usando la cámara de su teléfono inteligente.
                </p>
              </div>

              {/* Real-time Registered Students Card */}
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                    Estudiantes Registrados ({attendances.length})
                  </h3>
                  <button onClick={() => loadSessionAttendances(activeSession.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#39a900' }}>
                    <RefreshCw size={18} />
                  </button>
                </div>

                {attendances.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                    <UserCheck size={48} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
                    <p style={{ fontSize: '0.95rem' }}>Esperando registros de estudiantes en tiempo real...</p>
                  </div>
                ) : (
                  <div style={{ maxHeight: '440px', overflowY: 'auto' }}>
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Hora</th>
                          <th>Aprendiz</th>
                          <th>Documento</th>
                          <th>Estado</th>
                          <th>GPS / Auditoría</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendances.map((att) => (
                          <tr key={att.id}>
                            <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>{att.hora}</td>
                            <td style={{ fontWeight: 600, color: '#0f172a' }}>{att.aprendiz_name}</td>
                            <td style={{ fontSize: '0.85rem' }}>{att.aprendiz_document}</td>
                            <td>
                              <span className={`badge-status ${
                                att.estado === 'Presente' ? 'badge-presente' :
                                att.estado.includes('Tarde') ? 'badge-tarde' : 'badge-justificado'
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
                                    style={{ color: '#0284c7', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 700 }}
                                  >
                                    <MapPin size={12} /> Ver en Maps
                                  </a>
                                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                    Precisión: {att.precision_gps || 'GPS'}
                                  </div>
                                </div>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>{att.location_status || 'Sin GPS'}</span>
                              )}

                              {att.excuse_path && (
                                <div style={{ marginTop: '0.25rem' }}>
                                  <a
                                    href={att.excuse_path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#39a900', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 700 }}
                                  >
                                    <Paperclip size={12} /> Excusa Adjunta
                                  </a>
                                </div>
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
          /* VIEW 2: CREATE NEW SESSION FORM */
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
                Crear Nueva Sesión de Asistencia
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
                El código QR generado tendrá una vigencia institucional fija de <strong>exactamente 5 minutos</strong>.
              </p>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.85rem 1rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="glass-card" style={{ padding: '2rem' }}>
              <form onSubmit={handleStartSession}>

                {/* FICHA SELECTION / CUSTOM MANUAL ENTRY */}
                <div className="form-group">
                  <label className="form-label">Ficha de Formación *</label>
                  <select
                    className="form-select"
                    value={selectedFicha}
                    onChange={(e) => setSelectedFicha(e.target.value)}
                  >
                    <option value="">-- Seleccionar Ficha Existente u Opción Manual --</option>
                    {options.fichas.map((f: any) => (
                      <option key={f.id} value={f.code}>{f.code} - {f.program_name}</option>
                    ))}
                    <option value="custom">+ Escribir Ficha Manualmente</option>
                  </select>
                </div>

                {(selectedFicha === 'custom' || (!selectedFicha && options.fichas.length === 0)) && (
                  <div className="grid-2" style={{ marginBottom: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                    <div className="form-group">
                      <label className="form-label">Código de Ficha Manual *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ej. 2894510"
                        value={customFichaCode}
                        onChange={(e) => setCustomFichaCode(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Nombre del Programa Manual</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ej. ADSO / Redes"
                        value={customProgramName}
                        onChange={(e) => setCustomProgramName(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* AMBIENTE SELECTION / CUSTOM MANUAL ENTRY */}
                <div className="form-group">
                  <label className="form-label">Ambiente de Formación *</label>
                  <select
                    className="form-select"
                    value={selectedAmbiente}
                    onChange={(e) => setSelectedAmbiente(e.target.value)}
                  >
                    <option value="">-- Seleccionar Ambiente Existente u Opción Manual --</option>
                    {options.ambientes.map((a: any) => (
                      <option key={a.id} value={a.name}>{a.name}</option>
                    ))}
                    <option value="custom">+ Escribir Ambiente Manualmente</option>
                  </select>
                </div>

                {(selectedAmbiente === 'custom' || (!selectedAmbiente && options.ambientes.length === 0)) && (
                  <div className="form-group" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                    <label className="form-label">Nombre del Ambiente Manual *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej. Ambiente 305 - Torre de Software"
                      value={customAmbienteName}
                      onChange={(e) => setCustomAmbienteName(e.target.value)}
                      required
                    />
                  </div>
                )}

                {/* JORNADA, GRUPO & SEDE (Sin Madrugada, incluyendo Tarde) */}
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
                    <input type="text" className="form-input" value={grupo} onChange={(e) => setGrupo(e.target.value)} placeholder="Ej. Grupo 1" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sede</label>
                    <input type="text" className="form-input" value={sede} onChange={(e) => setSede(e.target.value)} placeholder="Ej. Sede Central" />
                  </div>
                </div>

                {/* DURATION & HOURS */}
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Vigencia del QR</label>
                    <input
                      type="text"
                      className="form-input"
                      value="5 Minutos (Fijo Servidor)"
                      disabled
                      style={{ background: '#e2e8f0', cursor: 'not-allowed', fontWeight: 700 }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Horas de Clase de la Sesión *</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      className="form-input"
                      value={hoursDuration}
                      onChange={(e) => setHoursDuration(parseInt(e.target.value) || 6)}
                      required
                    />
                  </div>
                </div>

                {/* SAVE AS MASTER CHECKBOX */}
                <div style={{ margin: '1rem 0', padding: '0.75rem', background: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="saveMasterData"
                    checked={saveMasterData}
                    onChange={(e) => setSaveMasterData(e.target.checked)}
                    style={{ accentColor: '#39a900', width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="saveMasterData" style={{ fontSize: '0.85rem', color: '#475569', cursor: 'pointer' }}>
                    Guardar los datos manuales ingresados como nuevos registros maestros en el sistema
                  </label>
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', marginTop: '1rem' }}>
                  <QrCode size={20} /> Iniciar Sesión QR (5 Minutos)
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: Late Arrival QR Generator (Visual Dynamic QR Display Only) */}
      {showLateQrModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
              Código QR Exclusivo para Tardíos (5 Minutos)
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
              Este QR registrará automáticamente el estado como <strong>"Tarde"</strong> para los aprendices que escaneen.
            </p>

            {lateLoading ? (
              <p style={{ padding: '2rem', color: '#64748b' }}>Generando QR Tardío...</p>
            ) : lateQrDataUrl ? (
              <div>
                <div style={{ margin: '1rem 0' }}>
                  <img
                    src={lateQrDataUrl}
                    alt="Código QR para Tardíos"
                    style={{ maxWidth: '260px', width: '100%', borderRadius: '16px', border: '4px solid #fef08a', padding: '0.5rem', background: '#fff' }}
                  />
                </div>
                <p style={{ fontSize: '0.8rem', color: '#854d0e', marginBottom: '1.25rem' }}>
                  Presente este código QR en pantalla. Vence en exactamente 5 minutos.
                </p>
                <button onClick={() => { setShowLateQrModal(false); setLateQrDataUrl(null); }} className="btn-secondary" style={{ width: '100%' }}>
                  Cerrar Ventana
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* MODAL 2: Manual Late Student Entry (Sin campo de hora manual; usa servidor) */}
      {showManualLateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>
              Registrar Aprendiz Tardío Manualmente
            </h2>

            {manualError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} />
                <span>{manualError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterManualLate}>
              <div className="form-group">
                <label className="form-label">Nombre Completo del Aprendiz *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. Juan Pablo Gómez"
                  value={manualStudentName}
                  onChange={(e) => setManualStudentName(e.target.value)}
                  required
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Documento *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. 1098765432"
                    value={manualStudentDoc}
                    onChange={(e) => setManualStudentDoc(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Estado de Asistencia</label>
                  <select className="form-select" value={manualStatus} onChange={(e) => setManualStatus(e.target.value)}>
                    <option value="Tarde">Tarde</option>
                    <option value="Justificado">Justificado</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Justificación / Motivo en Texto</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Escriba el motivo de la tardanza o inasistencia..."
                  value={manualExcuseNote}
                  onChange={(e) => setManualExcuseNote(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Adjuntar Soporte / Excusa (PNG o PDF únicamente, máx 5MB)</label>
                <input
                  type="file"
                  accept="image/png, application/pdf"
                  className="form-input"
                  onChange={(e) => setManualExcuseFile(e.target.files ? e.target.files[0] : null)}
                  style={{ padding: '0.4rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowManualLateModal(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={uploadingFile} className="btn-primary">
                  {uploadingFile ? 'Subiendo excusa...' : 'Guardar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
