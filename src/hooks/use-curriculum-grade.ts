"use client";

import * as React from "react";

import type { CurriculumGradeData } from "@/types/curriculum";

/** Oturum boyunca her sınıf düzeyi bir kez indirilir. */
const gradeCache = new Map<string, Promise<CurriculumGradeData>>();

function loadCurriculumGrade(id: string): Promise<CurriculumGradeData> {
  let request = gradeCache.get(id);
  if (!request) {
    request = fetch(`/api/curriculum/${encodeURIComponent(id)}`).then((response) => {
      if (!response.ok) throw new Error(`Müfredat yüklenemedi (${response.status})`);
      return response.json() as Promise<CurriculumGradeData>;
    });
    // Başarısız istek önbellekte kalmasın; bir sonraki seçimde yeniden denensin.
    request.catch(() => gradeCache.delete(id));
    gradeCache.set(id, request);
  }
  return request;
}

export type CurriculumGradeState =
  | { status: "idle"; data?: undefined }
  | { status: "loading"; data?: undefined }
  | { status: "ready"; data: CurriculumGradeData }
  | { status: "error"; data?: undefined };

/** Eşleşen ders/sınıf kimliği değiştikçe ilgili müfredat verisini yükler. */
export function useCurriculumGrade(id: string | undefined): CurriculumGradeState {
  const [loaded, setLoaded] = React.useState<{ id: string; data?: CurriculumGradeData; failed?: boolean } | null>(null);

  React.useEffect(() => {
    if (!id) return;
    let active = true;
    loadCurriculumGrade(id).then(
      (data) => active && setLoaded({ id, data }),
      () => active && setLoaded({ id, failed: true })
    );
    return () => {
      active = false;
    };
  }, [id]);

  if (!id) return { status: "idle" };
  if (loaded?.id !== id) return { status: "loading" };
  return loaded.data ? { status: "ready", data: loaded.data } : { status: "error" };
}
