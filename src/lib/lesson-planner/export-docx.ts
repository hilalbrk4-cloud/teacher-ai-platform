import type { LessonPlan } from "@/types/lesson-planner";

/**
 * Planı MEB günlük ders planı formatında .docx olarak indirir. Tarayıcıda
 * çalışır; `docx` kütüphanesi yalnızca düğmeye basıldığında yüklenir, böylece
 * Ders Planlayıcı'nın ilk açılış paketi büyümez.
 */
export async function downloadLessonPlanDocx(plan: LessonPlan): Promise<string> {
  const [{ buildMebPlanContent, lessonPlanDocxFileName }, { packMebPlanDocx }] = await Promise.all([
    import("@/lib/lesson-planner/meb-plan-content"),
    import("@/lib/lesson-planner/meb-plan-docx"),
  ]);
  const blob = await packMebPlanDocx(buildMebPlanContent(plan));
  const fileName = lessonPlanDocxFileName(plan);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Bazı tarayıcılar indirmeyi click'ten sonra başlatır; URL'yi hemen bırakmak indirmeyi iptal edebilir.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return fileName;
}
