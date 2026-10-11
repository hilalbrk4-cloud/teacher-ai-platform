import JSZip from "jszip";
import { Packer } from "docx";
import { describe, expect, it } from "vitest";

import {
  buildMebPlanContent,
  extractExitTicket,
  lessonPlanDocxFileName,
} from "@/lib/lesson-planner/meb-plan-content";
import { buildMebPlanDocument } from "@/lib/lesson-planner/meb-plan-docx";
import { fiveETimeRanges } from "@/lib/lesson-planner/five-e";
import type { LessonPlan } from "@/types/lesson-planner";

const ranges = fiveETimeRanges(40);

const FOTOSENTEZ_5E: LessonPlan = {
  id: "plan-1",
  subject: "Fen Bilimleri",
  gradeLevel: "7. Sınıf",
  topic: "Fotosentez",
  duration: 40,
  generatedAt: "2026-10-11T10:00:00.000Z",
  model: "5e",
  skills: {
    conceptual: ["Gözlem yapma", "Veri toplama ve kaydetme"],
    socialEmotional: ["İş birliği"],
    dispositions: ["Merak"],
    values: ["Sorumluluk", "Duyarlılık"],
  },
  sections: [
    { key: "dersBilgileri", content: "Ders: Fen Bilimleri" },
    { key: "ogrenmeHedefleri", content: "1. Fotosentez için gerekli koşulları ilişkilendirir." },
    { key: "gerekliMalzemeler", content: "- Çim tohumu\n- Karbonat tableti" },
    { key: "derseHazirlik", content: "Bitki 3 gün karanlıkta bekletilir." },
    { key: "girme", content: "Bitkiler karanlıkta ne yapar?", timeRange: ranges.girme },
    { key: "kesfetme", content: "⭐ EduPilot Spark: Fotosentez İstasyonu\nAmaç: Koşulları keşfetmek.", timeRange: ranges.kesfetme },
    { key: "aciklama", content: "Işık + Su + Karbondioksit → Glikoz + Oksijen", timeRange: ranges.aciklama },
    { key: "derinlestirme", content: "Şehirde hava kirliliği tartışması.", timeRange: ranges.derinlestirme },
    {
      key: "degerlendirme",
      content:
        "Öğretmen grupları gözlem formuyla izler.\nÇıkış Bileti:\n1) Fotosentezin üç koşulu nedir?\n2) Evdeki bitkine ne sağlıyorsun?\n3) Aklımda kalan soru…\nBiletler kapıda toplanır.",
      timeRange: ranges.degerlendirme,
    },
    { key: "farklilastirma", content: "Zorlanan öğrenciler: görsel şema." },
    { key: "ogretmenNotlari", content: "📌 Dersten Önce: …" },
  ],
};

async function documentXml(plan: LessonPlan): Promise<string> {
  const buffer = await Packer.toBuffer(buildMebPlanDocument(buildMebPlanContent(plan, new Date(2026, 9, 11))));
  const zip = await JSZip.loadAsync(buffer);
  return zip.file("word/document.xml")!.async("string");
}

/** Word XML'deki görünen metin (run'lar birleşik). */
function visibleText(xml: string): string {
  return [...xml.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((match) => match[1]).join(" ");
}

describe("extractExitTicket", () => {
  it("numaralı maddeleri soru, numarasız satırları not olarak ayırır", () => {
    const ticket = extractExitTicket("Gözlem.\nÇıkış Bileti:\n1) A?\n2) B?\nBiletler toplanır.");
    expect(ticket.before).toEqual(["Gözlem."]);
    expect(ticket.questions).toEqual(["A?", "B?"]);
    expect(ticket.note).toEqual(["Biletler toplanır."]);
  });

  it("aynı satırdaki '1) … 2) …' maddelerini böler", () => {
    expect(extractExitTicket("Çıkış Bileti: 1) Bir cümleyle açıkla. 2) Örnek ver.").questions).toEqual([
      "Bir cümleyle açıkla.",
      "Örnek ver.",
    ]);
  });

  it("çıkış bileti yoksa tüm metin süreç değerlendirmesidir", () => {
    expect(extractExitTicket("Kısa soru-cevap.")).toEqual({ before: ["Kısa soru-cevap."], questions: [], note: [] });
  });
});

describe("MEB ders planı içeriği", () => {
  it("dosya adı [Ders]_[Konu]_Ders_Plani.docx biçimindedir", () => {
    expect(lessonPlanDocxFileName(FOTOSENTEZ_5E)).toBe("Fen_Bilimleri_Fotosentez_Ders_Plani.docx");
    expect(lessonPlanDocxFileName({ subject: "Türkçe", topic: "Söz/Sanatları?" })).toBe("Türkçe_SözSanatları_Ders_Plani.docx");
  });

  it("5E satırlarını süreleriyle ve çıkış biletini ayrı bölüm olarak üretir", () => {
    const content = buildMebPlanContent(FOTOSENTEZ_5E, new Date(2026, 9, 11));
    expect(content.processRows.map((row) => `${row.phase} ${row.time} ${row.minutes}`)).toEqual([
      "Girme 00–04 dk 4 dk",
      "Keşfetme 04–16 dk 12 dk",
      "Açıklama 16–24 dk 8 dk",
      "Derinleştirme 24–34 dk 10 dk",
      "Değerlendirme 34–40 dk 6 dk",
    ]);
    // Süreç gözlemi 5E'de yalnızca Değerlendirme satırında; Ölçme bölümünde tekrar edilmez.
    expect(content.processAssessment).toEqual([]);
    expect(content.processRows[4].content[0]).toBe("Öğretmen grupları gözlem formuyla izler.");
    expect(content.exitTicket.questions).toHaveLength(3);
    expect(content.info.find((item) => item.label === "Tarih")?.value).toBe("11.10.2026");
    expect(content.skills.map((group) => group.code)).toEqual(["KB", "SDB", "E", "D"]);
  });

  it("Word belgesi tüm resmî bölümleri ve imza alanını içerir", async () => {
    const text = visibleText(await documentXml(FOTOSENTEZ_5E));
    for (const expected of [
      "MİLLÎ EĞİTİM BAKANLIĞI",
      "FEN BİLİMLERİ DERSİ GÜNLÜK DERS PLANI",
      "Okul Adı",
      "Fen Bilimleri",
      "7. Sınıf",
      "40 dk",
      "Fotosentez",
      "11.10.2026",
      "TYMM BECERİLER ÖRGÜSÜ",
      "Veri toplama ve kaydetme",
      "5E UYGULAMA SÜRECİ",
      "1. Girme",
      "04–16 dk",
      "(12 dk)",
      "5. Değerlendirme",
      "ÖLÇME VE DEĞERLENDİRME",
      "1) Fotosentezin üç koşulu nedir?",
      "Ders Öğretmeni",
      "UYGUNDUR",
      "Okul Müdürü",
    ]) {
      expect(text).toContain(expected);
    }
    expect(text).not.toContain("⭐");
  });

  it("klasik planı Giriş / Gelişme / Sonuç satırlarıyla dışa aktarır", async () => {
    const classic: LessonPlan = {
      ...FOTOSENTEZ_5E,
      model: "klasik",
      skills: undefined,
      sections: [
        { key: "giris", content: "Giriş metni" },
        { key: "gelisme", content: "Gelişme metni" },
        { key: "sonuc", content: "Sonuç metni" },
        { key: "olcmeDegerlendirme", content: "Çıkış Bileti: 1) Soru?" },
      ],
    };
    const text = visibleText(await documentXml(classic));
    expect(text).toContain("UYGULAMA SÜRECİ");
    expect(text).not.toContain("5E UYGULAMA");
    expect(text).toContain("Gelişme metni");
    expect(text).toContain("1) Soru?");
  });
});
