import QRCode from "qrcode";
import { NextResponse } from "next/server";

/**
 * GET /api/qr?url=... — génère un QR code SVG.
 * Ouvert (nécessaire pour la page de confirmation publique), mais restreint :
 * seules les URLs du site lui-même sont acceptées (anti "open relay").
 * Cache long : un QR pour un ticket ne change jamais.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const target = url.searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "Paramètre url requis" }, { status: 400 });
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL || url.origin;
  const decoded = decodeURIComponent(target);
  if (!decoded.startsWith(base + "/") && !decoded.startsWith("/")) {
    return NextResponse.json({ error: "URL non autorisée" }, { status: 400 });
  }

  const absolute = decoded.startsWith("/") ? base + decoded : decoded;
  const svg = await QRCode.toString(absolute, {
    type: "svg",
    margin: 1,
    width: 256,
    errorCorrectionLevel: "M",
  });

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
