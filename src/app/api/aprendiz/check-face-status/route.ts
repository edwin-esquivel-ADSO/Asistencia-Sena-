import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { document } = body;

    if (!document) {
      return NextResponse.json({ has_face: false });
    }

    const aprendiz = await queryOne<any>(
      `SELECT id, face_descriptor_json, face_asset_public_id FROM aprendices WHERE document = $1 AND is_active = true LIMIT 1`,
      [String(document).trim()]
    );

    if (!aprendiz) {
      return NextResponse.json({ has_face: false, exists: false });
    }

    const hasFace = Boolean(aprendiz.face_descriptor_json) || Boolean(aprendiz.face_asset_public_id);

    return NextResponse.json({
      has_face: hasFace,
      exists: true,
      aprendiz_id: aprendiz.id
    });
  } catch (error: any) {
    console.error('Error checking face status:', error);
    return NextResponse.json({ has_face: false });
  }
}
