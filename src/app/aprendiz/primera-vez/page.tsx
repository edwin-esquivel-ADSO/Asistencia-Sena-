'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Shield, AlertTriangle, Check, User, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function AprendizPrimeraVezPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [fullName, setFullName] = useState('');
  const [document, setDocument] = useState('');
  const [fichas, setFichas] = useState<any[]>([]);
  const [selectedFicha, setSelectedFicha] = useState('');
  const [biometricConsent, setBiometricConsent] = useState(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Recuperar datos temporales almacenados
    const storedDoc = sessionStorage.getItem('temp_aprendiz_doc');
    const storedName = sessionStorage.getItem('temp_aprendiz_name');
    if (storedDoc) setDocument(storedDoc);
    if (storedName) setFullName(storedName);

    // Cargar fichas disponibles
    fetch('/api/instructor/options')
      .then(res => res.json())
      .then(data => {
        if (data.fichas) setFichas(data.fichas);
      })
      .catch(console.error);
  }, []);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      setError('No se pudo acceder a la cámara. Verifique que tenga una cámara conectada y conceda los permisos en su navegador.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const handleRegister = async (manualReview: boolean = false) => {
    setError(null);

    if (!document.trim() || !fullName.trim() || !selectedFicha) {
      setError('Por favor complete su nombre, documento y seleccione su ficha.');
      return;
    }

    if (!manualReview && !biometricConsent) {
      setError('Debe aceptar la autorización de tratamiento de datos biométricos.');
      return;
    }

    if (!manualReview && !capturedImage) {
      setError('Por favor capture una foto de su rostro frente a la cámara.');
      return;
    }

    setLoading(true);

    try {
      let facePublicId = null;

      // Carga firmada a Cloudinary si se proporciona captura facial
      if (!manualReview && capturedImage) {
        // 1. Obtener firma del servidor
        const signRes = await fetch('/api/cloudinary/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: 'sena_biometrics' })
        });
        const signData = await signRes.json();

        if (!signRes.ok) {
          throw new Error(signData.error || 'Error al obtener firma de carga.');
        }

        // 2. Subir directo a Cloudinary usando la firma
        const cloudFormData = new FormData();
        cloudFormData.append('file', capturedImage);
        cloudFormData.append('api_key', signData.api_key);
        cloudFormData.append('timestamp', signData.timestamp);
        cloudFormData.append('signature', signData.signature);
        cloudFormData.append('folder', signData.folder);
        cloudFormData.append('public_id', signData.public_id);
        cloudFormData.append('type', 'authenticated');

        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${signData.cloud_name}/image/upload`, {
          method: 'POST',
          body: cloudFormData
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error('Error al subir la imagen facial a Cloudinary.');
        }
        facePublicId = uploadData.public_id;
      }

      // 3. Registrar aprendiz en la base de datos
      const regRes = await fetch('/api/aprendiz/register-first-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: document.trim(),
          full_name: fullName.trim(),
          ficha_id: Number(selectedFicha),
          biometric_consent: biometricConsent,
          face_asset_public_id: facePublicId,
          manual_review_requested: manualReview
        })
      });

      const regData = await regRes.json();

      if (!regRes.ok) {
        setError(regData.error || 'Error completando el registro.');
      } else {
        router.push(regData.redirect || '/aprendiz/dashboard');
      }

    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado al procesar el registro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '650px', margin: '0 auto' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <Link href="/aprendiz/acceso" style={{ color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
            <ArrowLeft size={16} /> Volver a Validación de Identidad
          </Link>
        </div>

        <div className="glass-card" style={{ padding: '2.5rem', background: '#ffffff', borderRadius: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ background: '#e8f5e9', display: 'inline-flex', padding: '0.75rem', borderRadius: '16px', color: '#39a900', marginBottom: '0.75rem' }}>
              <User size={32} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
              Registro Inicial de Aprendiz
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Asóciese a su ficha de formación y configure su verificación facial de asistencia.
            </p>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Nombre Completo *</label>
            <input type="text" className="form-input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Número de Documento *</label>
            <input type="text" className="form-input" value={document} onChange={(e) => setDocument(e.target.value)} required />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Seleccione su Ficha de Formación *</label>
            <select className="form-select" value={selectedFicha} onChange={(e) => setSelectedFicha(e.target.value)} required>
              <option value="">-- Seleccionar Ficha --</option>
              {fichas.map(f => (
                <option key={f.id} value={f.id}>{f.code} - {f.program_name}</option>
              ))}
            </select>
          </div>

          {/* Sección Captura de Cámara */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Camera size={18} style={{ color: '#39a900' }} /> Fotografía de Referencia Facial (MVP)
            </h2>

            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.75rem', fontSize: '0.825rem', color: '#1e40af', marginBottom: '1rem' }}>
              <strong>Instrucciones:</strong> Ubíquese frente a la cámara, con el rostro centrado, sin tapabocas ni gafas oscuras y con buena iluminación.
            </div>

            <div style={{ textAlign: 'center', minHeight: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
              {!cameraActive && !capturedImage && (
                <button type="button" onClick={startCamera} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Camera size={18} /> Activar Cámara
                </button>
              )}

              <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxHeight: '280px', display: cameraActive ? 'block' : 'none' }} />
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {cameraActive && (
                <button type="button" onClick={capturePhoto} className="btn-primary" style={{ position: 'absolute', bottom: '1rem', background: '#39a900' }}>
                  Tomar Foto
                </button>
              )}

              {capturedImage && !cameraActive && (
                <div style={{ width: '100%', position: 'relative' }}>
                  <img src={capturedImage} alt="Captura Rostro" style={{ width: '100%', maxHeight: '280px', objectFit: 'cover' }} />
                  <button type="button" onClick={startCamera} className="btn-secondary" style={{ position: 'absolute', bottom: '1rem', right: '1rem', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '0.8rem' }}>
                    <RefreshCw size={14} /> Repetir
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Consentimiento Biométrico Expreso */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
              <input
                id="biometricConsent"
                type="checkbox"
                checked={biometricConsent}
                onChange={(e) => setBiometricConsent(e.target.checked)}
                style={{ marginTop: '0.2rem', accentColor: '#39a900', width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="biometricConsent" style={{ fontSize: '0.825rem', color: '#334155', cursor: 'pointer', lineHeight: '1.5' }}>
                Autorizo de manera libre, previa, expresa e informada el tratamiento de mi imagen y datos biométricos exclusivamente para validar mi identidad en el sistema de asistencia académica SENA. Comprendo que puedo solicitar validación manual ante el instructor.
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => handleRegister(false)}
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }}
            >
              {loading ? 'Guardando Registro...' : 'Completar Registro Facial'}
            </button>

            <button
              type="button"
              onClick={() => handleRegister(true)}
              disabled={loading}
              className="btn-secondary"
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.875rem' }}
            >
              Solicitar Validación Manual por Instructor (Sin Cámara)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
