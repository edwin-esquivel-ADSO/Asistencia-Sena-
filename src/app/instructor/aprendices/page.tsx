'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, UserPlus, Users } from 'lucide-react';

type Aprendiz = {
  id: number;
  full_name: string;
  document: string;
  is_active: boolean;
  face_registered_at: string | null;
};

export default function InstructorAprendicesPage() {
  const router = useRouter();
  const [fichas, setFichas] = useState<any[]>([]);
  const [fichaCode, setFichaCode] = useState('');
  const [aprendices, setAprendices] = useState<Aprendiz[]>([]);
  const [newName, setNewName] = useState('');
  const [newDocument, setNewDocument] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const me = await fetch('/api/auth/me').then(r => r.json()).catch(() => null);
      if (!me?.authenticated || me.user?.role !== 'instructor') {
        router.push('/login');
        return;
      }
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
        <div className="brand-title"><Users size={28} style={{ color: '#39a900' }} /><span>Aprendices por ficha</span></div>
        <button onClick={() => router.push('/instructor/dashboard')} className="btn-secondary"><ArrowLeft size={16} /> Volver al panel</button>
      </header>
      <main className="container" style={{ maxWidth: '1100px' }}>
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <label className="form-label">Ficha de formación</label>
          <select className="form-select" value={fichaCode} onChange={(e) => { setFichaCode(e.target.value); setAprendices([]); }}>
            <option value="">Seleccione una ficha</option>
            {fichas.map(f => <option key={f.id} value={f.code}>{f.code} - {f.program_name}</option>)}
          </select>
          <button className="btn-primary" type="button" disabled={!fichaCode} onClick={() => loadRoster()} style={{ marginTop: '0.75rem' }}>Consultar y editar listado</button>
          {message && <p style={{ color: message.includes('No fue') || message.includes('No tiene') ? '#b91c1c' : '#166534', marginTop: '0.75rem', fontSize: '0.9rem' }}>{message}</p>}
        </div>
        {fichaCode && (
          <>
            <form onSubmit={addAprendiz} className="glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}><UserPlus size={17} style={{ verticalAlign: 'text-bottom' }} /> Agregar aprendiz manualmente</h2>
              <div className="grid-3">
                <input required className="form-input" placeholder="Nombre completo" value={newName} onChange={(e) => setNewName(e.target.value)} />
                <input required className="form-input" placeholder="Documento" value={newDocument} onChange={(e) => setNewDocument(e.target.value)} />
                <button className="btn-primary" type="submit">Agregar al listado</button>
              </div>
            </form>
            <div className="glass-card" style={{ padding: '1.25rem', overflowX: 'auto' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Listado de la ficha ({aprendices.length})</h2>
              <table className="custom-table">
                <thead><tr><th>Nombre completo</th><th>Documento</th><th>Registro facial</th><th>Estado</th><th>Acción</th></tr></thead>
                <tbody>{aprendices.map(ap => <tr key={ap.id}>
                  <td><input className="form-input" value={ap.full_name} onChange={(e) => setAprendices(rows => rows.map(row => row.id === ap.id ? { ...row, full_name: e.target.value } : row))} /></td>
                  <td><input className="form-input" value={ap.document} onChange={(e) => setAprendices(rows => rows.map(row => row.id === ap.id ? { ...row, document: e.target.value } : row))} /></td>
                  <td>{ap.face_registered_at ? 'Registrado' : 'Pendiente'}</td>
                  <td>{ap.is_active ? 'Activo' : 'Inactivo'}</td>
                  <td style={{ display: 'flex', gap: '0.5rem' }}><button className="btn-secondary" onClick={() => updateAprendiz(ap, {})}><Save size={14} /> Guardar</button><button className="btn-secondary" onClick={() => updateAprendiz(ap, { is_active: !ap.is_active })}>{ap.is_active ? 'Desactivar' : 'Activar'}</button></td>
                </tr>)}</tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
