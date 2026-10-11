import type { LessonPlanSkills } from "@/types/lesson-planner";

/**
 * Türkiye Yüzyılı Maarif Modeli (TYMM) Beceriler Örgüsü için sabit etiket
 * listeleri. Model plana bu listelerden seçer (JSON şemasında enum); resmî
 * beceri kodu (ör. "KB2.10") uydurmaz — numaralı kodlar ancak öğretmen
 * programdan girerse kullanılmalıdır.
 */
export const TYMM_SKILL_GROUPS = {
  conceptual: [
    "Gözlem yapma",
    "Sınıflandırma",
    "Karşılaştırma",
    "Çıkarım yapma",
    "Tahmin etme",
    "Sorgulama",
    "Bilgi toplama",
    "Veri toplama ve kaydetme",
    "Yorumlama",
    "Özetleme",
    "Hipotez kurma",
    "Deney yapma",
    "Problem çözme",
    "Eleştirel düşünme",
    "Yaratıcı düşünme",
    "Karar verme",
    "Sistem düşünme",
    "Bilimsel sorgulama",
  ],
  socialEmotional: [
    "Kendini tanıma",
    "Öz düzenleme",
    "Öz yansıtma",
    "İletişim",
    "İş birliği",
    "Sosyal farkındalık",
    "Uyum",
    "Esneklik",
    "Sorumlu karar verme",
  ],
  dispositions: [
    "Merak",
    "Sorgulama",
    "Analitiklik",
    "Açık fikirlilik",
    "Yaratıcılık",
    "Odaklanma",
    "Azim ve kararlılık",
    "Kendine güven",
    "Gerçeği arama",
    "Empati",
  ],
  values: [
    "Sorumluluk",
    "Saygı",
    "Duyarlılık",
    "Dürüstlük",
    "Adalet",
    "Yardımseverlik",
    "Sabır",
    "Tasarruf",
    "Sağlıklı yaşam",
    "Estetik",
  ],
} as const satisfies Record<keyof LessonPlanSkills, readonly string[]>;

/** Arayüzde ve prompt'ta gösterilen grup adları ve kısaltmaları. */
export const TYMM_SKILL_GROUP_LABELS: Record<keyof LessonPlanSkills, { short: string; label: string }> = {
  conceptual: { short: "KB", label: "Kavramsal Beceriler" },
  socialEmotional: { short: "SDB", label: "Sosyal-Duygusal Öğrenme Becerileri" },
  dispositions: { short: "E", label: "Eğilimler" },
  values: { short: "D", label: "Değerler" },
};

export const TYMM_SKILL_GROUP_ORDER: readonly (keyof LessonPlanSkills)[] = [
  "conceptual",
  "socialEmotional",
  "dispositions",
  "values",
];
