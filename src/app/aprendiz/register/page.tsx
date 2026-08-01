'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { QrCode, MapPin, CheckCircle, AlertCircle, ShieldCheck, UserCheck, Clock, AlertTriangle, Camera, Loader2 } from 'lucide-react';

function AprendizRegisterForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const rotativeToken = searchParams.get('rot');

  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [document, setDocument] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(true);

  // Location State
  const [locationStatus, setLocationStatus] = useState<string>('Obteniendo ubicación GPS obligatoria...');
  const [lat, setLat] = useState<string>('Ubicación no disponible');
  const [lng, setLng] = useState<string>('Ubicación no disponible');
  const [acc, setAcc] = useState<string>('Ubicación no disponible');
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);

  // Face Recognition State
  const [faceStep, setFaceStep] = useState<'idle' | 'checking' | 'capture' | 'verify' | 'done'>('idle');
  const [faceStatus, setFaceStatus] = useState<string>('');
  const [faceError, setFaceError] = useState<string | null>(null);
  const [hasRegisteredFace, setHasRegisteredFace] = useState<boolean | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setSessionError('El enlace escaneado no contiene un token válido.');
      setLoadingSession(false);
      return;
    }

    fetchSessionInfo(token);
    requestGeolocation();
  }, [token]);

  const fetchSessionInfo = async (t: string) => {
    try {
      const res = await fetch(`/api/aprendiz/session-info?token=${t}`);
      const data = await res.json();

      if (!res.ok || data.expired || data.error) {
        setSessionError(data.error || 'El código QR ha expirado (duración máxima 5 minutos) o fue cerrado.');
      } else {
        setSession(data.session);
      }
    } catch (err) {
      setSessionError('Error de red al verificar la sesión.');
    } finally {
      setLoadingSession(false);
    }
  };

  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Su navegador no soporta geolocalización.');
      setLocationGranted(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(6));
        setLng(position.coords.longitude.toFixed(6));
        setAcc(`${position.coords.accuracy.toFixed(1)} metros`);
        setLocationStatus(`Permiso concedido (Precisión: ±${position.coords.accuracy.toFixed(1)}m)`);
        setLocationGranted(true);
      },
      (error) => {
        setLocationGranted(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationStatus('Permiso de geolocalización DENEGADO. Active el GPS y conceda permisos para registrar.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationStatus('Información GPS no disponible en el dispositivo.');
            break;
          case error.TIMEOUT:
            setLocationStatus('Tiempo de espera agotado al consultar GPS.');
            break;
          default:
            setLocationStatus('No se pudo determinar la ubicación GPS.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  };

  const loadFaceModels = async () => {
    if (modelsLoaded) return true;
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
    } catch {
      setFaceError('No se pudieron cargar los modelos de reconocimiento facial. Verifique su conexión a internet.');
      return false;
    }
  };

  const startCamera = async () => {
    setFaceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch {
      setFaceError('No se pudo acceder a la cámara. Conceda los permisos requeridos.');
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

  // Step 1: Check if student has face registered when they click "Confirmar"
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setFaceError(null);

    if (!acceptTerms) {
      setSubmitError('Debe aceptar los términos de tratamiento de datos para registrar su asistencia.');
      return;
    }

    if (!fullName.trim() || !document.trim()) {
      setSubmitError('Por favor ingrese su Nombre Completo y Documento de Identidad.');
      return;
    }

    if (!locationGranted || lat === 'Ubicación no disponible') {
      setSubmitError('La ubicación GPS es obligatoria. Habilite el GPS en su celular y otorgue permisos al navegador para continuar.');
      return;
    }

    // Check if student exists and has face registered
    setFaceStep('checking');
    setFaceStatus('Verificando perfil biométrico...');

    try {
      const res = await fetch('/api/aprendiz/check-face-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document: document.trim() })
      });
      const data = await res.json();

      if (data.has_face) {
        // Student has face registered → verify
        setHasRegisteredFace(true);
        setFaceStep('verify');
        setFaceStatus('Tiene registro facial. Verifique su identidad con la cámara.');
        const ok = await loadFaceModels();
        if (ok) await startCamera();
      } else {
        // Student does NOT have face → capture for first time
        setHasRegisteredFace(false);
        setFaceStep('capture');
        setFaceStatus('No tiene registro facial previo. Capture su rostro para registrarse por primera vez.');
        const ok = await loadFaceModels();
        if (ok) await startCamera();
      }
    } catch {
      // If check fails, proceed without face (graceful degradation)
      setFaceStep('done');
      submitAttendance(null);
    }
  };

  // Step 2: Capture face and process
  const handleFaceCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setFaceError(null);
    setFaceStatus('Procesando rostro...');

    try {
      const faceapi = await import('@vladmandic/face-api');
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas no disponible');

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      stopCamera();

      const detection = await faceapi
        .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setFaceError('No se detectó ningún rostro. Asegure buena iluminación, mire de frente a la cámara e intente de nuevo.');
        await startCamera();
        return;
      }

      const descriptor = Array.from(detection.descriptor);

      if (hasRegisteredFace) {
        // Verify against stored descriptor
        setFaceStatus('Comparando rostro con el registro...');
        const verifyRes = await fetch('/api/aprendiz/verify-face', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document: document.trim(),
            full_name: fullName.trim(),
            candidate_descriptor: descriptor,
          })
        });
        const verifyData = await verifyRes.json();

        if (verifyData.success) {
          setFaceStep('done');
          setFaceStatus('✓ Identidad facial verificada');
          submitAttendance(descriptor);
        } else {
          setFaceError(verifyData.message || 'La verificación facial no fue exitosa. Intente de nuevo.');
          await startCamera();
        }
      } else {
        // First time registration — save face
        setFaceStatus('Registrando rostro por primera vez...');

        // Get image as base64 for Cloudinary upload
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);

        const registerRes = await fetch('/api/aprendiz/register-face', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document: document.trim(),
            full_name: fullName.trim(),
            face_descriptor: descriptor,
            face_image_base64: imageDataUrl,
          })
        });
        const registerData = await registerRes.json();

        if (registerData.success) {
          setFaceStep('done');
          setFaceStatus('✓ Rostro registrado y verificado por primera vez');
          submitAttendance(descriptor);
        } else {
          setFaceError(registerData.error || 'Error al registrar el rostro. Intente de nuevo.');
          await startCamera();
        }
      }
    } catch (err: any) {
      setFaceError('Error al procesar el reconocimiento facial. Intente de nuevo.');
      await startCamera();
    }
  };

  // Step 3: Submit attendance
  const submitAttendance = async (faceDescriptor: number[] | null) => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/aprendiz/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          rotative_token: rotativeToken,
          full_name: fullName.trim(),
          document: document.trim(),
          latitud: lat,
          longitud: lng,
          precision_gps: acc,
          location_status: locationStatus
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || 'Error al registrar la asistencia.');
      } else {
        setSubmitSuccess(data.message || '¡Asistencia registrada correctamente!');
      }
    } catch (err) {
      setSubmitError('Error de conexión al guardar la asistencia.');
    } finally {
      setSubmitting(false);
    }
  };

  // Skip face and submit directly
  const handleSkipFace = () => {
    setFaceStep('done');
    stopCamera();
    submitAttendance(null);
  };

  if (loadingSession) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '1rem' }}>
        <p style={{ fontSize: '1.1rem', color: '#64748b', fontWeight: 600 }}>Verificando Código QR SENA...</p>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '1rem' }}>
        <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '2.5rem', textAlign: 'center', background: '#ffffff' }}>
          <div style={{ color: '#ef4444', marginBottom: '1rem' }}>
            <AlertCircle size={56} style={{ margin: '0 auto' }} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
            Código QR Expirado / No Disponible (HTTP 410)
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            {sessionError}
          </p>
          <a href="/aprendiz/consulta" className="btn-secondary" style={{ width: '100%' }}>
            Consultar Mis Asistencias
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #092e20 100%)', padding: '2rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: '600px', width: '100%' }}>
        <div style={{ background: '#ffffff', borderRadius: '24px', padding: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>

          {/* Session Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
            <div style={{ display: 'inline-flex', padding: '0.6rem', borderRadius: '14px', background: 'rgba(57, 169, 0, 0.1)', color: '#39a900', marginBottom: '0.5rem' }}>
              <QrCode size={36} />
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
              Registro de Asistencia SENA
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
              Ficha: <strong>{session.ficha_code}</strong> | Ambiente: <strong>{session.ambiente_name}</strong> | Jornada: <strong>{session.jornada}</strong>
            </p>
            <p style={{ fontSize: '0.8rem', color: '#39a900', fontWeight: 600, marginTop: '0.2rem' }}>
              Instructor: {session.instructor_name}
            </p>
          </div>

          {/* Security & 5-minute Expiration Warning Banner */}
          <div style={{ background: '#fefce8', border: '1px solid #fef08a', padding: '0.75rem', borderRadius: '12px', marginBottom: '1.25rem', fontSize: '0.775rem', color: '#854d0e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} style={{ flexShrink: 0, color: '#ca8a04' }} />
            <span>
              <strong>Vigencia Estricta (5 Minutos):</strong> Código QR dinámico con verificación de ubicación GPS obligatoria y validación de geocerca del ambiente.
            </span>
          </div>

          {submitSuccess ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <CheckCircle size={64} style={{ color: '#39a900', margin: '0 auto 1rem' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                ¡Registro Completado!
              </h2>
              <p style={{ color: '#475569', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                {submitSuccess}
              </p>
              <a href="/aprendiz/consulta" className="btn-primary" style={{ width: '100%' }}>
                Ver Mi Historial de Asistencias
              </a>
            </div>
          ) : faceStep !== 'idle' && faceStep !== 'done' ? (
            /* FACE RECOGNITION STEP */
            <div>
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'inline-flex', padding: '0.5rem', borderRadius: '12px', background: 'rgba(57, 169, 0, 0.1)', color: '#39a900', marginBottom: '0.5rem' }}>
                  <Camera size={28} />
                </div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                  {hasRegisteredFace ? 'Verificación Facial' : 'Registro Facial (Primera Vez)'}
                </h2>
                <p style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '0.25rem' }}>
                  {faceStatus}
                </p>
              </div>

              {faceError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem', borderRadius: '12px', marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                  <span>{faceError}</span>
                </div>
              )}

              {faceStep === 'checking' && (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <Loader2 size={36} style={{ color: '#39a900', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                </div>
              )}

              {(faceStep === 'capture' || faceStep === 'verify') && (
                <div>
                  <div style={{ background: '#000', borderRadius: '16px', overflow: 'hidden', minHeight: '240px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                    <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxHeight: '280px', display: cameraActive ? 'block' : 'none' }} />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    {!cameraActive && (
                      <Loader2 size={28} style={{ color: '#39a900', animation: 'spin 1s linear infinite' }} />
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={handleFaceCapture}
                      disabled={!cameraActive}
                      className="btn-primary"
                      style={{ flex: 1, padding: '0.75rem', fontSize: '0.9rem' }}
                    >
                      <ShieldCheck size={16} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />
                      {hasRegisteredFace ? 'Verificar Rostro' : 'Capturar y Registrar Rostro'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleFormSubmit}>
              {submitError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.85rem', borderRadius: '12px', marginBottom: '1.25rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={18} />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Mandatory Geolocation Card */}
              <div style={{ background: locationGranted ? '#f0fdf4' : '#fffbe0', padding: '0.85rem', borderRadius: '12px', border: `1px solid ${locationGranted ? '#bbf7d0' : '#fef08a'}`, marginBottom: '1.25rem', fontSize: '0.825rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <MapPin size={20} style={{ color: locationGranted ? '#166534' : '#ca8a04', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <strong style={{ color: locationGranted ? '#166534' : '#854d0e' }}>
                    {locationGranted ? 'GPS Capturado Correctamente:' : 'GPS Obligatorio:'}
                  </strong>{' '}
                  {locationStatus}
                  {lat !== 'Ubicación no disponible' && (
                    <div style={{ fontSize: '0.75rem', color: '#15803d', marginTop: '0.1rem', fontWeight: 600 }}>
                      Coords: {lat}, {lng} ({acc})
                    </div>
                  )}
                </div>
                {!locationGranted && (
                  <button type="button" onClick={requestGeolocation} className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                    Reintentar GPS
                  </button>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="fullName">Nombre Completo del Aprendiz *</label>
                <input
                  id="fullName"
                  type="text"
                  className="form-input"
                  placeholder="Ej. Juan Andrés Pérez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="document">Documento de Identidad *</label>
                <input
                  id="document"
                  type="text"
                  className="form-input"
                  placeholder="Ej. 1098765432"
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  required
                />
              </div>

              <div style={{ margin: '1.25rem 0', padding: '0.75rem', background: '#f1f5f9', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                <input
                  id="acceptTerms"
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  style={{ marginTop: '0.2rem', accentColor: '#39a900', width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="acceptTerms" style={{ fontSize: '0.8rem', color: '#475569', cursor: 'pointer', lineHeight: '1.4' }}>
                  Autorizo la captura de mis datos personales, ubicación GPS e imagen facial para la verificación de asistencia en el ambiente del SENA.
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
                style={{ width: '100%', padding: '0.875rem', fontSize: '1rem' }}
              >
                {submitting ? 'Verificando y Registrando...' : 'Continuar con Verificación Facial'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

export default function AprendizRegisterPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <p style={{ fontSize: '1.1rem', color: '#64748b', fontWeight: 600 }}>Cargando Módulo de Registro SENA...</p>
      </div>
    }>
      <AprendizRegisterForm />
    </Suspense>
  );
}
