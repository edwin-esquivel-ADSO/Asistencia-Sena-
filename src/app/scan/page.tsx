'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useRouter } from 'next/navigation';
import { Camera, QrCode, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CameraScannerPage() {
  const router = useRouter();
  const [scanResult, setScanResult] = useState<string | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        setScanResult(decodedText);
        scanner.clear();

        // Parse relative path safely to stay on the active domain
        let targetPath = decodedText;
        try {
          if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
            const parsedUrl = new URL(decodedText);
            targetPath = parsedUrl.pathname + parsedUrl.search;
          }
        } catch (e) {}

        if (targetPath.includes('/aprendiz/register')) {
          router.push(targetPath);
        } else if (targetPath.includes('token=')) {
          const tokenMatch = targetPath.match(/token=([^&]+)/);
          if (tokenMatch) {
            router.push(`/aprendiz/register?token=${tokenMatch[1]}`);
          }
        } else {
          window.location.href = targetPath;
        }
      },
      (error) => {
        // quiet scanning errors
      }
    );

    return () => {
      try {
        scanner.clear();
      } catch (e) {}
    };
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#cbd5e1', textDecoration: 'none', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          <ArrowLeft size={16} /> Volver al Inicio
        </Link>

        <div style={{ background: 'rgba(255, 255, 255, 0.95)', color: '#0f172a', borderRadius: '24px', padding: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'inline-flex', padding: '0.6rem', borderRadius: '14px', background: 'rgba(57, 169, 0, 0.1)', color: '#39a900', marginBottom: '0.5rem' }}>
              <Camera size={36} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Escáner de Cámara QR</h1>
            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Apunta la cámara de tu dispositivo hacia el código QR de asistencia.
            </p>
          </div>

          <div id="reader" style={{ width: '100%', minHeight: '300px', borderRadius: '16px', overflow: 'hidden' }}></div>

          {scanResult && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', color: '#166534' }}>
              <strong>¡Código QR detectado!</strong>
              <p style={{ fontSize: '0.85rem', marginTop: '0.25rem', wordBreak: 'break-all' }}>{scanResult}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
