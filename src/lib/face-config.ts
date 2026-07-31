// Configuración del módulo de verificación facial MVP
export const FACE_CONFIG = {
  // Umbral de coincidencia euclidiana para face-api (menor valor = mayor similitud)
  // Normalmente <= 0.55 - 0.60 se considera el mismo rostro.
  SIMILARITY_THRESHOLD: 0.55,
  MAX_FAILED_ATTEMPTS: 3,
  CONSENT_VERSION: 'v1.0-2026',
};
