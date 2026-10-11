import type { RubricTaskType, RubricType } from "@/types/rubric";

/**
 * Resmî belge ve prompt dili için görev / rubrik türü tanımları. Arayüz
 * etiketleri i18n sözlüğündedir; bunlar MEB belgesine yazılan Türkçe
 * karşılıklardır.
 */
export const TASK_TYPE_DEFINITIONS: Record<RubricTaskType, { label: string; focus: string }> = {
  proje: {
    label: "Proje Ödevi",
    focus:
      "planlama ve süreç yönetimi, araştırma ve kaynak kullanımı, içeriğin doğruluğu, özgünlük/yaratıcılık, ürünün sunumu",
  },
  sunum: {
    label: "Sunum / Canlandırma",
    focus: "içeriğin doğruluğu ve düzeni, sözlü ifade ve beden dili, görsel/yardımcı materyal, süre yönetimi, dinleyiciyle etkileşim",
  },
  deney: {
    label: "Deney / Rapor",
    focus:
      "hipotez/soru kurma, deney düzeneği ve güvenlik, veri toplama ve kaydetme, verileri yorumlama ve sonuç çıkarma, rapor yazımı",
  },
  grup: {
    label: "Grup Çalışması",
    focus: "görev paylaşımı ve sorumluluk, iletişim ve iş birliği, katkı dengesi, ortak ürünün niteliği, süreç içinde çatışma çözümü",
  },
  portfolyo: {
    label: "Portfolyo",
    focus: "ürün seçimi ve çeşitliliği, gelişimin görünürlüğü, öz yansıtma notları, düzen ve bütünlük, zaman içindeki ilerleme",
  },
};

export const RUBRIC_TYPE_DEFINITIONS: Record<RubricType, { label: string; documentTitle: string; rule: string }> = {
  analitik: {
    label: "Analitik Rubrik",
    documentTitle: "ANALİTİK DERECELENDİRME ÖLÇEĞİ (RUBRİK)",
    rule:
      "Her kriter ayrı puanlanır. Her kriter için seviye sayısı kadar, birbirinden gözlenebilir biçimde ayrışan seviye " +
      "tanımı yaz. \"holisticLevels\" boş dizi olmalı.",
  },
  butuncul: {
    label: "Bütüncül (Holistik) Rubrik",
    documentTitle: "BÜTÜNCÜL DERECELENDİRME ÖLÇEĞİ (RUBRİK)",
    rule:
      "Performans tek bir genel düzeyle puanlanır. \"holisticLevels\" dizisinde seviye sayısı kadar, tüm performansı " +
      "bütün olarak betimleyen düzey tanımı yaz (her biri birden fazla ölçütü bir arada anar). Kriterler yine de " +
      "yazılır: değerlendirmede dikkate alınacak ölçütler ve öğrenci kontrol listesi için kullanılır.",
  },
  akranOz: {
    label: "Akran / Öz Değerlendirme Formu",
    documentTitle: "ÖZ VE AKRAN DEĞERLENDİRME ÖLÇEĞİ",
    rule:
      "Öğrencinin kendini ve akranını değerlendireceği bir ölçek. Seviye tanımları öğretmen için yine resmî dilde, " +
      "ama öğrencinin gözlemleyebileceği davranışlara dayanır; öğrenci ölçütleri öz ve akran değerlendirmede aynen " +
      "kullanılacağı için hem \"sen\" hem de arkadaşına uygulanabilir olmalı. \"holisticLevels\" boş dizi olmalı.",
  },
};
