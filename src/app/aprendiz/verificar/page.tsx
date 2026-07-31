'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, ShieldCheck, ArrowLeft, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function AprendizVerificarPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [document, setDocument] = useState('');
  const [fullName, setFullName] = useState('');

  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);

  useEffect(() => {
    const storedDoc = sessionStorage.getItem('temp_aprendiz_doc');
    const storedName = sessionStorage.getItem('temp_aprendiz_name');
    if (storedDoc) setDocument(storedDoc);
    if (storedName) setFullName(storedName);
  }, []);

  const loadFaceModels = async () => {
    if (modelsLoaded) return true;
    setModelsLoading(true);
    setError(null);
    try {
      const faceapi = await import('@vladmandic/face-api');
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
      return true;
    } catch (err) {
      setError('No se pudieron cargar los modelos de reconocimiento facial. Verifique su conexión a internet.');
      return false;
    } finally {
      setModelsLoading(false);
    }
  };

  const startCamera = async () => {
    setError(null);
    const ok = await loadFaceModels();
    if (!ok) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      setError('No se pudo acceder a la cámara. Conceda los permisos requeridos.');
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

  const captureAndVerify = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setError(null);
    setLoading(true);

    try {
      const faceapi = await import('@vladmandic/face-api');
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas no disponible');

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(dataUrl);
      stopCamera();

      // Detectar rostro y extraer descriptor
      const detection = await faceapi
        .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setError('No se detectó ningún rostro en la imagen. Asegure buena iluminación, mire de frente a la cámara e intente de nuevo.');
        setLoading(false);
        return;
      }

      const candidateDescriptor = Array.from(detection.descriptor);

      // Enviar descriptor al servidor para comparación contra la BD
      const res = await fetch('/api/aprendiz/verify-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document,
          full_name: fullName,
          candidate_descriptor: candidateDescriptor,
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || data.error || 'La verificación facial no fue exitosa. Puede intentar nuevamente o solicitar validación manual.');
      } else {
        router.push(data.redirect || '/aprendiz/dashboard');
      }

    } catch (err: any) {
      setError('Error al procesar la verificación facial. Verifique su conexión e intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualReview = async () => {
    setError(null);
    setLoading(true);
    try {
      await fetch('/api/aprendiz/verify-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document,
          full_name: fullName,
          manual_review_requested: true,
          failure_reason: 'Solicitud manual del aprendiz desde portal de acceso'
        })
      });
      setError('Solicitud de revisión manual registrada. Notifique a su instructor para validar su acceso.');
    } catch {
      setError('Error al registrar la solicitud. Contacte a su instructor directamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '550px', margin: '0 auto' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <Link href="/aprendiz/acceso" style={{ color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
            <ArrowLeft size={16} /> Volver a Acceso
          </Link>
        </div>

        <div className="glass-card" style={{ padding: '2.5rem', background: '#ffffff', borderRadius: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ background: '#e8f5e9', display: 'inline-flex', padding: '0.75rem', borderRadius: '16px', color: '#39a900', marginBottom: '0.75rem' }}>
              <ShieldCheck size={32} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
              Verificación Facial de Identidad
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Confirme su rostro frente a la cámara para ingresar a su panel personal
            </p>
            {fullName && (
              <div style={{ marginTop: '0.75rem', padding: '0.5rem 1rem', background: '#f0fdf4', borderRadius: '8px', fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>
                Aprendiz: {fullName}
              </div>
            )}
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.875rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <span>{error}</span>
            </div>
          )}

          {modelsLoading && (
            <div style={{ textAlign: 'center', padding: '1rem', background: '#f0f9ff', borderRadius: '12px', marginBottom: '1rem', fontSize: '0.875rem', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              Cargando modelos de reconocimiento facial...
            </div>
          )}

          <div style={{ background: '#000', borderRadius: '16px', overflow: 'hidden', minHeight: '260px', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
            {!cameraActive && !capturedImage && !modelsLoading && (
              <button type="button" onClick={startCamera} className="btn-primary">
                <Camera size={18} style={{ marginRight: '0.5rem' }} /> Activar Cámara
              </button>
            )}

            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxHeight: '300px', display: cameraActive ? 'block' : 'none' }} />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {cameraActive && !loading && (
              <button type="button" onClick={captureAndVerify} className="btn-primary" style={{ position: 'absolute', bottom: '1rem' }}>
                <ShieldCheck size={18} style={{ marginRight: '0.4rem' }} /> Verificar Rostro
              </button>
            )}

            {capturedImage && !cameraActive && (
              <div style={{ width: '100%', position: 'relative' }}>
                <img src={capturedImage} alt="Captura Facial" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover' }} />
                {!loading && (
                  <button type="button" onClick={() => { setCapturedImage(null); setError(null); startCamera(); }} className="btn-secondary" style={{ position: 'absolute', bottom: '1rem', right: '1rem', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '0.8rem' }}>
                    <RefreshCw size={14} /> Nueva Captura
                  </button>
                )}
              </div>
            )}

            {loading && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                <Loader2 size={40} style={{ color: '#39a900', animation: 'spin 1s linear infinite' }} />
                <p style={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: 600 }}>Analizando rostro...</p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={handleManualReview}
              disabled={loading}
              className="btn-secondary"
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.875rem' }}
            >
              Solicitar Validación Manual ante Instructor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
