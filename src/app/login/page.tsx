'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, UserCheck, FileText, CheckCircle2, AlertCircle, Sparkles, User } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [document, setDocument] = useState('');
  const [fullName, setFullName] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!acceptTerms) {
      setError('Debe aceptar la política de tratamiento de datos personales para continuar.');
      return;
    }

    if (!document.trim() || !fullName.trim()) {
      setError('Por favor ingrese su Número de Documento y Nombre Completo.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: document.trim(),
          full_name: fullName.trim(),
          accept_terms: acceptTerms
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión');
      } else if (data.success && data.redirect) {
        router.push(data.redirect);
        router.refresh();
      }
    } catch (err: any) {
      setError('Ocurrió un error de red al intentar conectar con el servidor.');
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
      <div style={{
        maxWidth: '1100px',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '2rem',
        alignItems: 'stretch'
      }}>

        {/* LEFT COLUMN: Login Form Panel (Acceso sin contraseña) */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(16px)',
          borderRadius: '24px',
          padding: '2.5rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
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
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em' }}>
              Asistencia SENA
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.925rem', marginTop: '0.25rem' }}>
              Portal de Ingreso Seguro (Acceso por Documento y Nombre)
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
              marginBottom: '1.5rem'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="fullName">Nombre Completo *</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="fullName"
                  type="text"
                  className="form-input"
                  placeholder="Ej. Carlos Mario Restrepo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  style={{ paddingLeft: '2.75rem' }}
                />
                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="document">Número de Documento *</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="document"
                  type="text"
                  className="form-input"
                  placeholder="Ej. 1000200300"
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  required
                  style={{ paddingLeft: '2.75rem' }}
                />
                <UserCheck size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              </div>
            </div>

            <div style={{
              margin: '1.25rem 0',
              padding: '0.75rem',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.6rem'
            }}>
              <input
                id="acceptTerms"
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                style={{ marginTop: '0.2rem', accentColor: '#39a900', width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="acceptTerms" style={{ fontSize: '0.825rem', color: '#475569', cursor: 'pointer', lineHeight: '1.4' }}>
                Acepto los términos de uso y autorizo el tratamiento de mis datos personales según la normativa vigente SENA (Ley 1581 de 2012).
              </label>
            </div>

            <button
              id="loginSubmitBtn"
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', padding: '0.875rem', fontSize: '1rem', marginTop: '0.5rem' }}
            >
              {loading ? 'Verificando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Legal & Privacy Side Panel */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          padding: '2.5rem',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ background: 'rgba(57, 169, 0, 0.2)', padding: '0.5rem', borderRadius: '12px', color: '#39a900' }}>
                <ShieldCheck size={28} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>
                  Aviso Legal y Tratamiento de Datos
                </h2>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Cumplimiento Ley 1581 de 2012
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem', color: '#cbd5e1', lineHeight: '1.6' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1rem', borderRadius: '12px', borderLeft: '3px solid #39a900' }}>
                <strong style={{ color: '#ffffff', display: 'block', marginBottom: '0.25rem' }}>
                  <FileText size={16} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'text-bottom' }} />
                  Protección de Datos Personales
                </strong>
                El SENA garantiza la confidencialidad y custodia segura de los nombres, identificaciones y registros institucionales capturados en este módulo de asistencia.
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1rem', borderRadius: '12px', borderLeft: '3px solid #38bdf8' }}>
                <strong style={{ color: '#ffffff', display: 'block', marginBottom: '0.25rem' }}>
                  <Sparkles size={16} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'text-bottom' }} />
                  Geolocalización y Registro Móvil
                </strong>
                El registro de presencia a través del código QR puede solicitar las coordenadas de geolocalización únicamente para verificar la presencialidad en el ambiente asignado.
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1rem', borderRadius: '12px', borderLeft: '3px solid #f59e0b' }}>
                <strong style={{ color: '#ffffff', display: 'block', marginBottom: '0.25rem' }}>
                  <CheckCircle2 size={16} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'text-bottom' }} />
                  Uso Exclusivo Académico
                </strong>
                Los registros generados sirven como soporte legal para el control de horas de formación, reportes de coordinación y expedición de excusas justificadas.
              </div>
            </div>
          </div>

          <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center', fontSize: '0.775rem', color: '#94a3b8' }}>
            Servicio Nacional de Aprendizaje SENA &copy; 2026. Todos los derechos reservados.
          </div>
        </div>

      </div>
    </div>
  );
}
