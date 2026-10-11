import { NextResponse } from "next/server";

import { getCurriculumGrade } from "@/lib/curriculum/repository";

/**
 * Bir sınıf düzeyinin müfredat verisini (ünite → konu → resmî çıktılar)
 * döndürür. Veri derleme zamanında sabittir; tarayıcı önbelleğe alabilir.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const grade = getCurriculumGrade(id);
  if (!grade) {
    return NextResponse.json({ error: { code: "not_found", message: "Müfredat bulunamadı." } }, { status: 404 });
  }
  return NextResponse.json(grade, { headers: { "Cache-Control": "public, max-age=3600" } });
}
