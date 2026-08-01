'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { ArrowLeft, Save, UserPlus, Users, Trash2, AlertCircle, FileSpreadsheet, UploadCloud, ShieldCheck } from 'lucide-react';

type Aprendiz = {
  id: number;
  full_name: string;
  document: string;
  is_active: boolean;
  deactivation_reason?: string | null;
  face_registered_at: string | null;
};

export default function InstructorAprendicesPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<'instructor' | 'coordinador'>('instructor');
  const [fichas, setFichas] = useState<any[]>([]);
  const [fichaCode, setFichaCode] = useState('');
  const [aprendices, setAprendices] = useState<Aprendiz[]>([]);
  const [newName, setNewName] = useState('');
  const [newDocument, setNewDocument] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Excel Import State
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelMessage, setExcelMessage] = useState<string | null>(null);

  // Modal de retiro
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedAprendiz, setSelectedAprendiz] = useState<Aprendiz | null>(null);
  const [removalReason, setRemovalReason] = useState('');

  useEffect(() => {
    (async () => {
      const me = await fetch('/api/auth/me').then(r => r.json()).catch(() => null);
      if (!me?.authenticated || (me.user?.role !== 'instructor' && me.user?.role !== 'coordinador')) {
        router.push('/login');
        return;
      }
      setUserRole(me.user.role);
      const data = await fetch('/api/instructor/options').then(r => r.json());
      setFichas(data.fichas || []);
      setLoading(false);
    })();
  }, [router]);

  const loadRoster = async (code = fichaCode) => {
    if (!code) return;
    setMessage('');
    const res = await fetch(`/api/instructor/roster?ficha_code=${encodeURIComponent(code)}`);
    const data = await res.json();
    if (!res.ok) {
      setAprendices([]);
      setMessage(data.error || 'No fue posible consultar el listado.');
      return;
    }
    setAprendices(data.aprendices || []);
  };

  const handleImportExcelRoster = async () => {
    setExcelMessage(null);
    if (!excelFile || !fichaCode) {
      setExcelMessage('Seleccione primero una ficha y el archivo Excel (.xlsx/.xls).');
      return;
    }

    setExcelLoading(true);
    try {
      const workbook = XLSX.read(await excelFile.arrayBuffer(), { type: 'array' });
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

      const selectedFichaObj = fichas.find(f => f.code === fichaCode);

      const res = await fetch('/api/instructor/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import',
          ficha_code: fichaCode,
          program_name: selectedFichaObj?.program_name || 'Formación SENA',
          students
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo importar el listado.');

      setExcelMessage(`¡Listado Ancla Actualizado! Se cargaron ${data.imported} aprendices para la ficha ${fichaCode}.`);
      setExcelFile(null);
      await loadRoster();
    } catch (err: any) {
      setExcelMessage(err.message || 'Error al procesar archivo Excel. Verifique las columnas "Nombre Completo" y "Documento".');
    } finally {
      setExcelLoading(false);
    }
  };

  const updateAprendiz = async (aprendiz: Aprendiz, changes: Partial<Aprendiz>) => {
    const next = { ...aprendiz, ...changes };
    setAprendices(rows => rows.map(row => row.id === next.id ? next : row));
    const res = await fetch('/api/instructor/roster', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: next.id, full_name: next.full_name, document: next.document, is_active: next.is_active })
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || 'No fue posible guardar el cambio.');
      await loadRoster();
    } else setMessage('Cambio guardado.');
  };

  const handleRemoveClick = (ap: Aprendiz) => {
    setSelectedAprendiz(ap);
    setRemovalReason('');
    setShowRemoveModal(true);
  };

  const confirmRemoval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAprendiz) return;

    const res = await fetch('/api/instructor/roster', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedAprendiz.id, reason: removalReason.trim() })
    });

    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || 'No fue posible retirar el aprendiz.');
    } else {
      setMessage(`Aprendiz "${selectedAprendiz.full_name}" retirado con éxito.`);
      setShowRemoveModal(false);
      await loadRoster();
    }
  };

  const addAprendiz = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!fichaCode) return;
    const res = await fetch('/api/instructor/roster', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upsert', ficha_code: fichaCode, full_name: newName, document: newDocument })
    });
    const data = await res.json();
    if (!res.ok) { setMessage(data.error || 'No fue posible agregar el aprendiz.'); return; }
    setNewName(''); setNewDocument(''); setMessage('Aprendiz agregado al listado de la ficha.');
    await loadRoster();
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Cargando listado de aprendices…</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <header className="header-bar">
        <div className="brand-title"><Users size={28} style={{ color: '#39a900' }} /><span>Gestión de Aprendices por Ficha ({userRole === 'coordinador' ? 'Coordinador' : 'Instructor'})</span></div>
        <button onClick={() => router.push(userRole === 'coordinador' ? '/coordinador/dashboard' : '/instructor/dashboard')} className="btn-secondary"><ArrowLeft size={16} /> Volver al panel</button>
      </header>
      <main className="container" style={{ maxWidth: '1100px' }}>
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <label className="form-label">Seleccione Ficha de Formación *</label>
          <select className="form-select" value={fichaCode} onChange={(e) => { setFichaCode(e.target.value); setAprendices([]); loadRoster(e.target.value); }}>
            <option value="">-- Seleccione una ficha --</option>
            {fichas.map(f => <option key={f.id} value={f.code}>{f.code} - {f.program_name}</option>)}
          </select>
          {message && <p style={{ color: message.includes('No fue') || message.includes('No tiene') ? '#b91c1c' : '#166534', marginTop: '0.75rem', fontSize: '0.9rem' }}>{message}</p>}
        </div>

        {fichaCode && (
          <>
            {/* CARGA DE EXCEL DE ANCLAJE PARA VERIFICACIÓN OBLIGATORIA */}
            <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1rem', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', color: '#166534', fontWeight: 800 }}>
                <ShieldCheck size={22} style={{ color: '#39a900' }} />
                <span>Subir Listado Excel Oficial (Ancla de Verificación para Ficha {fichaCode})</span>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#334155', marginBottom: '1rem' }}>
                Este listado actúa como la <strong>fuente de verdad oficial</strong>. Los aprendices deberán ingresar exactamente su número de documento y nombre registrado en esta lista para poder registrarse en la plataforma.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="form-input"
                  onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                  style={{ flex: 1, padding: '0.45rem', minWidth: '240px' }}
                />
                <button
                  type="button"
                  onClick={handleImportExcelRoster}
                  disabled={excelLoading || !excelFile}
                  className="btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.25rem' }}
                >
                  <FileSpreadsheet size={18} />
                  {excelLoading ? 'Cargando Excel...' : 'Cargar Listado Excel'}
                </button>
              </div>
              {excelMessage && (
                <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: excelMessage.includes('Error') || excelMessage.includes('Verifique') ? '#b91c1c' : '#15803d', fontWeight: 600 }}>
                  {excelMessage}
                </p>
              )}
            </div>

            {/* FORMULARIO INGRESO MANUAL */}
            <form onSubmit={addAprendiz} className="glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem', fontWeight: 700 }}>
                <UserPlus size={17} style={{ verticalAlign: 'text-bottom', marginRight: '0.3rem' }} />
                Agregar Aprendiz Individual al Listado
              </h2>
              <div className="grid-3">
                <input required className="form-input" placeholder="Nombre completo" value={newName} onChange={(e) => setNewName(e.target.value)} />
                <input required className="form-input" placeholder="Documento" value={newDocument} onChange={(e) => setNewDocument(e.target.value)} />
                <button className="btn-primary" type="submit">Agregar al listado</button>
              </div>
            </form>

            {/* LISTA DE APRENDICES */}
            <div className="glass-card" style={{ padding: '1.25rem', overflowX: 'auto' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', fontWeight: 800 }}>
                Listado Oficial de la Ficha {fichaCode} ({aprendices.length} Aprendices)
              </h2>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Nombre completo</th>
                    <th>Documento</th>
                    <th>Registro facial</th>
                    <th>Estado / Motivo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {aprendices.map(ap => (
                    <tr key={ap.id}>
                      <td><input className="form-input" value={ap.full_name} onChange={(e) => setAprendices(rows => rows.map(row => row.id === ap.id ? { ...row, full_name: e.target.value } : row))} /></td>
                      <td><input className="form-input" value={ap.document} onChange={(e) => setAprendices(rows => rows.map(row => row.id === ap.id ? { ...row, document: e.target.value } : row))} /></td>
                      <td>{ap.face_registered_at ? <span style={{ color: '#166534', fontWeight: 700 }}>Registrado</span> : <span style={{ color: '#64748b' }}>Pendiente</span>}</td>
                      <td>
                        {ap.is_active ? (
                          <span className="badge-status badge-presente">Activo</span>
                        ) : (
                          <div>
                            <span className="badge-status badge-falta">Inactivo / Retirado</span>
                            {ap.deactivation_reason && (
                              <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '0.2rem' }}>
                                Motivo: {ap.deactivation_reason}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn-secondary" onClick={() => updateAprendiz(ap, {})} title="Guardar cambios"><Save size={14} /> Guardar</button>
                        {ap.is_active ? (
                          <button className="btn-secondary" style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }} onClick={() => handleRemoveClick(ap)} title="Retirar aprendiz de la ficha">
                            <Trash2 size={14} /> Retirar
                          </button>
                        ) : (
                          <button className="btn-secondary" onClick={() => updateAprendiz(ap, { is_active: true })}>Reactivar</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* MODAL RETIRAR APRENDIZ CON MOTIVO */}
        {showRemoveModal && selectedAprendiz && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={20} /> Retirar Aprendiz: {selectedAprendiz.full_name}
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
                Por favor ingrese el motivo institucional del retiro o desvinculación de esta ficha.
              </p>
              <form onSubmit={confirmRemoval}>
                <div className="form-group">
                  <label className="form-label">Motivo de Retiro *</label>
                  <textarea
                    required
                    className="form-textarea"
                    rows={3}
                    placeholder="Ej. Retiro voluntario, traslado de ficha, sanción disciplinaria..."
                    value={removalReason}
                    onChange={(e) => setRemovalReason(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowRemoveModal(false)}>Cancelar</button>
                  <button type="submit" className="btn-primary" style={{ background: '#dc2626' }}>Confirmar Retiro</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
