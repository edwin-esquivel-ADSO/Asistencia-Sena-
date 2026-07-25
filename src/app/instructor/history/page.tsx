'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  History, ArrowLeft, Search, Edit3, MapPin,
  Paperclip, ChevronDown, ChevronRight, Calendar, Clock,
  Filter, FileSpreadsheet, FileText, Globe, Monitor
} from 'lucide-react';
import { formatDateBogota, formatTimeBogota, formatDateFilenameBogota } from '@/lib/date-utils';

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

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
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
        att.ficha_code.includes(term) ||
        att.ambiente_name.toLowerCase().includes(term) ||
        att.instructor_name.toLowerCase().includes(term);
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
        'Documento ID',
        'Nombre del Aprendiz',
        'Estado Asistencia',
        'Horas Certificadas',
        'Tipo Registro',
        'Hora Exacta Registro (Servidor)',
        'Coordenadas GPS',
        'Precisión GPS',
        'IP Pública',
        'Dispositivo',
        'Navegador',
        'Estado Ubicación',
        'Enlace Mapa Google',
        'Justificación / Excusa',
        'Enlace Soporte Excusa'
      ]
    ];

    const dataRows = sessionAtts.map((att, idx) => {
      const host = typeof window !== 'undefined' ? window.location.host : '';
      const fullExcuseUrl = att.excuse_path ? `${window.location.protocol}//${host}${att.excuse_path}` : 'Sin soporte';
      const hasGps = att.latitud && att.latitud !== 'Ubicación no disponible';
      const mapsUrl = hasGps ? `https://maps.google.com/?q=${att.latitud},${att.longitud}` : 'Sin GPS';

      return [
        idx + 1,
        att.aprendiz_document || '',
        att.aprendiz_name || '',
        att.estado || '',
        att.horas || 0,
        att.registro_tipo ? att.registro_tipo.replace('_', ' ') : 'Puntual',
        att.hora ? formatTimeBogota(att.hora) : '',
        hasGps ? `${att.latitud}, ${att.longitud}` : att.location_status || 'Sin GPS',
        att.precision_gps || 'No disponible',
        att.ip_publica || 'Desconocida',
        att.dispositivo || 'Desconocido',
        att.navegador || 'Desconocido',
        att.location_status || 'No capturada',
        mapsUrl,
        att.excuse_note || '',
        fullExcuseUrl
      ];
    });

    const fullAOA = [...headerRows, ...dataRows];
    const worksheet = XLSX.utils.aoa_to_sheet(fullAOA);

    worksheet['!cols'] = [
      { wch: 5 },  // N°
      { wch: 16 }, // Documento ID
      { wch: 32 }, // Nombre del Aprendiz
      { wch: 18 }, // Estado Asistencia
      { wch: 18 }, // Horas Certificadas
      { wch: 16 }, // Tipo Registro
      { wch: 24 }, // Hora Exacta Registro
      { wch: 26 }, // Coordenadas GPS
      { wch: 18 }, // Precisión GPS
      { wch: 18 }, // IP Pública
      { wch: 20 }, // Dispositivo
      { wch: 18 }, // Navegador
      { wch: 22 }, // Estado Ubicación
      { wch: 45 }, // Enlace Mapa Google
      { wch: 30 }, // Justificación / Excusa
      { wch: 45 }  // Enlace Soporte Excusa
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Sesion_${session.id}`);

    const fileName = `Lista_Asistencia_Ficha_${session.ficha_code}_Sesion_${session.id}_${filenameDateStr}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <p style={{ fontSize: '1.1rem', color: '#64748b', fontWeight: 600 }}>Cargando Historial de Asistencias...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header Bar */}
      <header className="header-bar">
        <div className="brand-title">
          <History size={28} style={{ color: '#39a900' }} />
          <span>Historial e Informes por Sesión y Jornada</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => router.push('/instructor/dashboard')} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
            <ArrowLeft size={16} /> Volver al Panel
          </button>
        </div>
      </header>

      <main className="container">
        {/* FILTERS PANEL */}
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
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

          <div className="grid-3">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Ficha de Formación</label>
              <select className="form-select" value={filterFicha} onChange={(e) => setFilterFicha(e.target.value)}>
                <option value="all">Todas las Fichas</option>
                {uniqueFichas.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Ambiente de Formación</label>
              <select className="form-select" value={filterAmbiente} onChange={(e) => setFilterAmbiente(e.target.value)}>
                <option value="all">Todos los Ambientes</option>
                {uniqueAmbientes.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Buscar Estudiante / Documento</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. Juan Gómez o 1098..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                />
                <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              </div>
            </div>
          </div>
        </div>

        {/* RESULTS SUMMARY BAR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
            Sesiones y Jornadas ({filteredSessions.length})
          </h2>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Total Registros de Aprendices Filtrados: <strong>{filteredAttendances.length}</strong>
          </span>
        </div>

        {/* SESSIONS & JORNADAS ACCORDION LIST */}
        {filteredSessions.length === 0 ? (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <FileText size={48} style={{ opacity: 0.4, marginBottom: '0.75rem' }} />
            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#64748b' }}>No se encontraron sesiones para los filtros seleccionados.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {filteredSessions.map(session => {
              const sessionAtts = filteredAttendances.filter(a => a.qr_session_id === session.id);
              const isExpanded = expandedSessions[session.id] ?? false;

              const fechaFormatted = formatDateBogota(session.created_at);
              const horaStart = formatTimeBogota(session.created_at);
              const horaEnd = formatTimeBogota(session.expires_at);

              const countPresente = sessionAtts.filter(a => a.estado === 'Presente').length;
              const countTarde = sessionAtts.filter(a => a.estado.includes('Tarde')).length;
              const countJustificado = sessionAtts.filter(a => a.estado === 'Justificado').length;
              const countFalta = sessionAtts.filter(a => a.estado === 'Falta').length;

              return (
                <div key={session.id} className="glass-card" style={{ padding: 0, overflow: 'hidden', borderLeft: '5px solid #39a900' }}>
                  {/* SESSION HEADER CARD */}
                  <div
                    onClick={() => toggleSession(session.id)}
                    style={{
                      padding: '1.25rem 1.5rem',
                      background: '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <button style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '0.4rem', color: '#0f172a', display: 'flex', alignItems: 'center' }}>
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </button>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                            Ficha {session.ficha_code}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: '#64748b', background: '#e2e8f0', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: 700 }}>
                            Sesión #{session.id}
                          </span>
                          <span className="badge-status badge-presente" style={{ fontSize: '0.775rem' }}>
                            Jornada {session.jornada}
                          </span>
                          {session.grupo && (
                            <span style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '6px', color: '#475569', fontWeight: 600 }}>
                              {session.grupo}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
                          Ambiente: <strong>{session.ambiente_name}</strong> | Instructor: <strong>{session.instructor_name}</strong>
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                      {/* Timestamps in America/Bogota */}
                      <div style={{ fontSize: '0.85rem', color: '#475569', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'flex-end' }}>
                          <Calendar size={14} style={{ color: '#39a900' }} /> Fecha: <strong>{fechaFormatted}</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.1rem', justifyContent: 'flex-end' }}>
                          <Clock size={14} style={{ color: '#0284c7' }} /> Inicio: {horaStart} | Fin QR: {horaEnd} ({session.hours_duration}h clase)
                        </div>
                      </div>

                      {/* Metrics Summary Badges */}
                      <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700 }}>
                        <span title="Presentes" style={{ background: '#dcfce7', color: '#15803d', padding: '0.3rem 0.6rem', borderRadius: '8px' }}>
                          P: {countPresente}
                        </span>
                        <span title="Tardíos" style={{ background: '#fef9c3', color: '#a16207', padding: '0.3rem 0.6rem', borderRadius: '8px' }}>
                          T: {countTarde}
                        </span>
                        <span title="Justificados" style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.3rem 0.6rem', borderRadius: '8px' }}>
                          J: {countJustificado}
                        </span>
                        <span title="Faltas" style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.3rem 0.6rem', borderRadius: '8px' }}>
                          F: {countFalta}
                        </span>
                      </div>

                      {/* INDIVIDUAL EXCEL EXPORT BUTTON FOR THIS SESSION */}
                      <button
                        onClick={(e) => exportSessionToExcel(session, sessionAtts, e)}
                        className="btn-secondary"
                        style={{
                          padding: '0.45rem 0.85rem',
                          fontSize: '0.825rem',
                          background: '#f0fdf4',
                          color: '#166534',
                          border: '1px solid #bbf7d0',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}
                        title="Exportar únicamente los aprendices de esta sesión a Excel"
                      >
                        <FileSpreadsheet size={16} style={{ color: '#39a900' }} />
                        Exportar Excel de esta sesión
                      </button>
                    </div>
                  </div>

                  {/* EXPANDABLE STUDENT ROSTER */}
                  {isExpanded && (
                    <div style={{ padding: '1.25rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155' }}>
                          Lista de Aprendices Registrados en la Sesión #{session.id} ({sessionAtts.length})
                        </span>
                        <button
                          onClick={(e) => exportSessionToExcel(session, sessionAtts, e)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#39a900',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          <FileSpreadsheet size={14} /> Exportar solo esta lista (.xlsx)
                        </button>
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
                                <th>Fecha</th>
                                <th>Hora Registro (Servidor)</th>
                                <th>Estado</th>
                                <th>Horas</th>
                                <th>Geolocalización GPS & Mapa</th>
                                <th>Dispositivo & Red (IP)</th>
                                <th>Excusa / Soporte PNG/PDF</th>
                                <th>Acción</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sessionAtts.map((att, idx) => (
                                <tr key={att.id}>
                                  <td style={{ fontWeight: 700, color: '#64748b' }}>{idx + 1}</td>
                                  <td>
                                    <strong style={{ color: '#0f172a', display: 'block' }}>{att.aprendiz_name}</strong>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Doc: {att.aprendiz_document}</span>
                                  </td>
                                  <td>{formatDateBogota(att.fecha)}</td>
                                  <td style={{ fontWeight: 700, color: '#0f172a' }}>{formatTimeBogota(att.hora)}</td>
                                  <td>
                                    <span className={`badge-status ${
                                      att.estado === 'Presente' ? 'badge-presente' :
                                      att.estado.includes('Tarde') ? 'badge-tarde' :
                                      att.estado === 'Justificado' ? 'badge-justificado' : 'badge-falta'
                                    }`}>
                                      {att.estado}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{att.horas}h</td>
                                  <td style={{ fontSize: '0.8rem' }}>
                                    {att.latitud && att.latitud !== 'Ubicación no disponible' ? (
                                      <div>
                                        <span style={{ color: '#475569', fontSize: '0.75rem', fontWeight: 600 }}>{att.latitud}, {att.longitud}</span>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Precisión: {att.precision_gps || 'GPS'}</div>
                                        <a
                                          href={`https://maps.google.com/?q=${att.latitud},${att.longitud}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{ color: '#0284c7', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.15rem' }}
                                        >
                                          <MapPin size={12} /> Ver en Maps
                                        </a>
                                      </div>
                                    ) : (
                                      <span style={{ color: '#94a3b8' }}>{att.location_status || 'Sin GPS'}</span>
                                    )}
                                  </td>
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
                                    {att.excuse_path ? (
                                      <a
                                        href={att.excuse_path}
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
            })}
          </div>
        )}
      </main>

      {/* EDIT RECORD MODAL */}
      {showEditModal && editingRecord && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>
              Editar Asistencia: {editingRecord.aprendiz_name}
            </h2>

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
    </div>
  );
}
