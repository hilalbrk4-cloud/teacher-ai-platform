import { formatCurriculumTag } from "@/lib/curriculum/catalog";
import type { LessonPlanCurriculumContext } from "@/types/curriculum";
import { SLIDE_ICONS, type PresentationFormInput, type PresentationPrompt, type PresentationType, type SlideCount } from "@/types/presentation";

/** Sunum türüne göre en az etkinlik (2 dakikalık süreli görev) slaytı sayısı. */
export function requiredActivitySlides(type: PresentationType, count: SlideCount): number {
  if (type === "tartisma") return count === 8 ? 3 : 2;
  return count === 8 ? 2 : 1;
}

/** Bundan fazla çıktı seçilirse sunum en kritik 3 tanesine odaklanır. */
export const MAX_OUTCOMES_IN_FOCUS = 3;

const TYPE_GUIDE: Record<PresentationType, { label: string; guide: string }> = {
  yeniKonu: {
    label: "Yeni Konu (Keşif ve Görsel Ağırlıklı)",
    guide:
      "Konu ilk kez işleniyor. Kapak slaytı şaşırtıcı bir görsel ve merak sorusuyla açılsın; kavramlar görsel üzerinden, " +
      "\"Ne görüyorsunuz?\" sorularıyla keşfettirilsin; metin en aza insin. Son slayt kısa bir özet ya da çıkış sorusu olsun.",
  },
  pekistirme: {
    label: "Ders Sonu Pekiştirme",
    guide:
      "Konu işlendi, şimdi pekiştiriliyor. Ana kavramları karşılaştırmalı ve kısa tekrar et, yaygın bir kavram yanılgısını " +
      "görsel üzerinden düzelt, hızlı etkinliklerle kontrol et. Son slayt çıkış sorusu olsun.",
  },
  tartisma: {
    label: "Sınıf İçi Tartışma & Etkinlik",
    guide:
      "Ders tartışma ve etkinlik ağırlıklı. Görsellerle tartışma soruları aç, farklı bakış açılarını karşılaştırt, ikili/" +
      "dörtlü grup görevleri ver. Son slayt tartışmanın sonucunu toparlasın.",
  },
};

export function presentationTypeLabel(type: PresentationType): string {
  return TYPE_GUIDE[type].label;
}

function curriculumBlock(curriculum: LessonPlanCurriculumContext): string {
  const outcomes = curriculum.outcomes.map((outcome) => `  - ${outcome.code} — ${outcome.text}`).join("\n");
  const focus =
    curriculum.outcomes.length > MAX_OUTCOMES_IN_FOCUS
      ? `- ${curriculum.outcomes.length} çıktı seçildi; sunumu en kritik ${MAX_OUTCOMES_IN_FOCUS} tanesine odakla ve yalnızca onları slaytlara bağla.`
      : "- Seçilen her çıktı en az bir slaytın \"outcomeCodes\" alanında yer almalı.";
  return [
    `MEB RESMİ ÖĞRENME ÇIKTILARI (${curriculum.unit} › ${curriculum.topic}):`,
    outcomes,
    curriculum.sdb.length > 0 ? `- İlgili SDB: ${curriculum.sdb.slice(0, 4).map(formatCurriculumTag).join(", ")}` : undefined,
    focus,
    "- \"outcomeCodes\" alanına yalnızca yukarıdaki kodları yaz; kapak ve özet slaytında boş bırakabilirsin.",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Sunum ve Sınıf İçi Etkinlik Oluşturucu prompt'u: akıllı tahtada
 * yansıtılacak, görsel ağırlıklı, az metinli slaytlar.
 */
export function buildPresentationPrompt(input: PresentationFormInput, curriculum?: LessonPlanCurriculumContext): PresentationPrompt {
  const guide = TYPE_GUIDE[input.type];
  const activities = requiredActivitySlides(input.type, input.slideCount);
  const instructions = [
    "ROL:\nTürkiye'de görev yapan, akıllı tahtada görsel ağırlıklı ders sunumları hazırlayan deneyimli bir öğretmen ve öğretim " +
      "tasarımcısısın. Slaytların okunmak için değil, sınıfla konuşmak için var: büyük görsel, az kelime, güçlü soru.",
    [
      "ÖĞRETMEN GİRDİLERİ:",
      `Ders: ${input.subject.trim()} · Sınıf: ${input.gradeLevel.trim()} · Konu: ${input.topic.trim()}`,
      `Sunum türü: ${guide.label}. ${guide.guide}`,
      `Slayt sayısı: TAM ${input.slideCount} (${input.slideCount === 5 ? "mikro sunum, yaklaşık 15 dakika" : "standart ders"}).`,
    ].join("\n"),
    curriculum ? curriculumBlock(curriculum) : "- Resmî kazanım veya öğrenme çıktısı kodu uydurma; \"outcomeCodes\" boş dizi olsun.",
    [
      "SLAYT YAPISI (ZORUNLU):",
      "- 1. slayt \"hero-visual\": tam ekran görsel + merak uyandıran başlık (kapak).",
      `- TAM ${activities} slayt "activity-timer" olsun: 2 dakikalık süreli sınıf içi görev. Diğer slaytlarda "activityPrompt" null.`,
      "- İçerik slaytlarında \"split-right-image\" ve \"split-left-image\" dönüşümlü kullan; aynı düzeni art arda üç kez kullanma.",
      "- \"title\": Türkçe, vurucu, EN FAZLA 5 kelime.",
      "- \"bullets\": en fazla 3 madde, her biri en fazla 10 kelime; tam cümle paragrafı yazma. Kapak slaytında en fazla 1 madde.",
      "- \"teacherNote\": öğretmenin sınıfa soracağı canlı, düşündürücü TEK soru (soru işaretiyle biter); tahtada görünmez. " +
        "Slaytın somut içeriğine bağlı olsun ve evet/hayır ile yanıtlanamasın; \"Hazır mısınız?\", \"…ne kadar önemli?\" gibi " +
        "genel veya retorik sorular yazma (ör. \"Bitki hücresi neden köşeli de hayvan hücresi yuvarlak görünür?\").",
      "- \"activityPrompt\" (yalnızca etkinlik slaytında): kalabalık sınıfta sıra arkadaşıyla 2 dakikada yapılabilecek somut görev " +
        "veya tartışma sorusu, en fazla 30 kelime.",
    ].join("\n"),
    [
      "GÖRSEL KURALLARI (ZORUNLU):",
      "- Her slaytta \"visual\" dolu olsun. Tür seçimi:",
      "  • \"photo\": gerçek dünya nesnesi/ortamı (ör. mikroskop altında soğan zarı).",
      "  • \"diagram_placeholder\": yapı, süreç, şema (ör. etiketli hücre çizimi, döngü).",
      `  • "icon_badge": soyut kavram veya etkinlik; "icon" alanını şu listeden seç: ${SLIDE_ICONS.join(", ")}.`,
      "- \"searchKeyword\": yalnızca İngilizce, 2-5 kelime, nokta atışı görsel arama terimi (ör. \"plant cell diagram labeled\", " +
        "\"onion skin cells microscope\", \"solar system planets\"). Türkçe karakter, noktalama kullanma.",
      "- Arama terimi mutlaka konunun SOMUT nesnesini içersin (\"plant cell\", \"onion skin\", \"chloroplast\"); " +
        "\"microscope observation biology\", \"science lesson\" gibi genel terimler alakasız görsel getirir, kullanma.",
      "- \"caption\": görselin altındaki Türkçe, merak uyandıran TEK cümlelik soru veya ipucu (en fazla 14 kelime).",
      "- \"icon\": her slaytta listeden bir ikon seç (photo/diagram slaytlarında yedek olarak kullanılır).",
    ].join("\n"),
    [
      "KALİTE:",
      `- İçerik ${input.gradeLevel.trim()} düzeyine uygun, bilimsel olarak doğru olsun; kavram yanılgısı oluşturma. ` +
        "Kısa maddelerde de terimleri doğru kullan (ör. kloroplast \"fotosentezle besin üretir\", mitokondri \"enerji açığa çıkarır\"; " +
        "\"kloroplast enerji üretir\" gibi kısaltmalar yanlıştır).",
      "- \"title\" alanında sunumun genel başlığını (en fazla 6 kelime) yaz.",
      "- Yalnızca istenen JSON alanlarını doldur.",
    ].join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    input,
    curriculum,
    allowedOutcomeCodes: curriculum?.outcomes.map((outcome) => outcome.code) ?? [],
    instructions,
  };
}
