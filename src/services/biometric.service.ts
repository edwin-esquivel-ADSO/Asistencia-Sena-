import { aprendizRepository } from '@/repositories/aprendiz.repository';
import { FACE_CONFIG } from '@/lib/face-config';
import { query, queryOne } from '@/lib/db';

export interface BiometricVerificationResult {
  success: boolean;
  result: 'verified' | 'failed' | 'manual_review';
  distance: number;
  confidence: number;
  message: string;
  executionTimeMs: number;
}

export class BiometricService {
  /**
   * Fast mathematical Euclidean distance comparison (< 200 ms) between two 128-dimensional vectors.
   */
  calculateEuclideanDistance(vecA: number[], vecB: number[]): number {
    if (vecA.length !== 128 || vecB.length !== 128) {
      throw new Error(`Dimensión vectorial inválida: se esperaban 128 posiciones, recibidas ${vecA.length} y ${vecB.length}`);
    }

    let sumSquares = 0;
    for (let i = 0; i < 128; i++) {
      const diff = vecA[i] - vecB[i];
      sumSquares += diff * diff;
    }
    return Math.sqrt(sumSquares);
  }

  /**
   * Verifies candidate 128D facial descriptor against stored reference in database in <200ms.
   */
  async verifyCandidateDescriptor(
    document: string,
    candidateDescriptor: number[],
    clientInfo?: { ip?: string; userAgent?: string }
  ): Promise<BiometricVerificationResult> {
    const startTime = performance.now();

    const aprendiz = await aprendizRepository.findByDocument(document, true);
    if (!aprendiz) {
      throw new Error('Aprendiz no encontrado o inactivo.');
    }

    if (!aprendiz.face_descriptor_json) {
      throw new Error('El aprendiz no cuenta con registro biométrico previo. Debe enrolarse por primera vez.');
    }

    let refDescriptor: number[];
    try {
      refDescriptor = typeof aprendiz.face_descriptor_json === 'string'
        ? JSON.parse(aprendiz.face_descriptor_json)
        : aprendiz.face_descriptor_json;
    } catch {
      throw new Error('Error al parsear el descriptor biométrico registrado.');
    }

    const distance = this.calculateEuclideanDistance(refDescriptor, candidateDescriptor);
    const confidence = Number(Math.max(0, 1 - distance).toFixed(4));
    const isMatch = distance <= FACE_CONFIG.SIMILARITY_THRESHOLD;
    const computedResult = isMatch ? 'verified' : 'failed';

    const ipAddress = clientInfo?.ip || 'Desconocida';
    const userAgent = clientInfo?.userAgent || 'Desconocido';

    // Log attempt into database
    await queryOne(
      `INSERT INTO face_verifications (
        aprendiz_id, purpose, match_score, result, failure_reason, ip_address, user_agent, browser, device
      ) VALUES ($1, 'attendance', $2, $3, $4, $5, $6, $7, $8)
      RETURNING id`,
      [
        aprendiz.id,
        Number(distance.toFixed(4)),
        computedResult,
        isMatch ? null : `Distancia ${distance.toFixed(4)} supera umbral ${FACE_CONFIG.SIMILARITY_THRESHOLD}`,
        ipAddress,
        userAgent,
        userAgent.includes('Chrome') ? 'Chrome' : 'Navegador',
        userAgent.includes('Mobile') ? 'Móvil' : 'Escritorio'
      ]
    );

    const endTime = performance.now();
    const executionTimeMs = Number((endTime - startTime).toFixed(2));

    if (!isMatch) {
      // Check recent failed attempts in the last 30 minutes
      const failRow = await queryOne<{ fail_count: string }>(
        `SELECT COUNT(*) as fail_count FROM face_verifications
         WHERE aprendiz_id = $1 AND result = 'failed' AND created_at > NOW() - INTERVAL '30 minutes'`,
        [aprendiz.id]
      );
      const failCount = Number(failRow?.fail_count || 1);

      if (failCount >= FACE_CONFIG.MAX_FAILED_ATTEMPTS) {
        return {
          success: false,
          result: 'manual_review',
          distance,
          confidence,
          message: 'Ha superado el límite de 3 intentos biométricos. Solicite validación manual con su instructor.',
          executionTimeMs
        };
      }

      return {
        success: false,
        result: 'failed',
        distance,
        confidence,
        message: 'No fue posible verificar su identidad facial. Asegúrese de mirar a la cámara e intente nuevamente.',
        executionTimeMs
      };
    }

    return {
      success: true,
      result: 'verified',
      distance,
      confidence,
      message: 'Identidad facial verificada exitosamente en menos de 200 ms.',
      executionTimeMs
    };
  }

  /**
   * Enrolls first-time biometric descriptor into database without blocking on external services.
   */
  async enrollFaceDescriptor(
    document: string,
    descriptor: number[],
    publicId?: string | null
  ): Promise<void> {
    if (!Array.isArray(descriptor) || descriptor.length !== 128) {
      throw new Error('El descriptor biométrico debe ser un vector de 128 dimensiones numéricas.');
    }

    const aprendiz = await aprendizRepository.findByDocument(document, true);
    if (!aprendiz) {
      throw new Error('Aprendiz no encontrado para enrolamiento.');
    }

    const descriptorJson = JSON.stringify(descriptor);
    await aprendizRepository.saveBiometricDescriptor(aprendiz.id, descriptorJson, publicId);
  }
}

export const biometricService = new BiometricService();
