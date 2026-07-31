'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserCheck, ShieldCheck, ArrowLeft, AlertCircle, FileText } from 'lucide-react';
import Link from 'next/link';

export default function AprendizAccesoPage() {
  const router = useRouter();
  const [document, setDocument] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!document.trim() || !fullName.trim()) {
      setError('Por favor ingrese su nombre completo y número de documento.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/aprendiz/check-identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: document.trim(),
          full_name: fullName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al validar identidad');
      } else if (!data.exists) {
        setError(data.message || 'No existe un perfil registrado con este documento.');
      } else {
        sessionStorage.setItem('temp_aprendiz_doc', document.trim());
        sessionStorage.setItem('temp_aprendiz_name', fullName.trim());
        router.push(data.redirect || '/aprendiz/dashboard');
      }
    } catch (err: any) {
      setError('Error de conexión con el servidor. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #092e20 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem'
    }}>
      <div style={{ maxWidth: '480px', width: '100%' }}>
        <div style={{ marginBottom: '1rem' }}>
          <Link href="/login" style={{ color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', textDecoration: 'none' }}>
            <ArrowLeft size={16} /> Volver al Login de Instructor
          </Link>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(16px)',
          borderRadius: '24px',
          padding: '2.5rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #39a900 0%, #2e8b00 100%)',
              color: 'white',
              marginBottom: '1rem',
              boxShadow: '0 8px 20px rgba(57, 169, 0, 0.35)'
            }}>
              <UserCheck size={36} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
              Portal de Aprendices
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Ingrese su documento y nombre para verificar su perfil y asistencias
            </p>
          </div>

          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Nombre Completo *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej. Juan Pablo Perez"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Número de Documento *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej. 1098765432"
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }}
            >
              {loading ? 'Verificando...' : 'Continuar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
