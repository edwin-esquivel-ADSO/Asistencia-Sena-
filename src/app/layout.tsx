import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SENA - Sistema de Gestión de Asistencia MVP',
  description: 'Sistema oficial de gestión y registro de asistencia con QR y validación de ubicación del SENA.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  );
}
