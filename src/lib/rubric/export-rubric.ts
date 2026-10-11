import type { Rubric } from "@/types/rubric";

/**
 * Rubriği Word olarak indirir (tarayıcıda). `docx` yalnızca düğmeye
 * basıldığında yüklenir.
 */
export async function downloadRubricDocx(rubric: Rubric, kind: "rubrik" | "ogrenci"): Promise<string> {
  const { buildOfficialRubricDocument, buildStudentSheetDocument, packDocument, rubricFileName } = await import(
    "@/lib/rubric/rubric-docx"
  );
  const document_ = kind === "rubrik" ? buildOfficialRubricDocument(rubric) : buildStudentSheetDocument(rubric);
  const blob = await packDocument(document_);
  const fileName = rubricFileName(rubric, kind);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return fileName;
}
