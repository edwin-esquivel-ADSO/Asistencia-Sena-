'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  History, ArrowLeft, Search, Edit3, MapPin,
  Paperclip, ChevronDown, ChevronRight, Calendar, Clock,
  Filter, FileSpreadsheet, FileText, Globe, Monitor, QrCode, X, Loader2
} from 'lucide-react';
import {
  formatDateBogota,
  formatTimeBogota,
  formatDateFilenameBogota,
  formatCompactDateBogota,
  formatExcusePeriod
} from '@/lib/date-utils';
import { Navbar } from '@/components/Navbar';

interface SessionItem {
  id: number;
  token: string;
  instructor_id: number;
  instructor_name: string;
  ficha_code: string;
  program_name: string;
  jornada: string;
  ambiente_name: string;
  grupo: string;
  sede: string;
  duration_minutes: number;
  hours_duration: number;
  status: string;
  session_type?: string;
  created_at: string;
  expires_at: string;
  total_asistentes: number;
  total_presentes: number;
  total_tardes: number;
  total_justificados: number;
  total_faltas: number;
}

interface AttendanceItem {
  id: number;
  qr_session_id: number;
  fecha: string;
  hora: string;
  instructor_name: string;
  ficha_code: string;
  jornada: string;
  ambiente_name: string;
  grupo: string;
  sede: string;
  aprendiz_name: string;
  aprendiz_document: string;
  estado: string;
  registro_tipo: string;
  horas: number;
  ip_publica: string;
  latitud: string;
  longitud: string;
  precision_gps: string;
  location_status: string;
  navegador: string;
  dispositivo: string;
  excuse_path: string | null;
  excuse_note: string | null;
}

export default function InstructorHistoryPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [attendances, setAttendances] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [filterJornada, setFilterJornada] = useState<string>('all');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [filterFicha, setFilterFicha] = useState<string>('all');
  const [filterAmbiente, setFilterAmbiente] = useState<string>('all');
  const [filterFecha, setFilterFecha] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Accordion open/collapsed session IDs
  const [expandedSessions, setExpandedSessions] = useState<Record<number, boolean>>({});

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceItem | null>(null);
  const [editStatus, setEditStatus] = useState('Presente');
  const [editHours, setEditHours] = useState(6);
  const [editExcuse, setEditExcuse] = useState('');
  const [editExcuseFile, setEditExcuseFile] = useState<File | null>(null);
  const [uploadingEditFile, setUploadingEditFile] = useState(false);
  const [lateQrDataUrl, setLateQrDataUrl] = useState<string | null>(null);
  const [lateQrLoading, setLateQrLoading] = useState<number | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (!meData.authenticated || meData.user.role !== 'instructor') {
        router.push('/login');
        return;
      }
      setCurrentUser(meData.user);

      const res = await fetch('/api/instructor/history');
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      const loadedSessions: SessionItem[] = data.sessions || [];
      const loadedAttendances: AttendanceItem[] = data.attendances || [];

      setSessions(loadedSessions);
      setAttendances(loadedAttendances);

      if (loadedSessions.length > 0) {
        setExpandedSessions({ [loadedSessions[0].id]: true });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSession = (sessionId: number) => {
    setExpandedSessions(prev => ({
      ...prev,
      [sessionId]: !prev[sessionId]
    }));
  };

  const openEdit = (att: AttendanceItem) => {
    setEditingRecord(att);
    setEditStatus(att.estado);
    setEditHours(att.horas);
    setEditExcuse(att.excuse_note || '');
    setEditExcuseFile(null);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    let excuseFilePath = editingRecord.excuse_path;

    if (editExcuseFile) {
      setUploadingEditFile(true);
      try {
        const formData = new FormData();
        formData.append('file', editExcuseFile);
        const uploadRes = await fetch('/api/excusas/upload', {
          method: 'POST',
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.filePath) {
          excuseFilePath = uploadData.filePath;
        }
      } catch (err) {
        console.error('Error uploading excuse file:', err);
      } finally {
        setUploadingEditFile(false);
      }
    }

    try {
      const res = await fetch('/api/instructor/attendances/edit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingRecord.id,
          estado: editStatus,
          horas: editHours,
          excuse_note: editExcuse,
          excuse_path: excuseFilePath
        })
      });

      if (res.ok) {
        setShowEditModal(false);
        loadHistory();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReopenLate = async (sessionId: number) => {
    setLateQrLoading(sessionId);
    try {
      const res = await fetch(`/api/instructor/sessions/${sessionId}/late-qr`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No fue posible abrir el QR tardío.');
      setLateQrDataUrl(data.qr_data_url);
    } catch (err: any) {
      alert(err.message || 'No fue posible abrir el QR tardío.');
    } finally {
      setLateQrLoading(null);
    }
  };

  // Extract unique filter options
  const uniqueFichas = Array.from(new Set(sessions.map(s => s.ficha_code))).filter(Boolean);
  const uniqueAmbientes = Array.from(new Set(sessions.map(s => s.ambiente_name))).filter(Boolean);

  // Filter attendances
  const filteredAttendances = attendances.filter(att => {
    if (filterJornada !== 'all' && att.jornada !== filterJornada) return false;
    if (filterEstado !== 'all' && att.estado !== filterEstado) return false;
    if (filterFicha !== 'all' && att.ficha_code !== filterFicha) return false;
    if (filterAmbiente !== 'all' && att.ambiente_name !== filterAmbiente) return false;

    if (filterFecha) {
      const attDateStr = att.fecha ? new Date(att.fecha).toISOString().slice(0, 10) : '';
      if (attDateStr !== filterFecha) return false;
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matches =
        att.aprendiz_name.toLowerCase().includes(term) ||
        att.aprendiz_document.includes(term) ||
        att.ficha_code.includes(term);
      if (!matches) return false;
    }

    return true;
  });

  // Filter sessions
  const filteredSessions = sessions.filter(sess => {
    if (filterJornada !== 'all' && sess.jornada !== filterJornada) return false;
    if (filterFicha !== 'all' && sess.ficha_code !== filterFicha) return false;
    if (filterAmbiente !== 'all' && sess.ambiente_name !== filterAmbiente) return false;

    if (filterFecha) {
      const sessDateStr = sess.created_at ? new Date(sess.created_at).toISOString().slice(0, 10) : '';
      if (sessDateStr !== filterFecha) return false;
    }

    const sessionAtts = filteredAttendances.filter(a => a.qr_session_id === sess.id);
    if (searchTerm.trim() || filterEstado !== 'all') {
      return sessionAtts.length > 0;
    }

    return true;
  });

  // Export Individual Excel for a specific session
  const exportSessionToExcel = (session: SessionItem, sessionAtts: AttendanceItem[], e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    const sessionDateStr = formatDateBogota(session.created_at);
    const sessionStartTimeStr = formatTimeBogota(session.created_at);
    const sessionEndTimeStr = formatTimeBogota(session.expires_at);
    const filenameDateStr = formatDateFilenameBogota(session.created_at);

    const headerRows = [
      ['SERVICIO NACIONAL DE APRENDIZAJE - SENA'],
      ['LISTA INSTITUCIONAL DE ASISTENCIA POR SESIÓN DE CLASE'],
      [''],
      ['FICHA DE FORMACIÓN:', session.ficha_code, '', 'PROGRAMA:', session.program_name],
      ['JORNADA:', session.jornada, '', 'AMBIENTE:', session.ambiente_name],
      ['GRUPO:', session.grupo || 'Grupo 1', '', 'SEDE:', session.sede || 'Sede Principal'],
      ['INSTRUCTOR:', session.instructor_name, '', 'FECHA SESIÓN:', sessionDateStr],
      ['HORA INICIO (SERVIDOR):', sessionStartTimeStr, '', 'HORA EXPIRACIÓN QR:', sessionEndTimeStr],
      ['DURACIÓN CLASE:', `${session.hours_duration} Horas Certificadas`, '', 'TOTAL APRENDICES REGISTRADOS:', sessionAtts.length],
      [''],
      [
        'N°',
        'APRENDIZ',
        'DOCUMENTO',
        'ESTADO',
        'HORAS',
        'TIPO REGISTRO',
        'FECHA',
        'HORA REGISTRO (SERVIDOR)',
        'IP PÚBLICA',
        'DISPOSITIVO',
        'NAVEGADOR',
        'ESTADO UBICACIÓN',
        'ENLACE MAPA GOOGLE',
        'JUSTIFICACIÓN / NOTA',
        'ENLACE SOPORTE'
      ]
    ];

    const host = typeof window !== 'undefined' ? window.location.host : '';
    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';

    const dataRows = sessionAtts.map((att, index) => {
      const fullExcuseUrl = att.excuse_path
        ? `${protocol}//${host}/api/excusas/signed-url?path=${encodeURIComponent(att.excuse_path)}&redirect=true`
        : 'Sin soporte';
      const hasGps = att.latitud && att.latitud !== 'Ubicación no disponible';
      const mapsUrl = hasGps ? `https://maps.google.com/?q=${att.latitud},${att.longitud}` : 'Sin GPS';

      return [
        index + 1,
        att.aprendiz_name,
        att.aprendiz_document,
        att.estado,
        att.horas,
        att.registro_tipo,
        formatDateBogota(att.fecha),
        formatTimeBogota(att.hora),
        att.ip_publica || 'Desconocida',
        att.dispositivo || 'Desconocido',
        att.navegador || 'Desconocido',
        att.location_status || 'Sin datos GPS',
        mapsUrl,
        att.excuse_note || 'Sin observaciones',
        fullExcuseUrl
      ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([...headerRows, ...dataRows]);
    worksheet['!cols'] = [
      { wch: 5 }, { wch: 32 }, { wch: 16 }, { wch: 14 }, { wch: 8 },
      { wch: 16 }, { wch: 14 }, { wch: 22 }, { wch: 18 }, { wch: 20 },
      { wch: 18 }, { wch: 22 }, { wch: 45 }, { wch: 30 }, { wch: 45 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Sesion_${session.id}`);

    const appendFilteredSheet = (name: string, rows: typeof dataRows) => {
      const sheet = XLSX.utils.aoa_to_sheet([headerRows[10], ...rows]);
      sheet['!cols'] = worksheet['!cols'];
      XLSX.utils.book_append_sheet(workbook, sheet, name);
    };
    appendFilteredSheet('Presentes', dataRows.filter((row) => row[3] === 'Presente'));
    appendFilteredSheet('Tardes', dataRows.filter((row) => String(row[3]).includes('Tarde')));
    appendFilteredSheet('No presentes', dataRows.filter((row) => row[3] === 'Falta' || row[3] === 'Justificado'));

    const fileName = `Lista_Asistencia_Ficha_${session.ficha_code}_Sesion_${session.id}_${filenameDateStr}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center', color: '#334155' }}>
          <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto 0.5rem auto', color: '#39a900' }} />
          <p style={{ fontSize: '1.05rem', fontWeight: 600 }}>Cargando Historial de Asistencias...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Finding 2: Responsive Navbar with Hamburger Drawer */}
      <Navbar
        role="instructor"
        userName={currentUser?.full_name}
      />

      <main className="container" style={{ padding: '1.5rem 1rem' }}>
        {/* FILTERS PANEL */}
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#0f172a', fontWeight: 700 }}>
            <Filter size={20} style={{ color: '#39a900' }} />
            <span>Filtros de Búsqueda y Auditoría</span>
          </div>

          <div className="grid-3" style={{ marginBottom: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Jornada</label>
              <select className="form-select" value={filterJornada} onChange={(e) => setFilterJornada(e.target.value)}>
                <option value="all">Todas las Jornadas</option>
                <option value="Diurna">Diurna</option>
                <option value="Tarde">Tarde</option>
                <option value="Nocturna">Nocturna</option>
                <option value="Mixta">Mixta</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Estado de Asistencia</label>
              <select className="form-select" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
                <option value="all">Todos los Estados</option>
                <option value="Presente">Presente</option>
                <option value="Tarde">Tarde</option>
                <option value="Justificado">Justificado</option>
                <option value="Falta">Falta</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Fecha de Sesión</label>
              <input
                type="date"
                className="form-input"
                value={filterFecha}
                onChange={(e) => setFilterFecha(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Ficha de Formación</label>
              <select className="form-select" value={filterFicha} onChange={(e) => setFilterFicha(e.target.value)}>
                <option value="all">Todas las Fichas</option>
                {uniqueFichas.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Ambiente</label>
              <select className="form-select" value={filterAmbiente} onChange={(e) => setFilterAmbiente(e.target.value)}>
                <option value="all">Todos los Ambientes</option>
                {uniqueAmbientes.map((amb) => (
                  <option key={amb} value={amb}>{amb}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Buscar Aprendiz o Documento</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Nombre o cédula..."
                  className="form-input"
                  style={{ paddingLeft: '2.25rem' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              </div>
            </div>
          </div>
        </div>

        {/* ACCORDION SESSIONS LIST */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredSessions.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <History size={48} style={{ opacity: 0.3, margin: '0 auto 1rem auto' }} />
              <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No se encontraron sesiones con los filtros seleccionados.</p>
            </div>
          ) : (
            filteredSessions.map((session) => {
              const sessionAtts = filteredAttendances.filter((a) => a.qr_session_id === session.id);
              const countPresente = sessionAtts.filter((a) => a.estado === 'Presente').length;
              const countTarde = sessionAtts.filter((a) => a.estado.includes('Tarde')).length;
              const countJustificado = sessionAtts.filter((a) => a.estado === 'Justificado').length;
              const countFalta = sessionAtts.filter((a) => a.estado === 'Falta').length;

              const isExpanded = expandedSessions[session.id] ?? false;
              const fechaFormatted = formatCompactDateBogota(session.created_at);
              const horaStart = formatTimeBogota(session.created_at);
              const horaEnd = formatTimeBogota(session.expires_at);

              // Finding 10: Check if within 10-minute extemporaneous grace period
              const diffMinutes = Math.floor((Date.now() - new Date(session.expires_at).getTime()) / (1000 * 60));
              const isGraceExpired = diffMinutes > 10;

              return (
                <div key={session.id} className="glass-card" style={{ overflow: 'hidden' }}>
                  {/* SESSION ACCORDION HEADER */}
                  <div
                    onClick={() => toggleSession(session.id)}
                    style={{
                      padding: '1.25rem 1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      background: isExpanded ? '#f8fafc' : '#ffffff',
                      transition: 'background 0.2s ease',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {isExpanded ? (
                        <ChevronDown size={20} style={{ color: '#39a900' }} />
                      ) : (
                        <ChevronRight size={20} style={{ color: '#94a3b8' }} />
                      )}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                            Ficha {session.ficha_code}
                          </span>
                          <span className="brand-badge" style={{ fontSize: '0.7rem', textTransform: 'capitalize' }}>
                            {session.jornada}
                          </span>
                          {session.session_type === 'late_qr' && (
                            <span style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: 700 }}>
                              QR Tardío
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '0.2rem' }}>
                          {session.program_name} | {session.ambiente_name}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '0.85rem', color: '#475569', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'flex-end' }}>
                          <Calendar size={14} style={{ color: '#39a900' }} /> <strong>{fechaFormatted}</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.1rem', justifyContent: 'flex-end' }}>
                          <Clock size={14} style={{ color: '#0284c7' }} /> {horaStart} - {horaEnd}
                        </div>
                      </div>

                      {/* Finding 3: Metrics Summary Badges with stopPropagation */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{ display: 'flex', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 700 }}
                      >
                        <span
                          onClick={(e) => e.stopPropagation()}
                          title="Presentes"
                          style={{ background: '#dcfce7', color: '#15803d', padding: '0.3rem 0.55rem', borderRadius: '8px', cursor: 'default' }}
                        >
                          P: {countPresente}
                        </span>
                        <span
                          onClick={(e) => e.stopPropagation()}
                          title="Tardíos"
                          style={{ background: '#fef9c3', color: '#a16207', padding: '0.3rem 0.55rem', borderRadius: '8px', cursor: 'default' }}
                        >
                          T: {countTarde}
                        </span>
                        <span
                          onClick={(e) => e.stopPropagation()}
                          title="Justificados"
                          style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.3rem 0.55rem', borderRadius: '8px', cursor: 'default' }}
                        >
                          J: {countJustificado}
                        </span>
                        <span
                          onClick={(e) => e.stopPropagation()}
                          title="Faltas"
                          style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.3rem 0.55rem', borderRadius: '8px', cursor: 'default' }}
                        >
                          F: {countFalta}
                        </span>
                      </div>

                      {/* Export Excel Button */}
                      <button
                        onClick={(e) => exportSessionToExcel(session, sessionAtts, e)}
                        className="btn-secondary"
                        style={{
                          padding: '0.4rem 0.75rem',
                          fontSize: '0.8rem',
                          background: '#f0fdf4',
                          color: '#166534',
                          border: '1px solid #bbf7d0',
                          fontWeight: 700
                        }}
                        title="Exportar aprendices de esta sesión a Excel"
                      >
                        <FileSpreadsheet size={15} style={{ color: '#39a900' }} />
                        Exportar Excel
                      </button>

                      {/* Finding 10: Reopen Late Button with 10-min constraint */}
                      {session.status === 'finished' && session.session_type !== 'late_qr' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isGraceExpired) handleReopenLate(session.id);
                          }}
                          disabled={lateQrLoading === session.id || isGraceExpired}
                          className="btn-secondary"
                          style={{
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.8rem',
                            background: isGraceExpired ? '#f1f5f9' : '#fef9c3',
                            color: isGraceExpired ? '#94a3b8' : '#854d0e',
                            border: isGraceExpired ? '1px solid #e2e8f0' : '1px solid #fde68a',
                            cursor: isGraceExpired ? 'not-allowed' : 'pointer'
                          }}
                          title={isGraceExpired ? 'Límite extemporáneo de 10 minutos superado' : 'Reabrir código QR por 5 minutos'}
                        >
                          <QrCode size={15} />
                          {lateQrLoading === session.id
                            ? 'Abriendo...'
                            : isGraceExpired
                            ? 'Expirado > 10 min'
                            : 'Reabrir para tardíos'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* EXPANDABLE STUDENT ROSTER */}
                  {isExpanded && (
                    <div style={{ padding: '1.25rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155' }}>
                          Lista de Aprendices en Sesión #{session.id} ({sessionAtts.length})
                        </span>
                      </div>

                      {sessionAtts.length === 0 ? (
                        <p style={{ fontSize: '0.875rem', color: '#94a3b8', fontStyle: 'italic' }}>
                          No hay registros de aprendices vinculados a esta sesión.
                        </p>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table className="custom-table">
                            <thead>
                              <tr>
                                <th>N°</th>
                                <th>Aprendiz / Documento</th>
                                <th>Hora Registro</th>
                                <th>Estado</th>
                                <th>Horas</th>
                                <th>Dispositivo & Red</th>
                                <th>Excusa / Soporte</th>
                                <th>Acción</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sessionAtts.map((att, idx) => (
                                <tr key={att.id}>
                                  <td>{idx + 1}</td>
                                  <td>
                                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{att.aprendiz_name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Doc: {att.aprendiz_document}</div>
                                  </td>
                                  <td style={{ fontSize: '0.85rem' }}>{formatTimeBogota(att.hora)}</td>
                                  <td>
                                    <span className={`badge-status ${
                                      att.estado === 'Presente' ? 'badge-presente' :
                                      att.estado.includes('Tarde') ? 'badge-tarde' :
                                      att.estado === 'Justificado' ? 'badge-justificado' : 'badge-falta'
                                    }`}>
                                      {att.estado}
                                    </span>
                                  </td>
                                  <td style={{ fontWeight: 700 }}>{att.horas}h</td>
                                  <td style={{ fontSize: '0.775rem', color: '#475569' }}>
                                    <div><Globe size={12} style={{ display: 'inline', marginRight: '3px' }} /> IP: {att.ip_publica || 'Desconocida'}</div>
                                    <div><Monitor size={12} style={{ display: 'inline', marginRight: '3px' }} /> {att.dispositivo || ''} ({att.navegador || ''})</div>
                                  </td>
                                  <td style={{ fontSize: '0.8rem', maxWidth: '200px' }}>
                                    {att.excuse_note && (
                                      <p style={{ margin: 0, color: '#334155', fontStyle: 'italic' }}>
                                        "{att.excuse_note}"
                                      </p>
                                    )}
                                    {/* Finding 15: Secure signed URL redirect with 5-min TTL */}
                                    {att.excuse_path ? (
                                      <a
                                        href={`/api/excusas/signed-url?path=${encodeURIComponent(att.excuse_path)}&redirect=true`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: '#39a900', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.25rem' }}
                                      >
                                        <Paperclip size={14} /> Ver Soporte Adjunto
                                      </a>
                                    ) : !att.excuse_note && (
                                      <span style={{ color: '#94a3b8' }}>-</span>
                                    )}
                                  </td>
                                  <td>
                                    <button onClick={() => openEdit(att)} className="btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}>
                                      <Edit3 size={14} /> Editar
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* EDIT MODAL */}
      {showEditModal && editingRecord && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
              Editar Registro de Asistencia
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Aprendiz: <strong>{editingRecord.aprendiz_name}</strong> ({editingRecord.aprendiz_document})
            </p>

            <form onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label className="form-label">Estado de Asistencia</label>
                <select className="form-select" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                  <option value="Presente">Presente</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Justificado">Justificado</option>
                  <option value="Falta">Falta</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Horas Certificadas</label>
                <input
                  type="number"
                  min="0"
                  max="12"
                  className="form-input"
                  value={editHours}
                  onChange={(e) => setEditHours(parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nota de Justificación / Excusa</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={editExcuse}
                  onChange={(e) => setEditExcuse(e.target.value)}
                  placeholder="Detalles del motivo o justificación..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Actualizar Archivo de Excusa (PNG o PDF)</label>
                <input
                  type="file"
                  accept="image/png, application/pdf"
                  className="form-input"
                  onChange={(e) => setEditExcuseFile(e.target.files ? e.target.files[0] : null)}
                  style={{ padding: '0.4rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={uploadingEditFile} className="btn-primary">
                  {uploadingEditFile ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {lateQrDataUrl && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px', textAlign: 'center' }}>
            <button onClick={() => setLateQrDataUrl(null)} style={{ float: 'right', border: 'none', background: 'none', cursor: 'pointer' }} aria-label="Cerrar"><X size={20} /></button>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>QR para llegadas tardías</h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Este QR estará activo cinco minutos y registrará la asistencia como tardía.</p>
            <img src={lateQrDataUrl} alt="Código QR para tardíos" style={{ width: '100%', maxWidth: '320px', marginTop: '1rem', border: '3px solid #fef08a', borderRadius: '12px', padding: '0.5rem' }} />
          </div>
        </div>
      )}
    </div>
  );
}
