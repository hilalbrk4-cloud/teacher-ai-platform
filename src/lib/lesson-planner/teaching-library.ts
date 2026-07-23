/**
 * Shared vocabulary for the "inspiring lesson" content requirements
 * (teaching strategies, rich activities, digital tools, Teacher Coach
 * labels, the EduPilot Spark marker). Both the real Prompt Builder
 * (`src/lib/ai/prompts/lesson-planner-prompt.ts`) and the mock generation
 * service (`src/lib/lesson-planner/mock-generation-service.ts`) import
 * from here so the two never drift into two different vocabularies for
 * the same concept. This file has no logic, no validation, and does not
 * touch the LessonPlan contract — it's plain shared string data.
 */

export const TEACHING_STRATEGIES = [
  "5E Modeli",
  "STEM",
  "STEAM",
  "Proje Tabanlı Öğrenme",
  "Probleme Dayalı Öğrenme",
  "Sorgulama Yoluyla Öğrenme",
  "Keşif Yoluyla Öğrenme",
  "İşbirlikli Öğrenme",
  "Öğrenme İstasyonları",
  "Jigsaw (Uzman Grupları)",
  "Galeri Yürüyüşü",
  "Düşün-Eşleş-Paylaş",
  "Balık Kavanozu Tartışması",
  "Münazara",
  "Drama",
  "Hikaye Anlatımı",
  "Rol Yapma",
  "Kaçış Odası (Escape Room)",
  "Gizem Kutusu",
  "Eğitsel Oyunlar",
  "Oyunlaştırma",
  "Simülasyon",
  "Uygulamalı Araştırma",
  "Doğa Gözlemi",
  "Deney",
  "Laboratuvar Etkinliği",
  "Kodlama Etkinliği",
  "Robotik Etkinliği",
  "Maker Etkinliği",
  "Tasarım Odaklı Düşünme",
  "Beyin Fırtınası",
  "Zihin Haritası",
  "Dijital Hikaye Anlatımı",
  "Podcast Etkinliği",
  "Video Analizi",
  "Akran Öğretimi",
] as const;

export const RICH_ACTIVITY_IDEAS = [
  "QR kod hazine avı",
  "sınıf içi meydan okuma",
  "STEM görevi",
  "deney",
  "rol yapma",
  "mini yarışma",
  "galeri yürüyüşü",
  "tartışma çemberi",
  "yaratıcı tasarım etkinliği",
  "gizem oyunu",
  "gözlem etkinliği",
  "açık hava görevi",
  "işbirlikli meydan okuma",
  "yansıtma günlüğü",
  "çıkış bileti",
] as const;

export const DIGITAL_TOOL_SUGGESTIONS = [
  "Canva",
  "Kahoot",
  "Quizizz",
  "Wordwall",
  "LearningApps",
  "EBA",
  "GeoGebra",
  "PhET",
  "Tinkercad",
  "Scratch",
  "Padlet",
  "Google Earth",
] as const;

export const ASSESSMENT_TECHNIQUES = [
  "Çıkış Bileti",
  "Kahoot Quiz",
  "Rubrik",
  "Gözlem Kontrol Listesi",
  "Akran Değerlendirmesi",
  "Öz Değerlendirme",
  "Yansıtma Kartı",
  "Kavram Haritası",
  "Mini Performans Görevi",
  "Eşli Değerlendirme (Düşün-Eşleş-Paylaş)",
] as const;

/** The exact marker line the model (and the mock service) must use to open the EduPilot Spark activity in "gelisme". */
export const EDUPILOT_SPARK_MARKER = "⭐ EduPilot Spark:";

/** Idea pool EduPilot Spark should draw from — deliberately more specific/creative than the general RICH_ACTIVITY_IDEAS list. */
export const SPARK_IDEA_POOL = [
  "Drama",
  "STEM",
  "Deney",
  "Kaçış Odası (Escape Room)",
  "QR Kod Hazine Avı",
  "Hikaye Anlatımı",
  "Rol Yapma",
  "Canva",
  "Kahoot",
  "Quizizz",
  "Wordwall",
  "LearningApps",
  "Scratch",
  "Tinkercad",
  "Galeri Yürüyüşü",
  "Gizem Kutusu",
  "İşbirlikli Oyunlar",
  "Doğa Gözlemi",
  "Tasarım Meydan Okuması",
] as const;

export interface SparkFieldMeta {
  label: string;
  description: string;
}

/**
 * EduPilot Spark is a complete mini-activity, not a one-line suggestion.
 * These are the exact Turkish field labels — in order — that must follow
 * the `EDUPILOT_SPARK_MARKER` title line inside "gelisme".
 */
export const SPARK_FIELD_LABELS: readonly SparkFieldMeta[] = [
  { label: "Amaç", description: "Bu etkinliğin öğrenme hedefiyle bağlantısı." },
  { label: "Süre", description: "Tahmini süre (dakika)." },
  { label: "Gerekli Malzemeler", description: "Etkinlik için gereken malzemeler." },
  { label: "Uygulama Adımları", description: "Numaralandırılmış, adım adım uygulama talimatı." },
  { label: "Öğrenciler Neden Sevecek", description: "Öğrencilerin bu etkinliği neden keyifli bulacağı." },
  { label: "Beklenen Öğrenme Kazanımı", description: "Etkinlik sonunda öğrencinin ne kazanmış olacağı." },
];

export interface TeacherCoachLabelMeta {
  emoji: string;
  label: string;
  description: string;
}

/**
 * The nine Teacher Coach sub-topics, in the exact order, emoji, and exact
 * Turkish label text both the prompt and the mock service must use inside
 * the "ogretmenNotlari" section content, formatted as `emoji label: text`.
 * A future UI parser can split on `emoji + label + ":"` to render this as
 * a structured card — see Phase 2.
 */
export const TEACHER_COACH_LABELS: readonly TeacherCoachLabelMeta[] = [
  {
    emoji: "📌",
    label: "Dersten Önce",
    description: "Öğretmenin ders öncesinde hazırlaması gereken somut şeyler.",
  },
  {
    emoji: "💡",
    label: "Öğretmen İpucu",
    description: "Deneyimli bir öğretmenden pratik, işe yarar bir sınıf önerisi.",
  },
  {
    emoji: "⚠️",
    label: "Sık Görülen Yanlış Kavramlar",
    description: "Öğrencilerin bu konuda muhtemelen yanlış anlayacağı noktalar.",
  },
  {
    emoji: "❓",
    label: "Güçlü Sorular",
    description: "Ders sırasında sorulabilecek, düşündürücü bir soru.",
  },
  {
    emoji: "🔄",
    label: "B Planı",
    description: "Planlanan etkinlik uygulanamazsa kullanılacak alternatif bir etkinlik.",
  },
  {
    emoji: "🌍",
    label: "Gerçek Hayat Bağlantısı",
    description: "Bu konunun günlük hayatta neden önemli olduğu, somut bir örnekle.",
  },
  {
    emoji: "🏠",
    label: "Ev Uzantısı",
    description: "Öğrencinin ailesiyle birlikte yapabileceği basit, kısa bir etkinlik.",
  },
  {
    emoji: "📚",
    label: "Disiplinlerarası Bağlantı",
    description: "Bu dersin başka bir dersle nasıl ilişkilendirilebileceği.",
  },
  {
    emoji: "⭐",
    label: "Ek Zenginleştirme Görevi",
    description: "Hızlı bitiren öğrenciler için isteğe bağlı bir zenginleştirme görevi.",
  },
];
