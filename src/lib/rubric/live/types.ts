/** Canlı Değerlendirme Modu: sınıf listesi ve öğrenci başına puanlama durumu. */

export interface LiveStudent {
  id: string;
  name: string;
  /** Okul numarası (e-Okul / Excel listesinde varsa). */
  no?: string;
}

export interface LiveScore {
  /** Analitik / öz-akran: kriter kimliği → seçilen seviye sırası (0 = en düşük). */
  levels: Record<string, number>;
  /** Bütüncül: seçilen genel düzey ve o düzeyin aralığındaki puan. */
  holisticLevel?: number;
  holisticScore?: number;
  feedback: string;
  /** Öğretmen geri bildirimi elle düzenlediyse otomatik metin artık üzerine yazılmaz. */
  feedbackEdited: boolean;
  /** Metnin kaynağı: kural tabanlı (otomatik), yapay zekâ ya da öğretmen. */
  feedbackSource?: "auto" | "ai" | "teacher";
}

export type LiveStatus = "waiting" | "partial" | "done";

export interface LiveSession {
  version: 1;
  rubricId: string;
  students: LiveStudent[];
  scores: Record<string, LiveScore>;
}
