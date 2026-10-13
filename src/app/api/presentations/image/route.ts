import { NextResponse } from "next/server";

import { searchSlideImages } from "@/lib/presentation/image-search";
import { SLIDE_VISUAL_TYPES, type SlideVisualType } from "@/types/presentation";

export const runtime = "nodejs";

/** GET /api/presentations/image?q=plant+cell+diagram&type=diagram_placeholder → { images } */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim().toLowerCase();
  const type = searchParams.get("type") ?? "photo";
  if (!/^[a-z0-9 -]{2,80}$/.test(query) || !(SLIDE_VISUAL_TYPES as readonly string[]).includes(type)) {
    return NextResponse.json({ error: { code: "invalid_request", message: "Geçersiz görsel araması." } }, { status: 400 });
  }
  const images = await searchSlideImages(query, type as SlideVisualType);
  return NextResponse.json({ images }, { headers: { "Cache-Control": "public, max-age=3600" } });
}
