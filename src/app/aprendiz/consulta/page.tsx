'use client';

import React, { useState } from 'react';
import { Search, UserCheck, Calendar, MapPin, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AprendizConsultaPage() {
  const [document, setDocument] = useState('');
  const [attendances, setAttendances] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/aprendiz/my-attendance?document=${document.trim()}`);
      const data = await res.json();
      setAttendances(data.attendances || []);
      setSearched(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <header className="header-bar">
        <div className="brand-title">
          <UserCheck size={28} style={{ color: '#39a900' }} />
          <span>Consulta de Asistencias SENA</span>
        </div>
        <Link href="/login" className="btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}>
          <ArrowLeft size={16} /> Portal Instructores
        </Link>
      </header>

      <main className="container" style={{ maxWidth: '800px' }}>
        <div className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
            Consultar Mis Asistencias
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.5rem' }}>
            Ingrese su número de documento para ver el historial de clases registradas.
          </p>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Ingrese número de documento (Ej. 1098765432)"
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                required
                style={{ paddingLeft: '2.5rem' }}
              />
              <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Buscando...' : 'Buscar Historial'}
            </button>
          </form>
        </div>

        {searched && (
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>
              Resultados de la Búsqueda ({attendances.length})
            </h2>

            {attendances.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                <p>No se encontraron registros de asistencia para este número de documento.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Fecha & Hora</th>
                      <th>Instructor</th>
                      <th>Ficha</th>
                      <th>Ambiente</th>
                      <th>Estado</th>
                      <th>Horas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendances.map((att) => (
                      <tr key={att.id}>
                        <td>{att.fecha ? new Date(att.fecha).toLocaleDateString() : ''} {att.hora}</td>
                        <td style={{ fontWeight: 600 }}>{att.instructor_name}</td>
                        <td><code style={{ background: '#f1f5f9', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{att.ficha_code}</code></td>
                        <td>{att.ambiente_name}</td>
                        <td>
                          <span className={`badge-status ${
                            att.estado === 'Presente' ? 'badge-presente' :
                            att.estado.includes('Tarde') ? 'badge-tarde' : 'badge-justificado'
                          }`}>
                            {att.estado}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{att.horas}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
