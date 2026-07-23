import { LESSON_PLAN_SECTION_ORDER } from "@/types/lesson-planner";
import type {
  LessonPlan,
  LessonPlanPrompt,
  LessonPlanSectionKey,
} from "@/types/lesson-planner";
import { createLessonPlannerId } from "@/lib/lesson-planner/id";
import type {
  GenerateLessonPlanOptions,
  LessonPlanGenerationService,
} from "@/lib/lesson-planner/generation-service";
import {
  ASSESSMENT_TECHNIQUES,
  EDUPILOT_SPARK_MARKER,
  SPARK_IDEA_POOL,
  TEACHER_COACH_LABELS,
  TEACHING_STRATEGIES,
} from "@/lib/lesson-planner/teaching-library";

const STAGE_COUNT = 3;
const STAGE_DELAY_MS = 650;

const DEFAULT_MATERIALS = ["Ders kitabı", "Etkileşimli tahta", "Çalışma kâğıtları"];

const WARM_UP_OPENERS = [
  "Dersin başında öğrencilerin ilgisini çekmek için kısa bir soru-cevap etkinliği yapılır.",
  "Derse, öğrencilerin günlük yaşamından bir örnekle başlanır.",
  "Dersin girişinde kısa bir görsel veya kısa bir video ile merak uyandırılır.",
];

const CLOSING_OPENERS = [
  "Ders, öğrencilerle birlikte öğrenilenlerin kısaca özetlenmesiyle tamamlanır.",
  "Dersin sonunda öğrencilerden konuyu kendi cümleleriyle özetlemeleri istenir.",
  "Ders, öğrenilenlerin günlük hayatla ilişkilendirildiği kısa bir tartışmayla kapanır.",
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

function toBulletList(raw: string | undefined, fallback: string[]): string {
  const items = (raw ?? "")
    .split(/\r?\n|;|•/)
    .map((item) => item.trim())
    .filter(Boolean);

  const source = items.length > 0 ? items : fallback;
  return source.map((item) => `• ${item}`).join("\n");
}

function buildDersBilgileri(prompt: LessonPlanPrompt): string {
  return [
    `Ders: ${prompt.subject}`,
    `Sınıf düzeyi: ${prompt.gradeLevel}`,
    `Konu: ${prompt.topic}`,
    `Süre: ${prompt.durationMinutes} dakika`,
  ].join("\n");
}

function buildOgrenmeHedefleri(prompt: LessonPlanPrompt): string {
  return toBulletList(prompt.outcomes, [`${prompt.topic} konusunun temel kavramlarını açıklayabilme`]);
}

function buildGerekliMalzemeler(prompt: LessonPlanPrompt): string {
  return toBulletList(prompt.materials, DEFAULT_MATERIALS);
}

function buildDerseHazirlik(prompt: LessonPlanPrompt): string {
  const materialsNote = prompt.materials ?? "temel ders materyallerini";
  const seatingNote = prompt.refinements.includes("groupWork")
    ? "Sınıf, grup çalışmasına uygun şekilde küçük gruplar hâlinde düzenlenir."
    : "Sınıf düzeni etkinliğe uygun şekilde ayarlanır.";
  return `Öğretmen, ${prompt.topic} konusuna yönelik ${materialsNote} önceden hazırlar. ${seatingNote}`;
}

function buildGiris(prompt: LessonPlanPrompt, seed: number): string {
  const opener = WARM_UP_OPENERS[seed % WARM_UP_OPENERS.length];
  const hook = prompt.refinements.includes("warmUpActivity")
    ? ` Ardından, ${prompt.topic} konusuna dikkat çeken kısa bir giriş etkinliği uygulanır.`
    : "";
  return `${opener}${hook}`;
}

/**
 * EduPilot Spark is a complete mini-activity (title + six fields), never a
 * one-line suggestion — mirrors exactly what the real Prompt Builder asks
 * the model for, using the same field labels from teaching-library.ts so
 * mock and real output are structurally identical.
 */
function buildSparkBlock(prompt: LessonPlanPrompt, seed: number): string {
  const idea = SPARK_IDEA_POOL[seed % SPARK_IDEA_POOL.length];
  const title = `${idea}: ${prompt.topic} Kaşifleri`;

  return [
    `${EDUPILOT_SPARK_MARKER} ${title}`,
    `Amaç: Öğrencilerin ${prompt.topic} konusunu eğlenceli, etkileşimli bir deneyimle pekiştirmesi.`,
    "Süre: 10-15 dakika",
    `Gerekli Malzemeler: Kağıt, kalem ve varsa ${idea.toLowerCase()} için basit sınıf malzemeleri.`,
    "Uygulama Adımları: 1) Sınıfı küçük gruplara ayırın. " +
      `2) Her gruba ${prompt.topic} ile ilgili bir görev veya ipucu verin. ` +
      "3) Gruplar görevi tamamlayınca bulgularını kısaca sınıfla paylaşsın.",
    "Öğrenciler Neden Sevecek: Hareket edip birlikte çalışarak öğrenmek, sadece dinlemekten çok daha eğlenceli.",
    `Beklenen Öğrenme Kazanımı: ${prompt.topic} konusunu somut bir deneyimle pekiştirmiş olurlar.`,
  ].join("\n");
}

/**
 * Every "gelisme" section — mock or real AI — must end with one complete
 * EduPilot Spark activity, and (when the teacher hasn't explicitly picked
 * 5E) pick a varied strategy instead of always defaulting to 5E. Kept in
 * sync with the real Prompt Builder's equivalent requirements by sharing
 * the same vocabulary from teaching-library.ts.
 */
function buildGelisme(prompt: LessonPlanPrompt, seed: number): string {
  const groupWorkNote = prompt.refinements.includes("groupWork")
    ? "\n\nÖğrenciler küçük gruplara ayrılarak konuyla ilgili kısa bir grup çalışması yapar ve bulgularını sınıfla paylaşır."
    : "";

  const sparkBlock = `\n\n${buildSparkBlock(prompt, seed)}`;

  if (prompt.refinements.includes("fiveE")) {
    return (
      [
        `Girme: Öğrencilerin ${prompt.topic} hakkındaki ön bilgileri kısa bir soruyla ortaya çıkarılır.`,
        `Keşfetme: Öğrenciler, rehberli bir etkinlik ile konuyu kendi deneyimleriyle keşfeder.`,
        `Açıklama: Öğretmen, ${prompt.subject} dersine uygun terminolojiyle konuyu açıklar ve örneklerle pekiştirir.`,
        `Derinleştirme: Öğrenciler, öğrendiklerini yeni bir örnek veya problem üzerinde uygular.`,
        `Değerlendirme: Öğrencilerin kavrayış düzeyi kısa sorularla kontrol edilir.`,
      ].join("\n\n") +
      groupWorkNote +
      sparkBlock
    );
  }

  const strategy = TEACHING_STRATEGIES[(seed + 3) % TEACHING_STRATEGIES.length];

  return (
    `Ders, "${strategy}" yaklaşımıyla işlenir: öğretmen, ${prompt.topic} konusunu ${prompt.subject} dersinin ` +
    "kazanımlarına uygun somut bir etkinlikle ele alır ve öğrencilerin doğrudan uygulama yapmasına fırsat " +
    "tanır. Ardından öğrenciler, küçük bir görevle öğrendiklerini pekiştirir." +
    groupWorkNote +
    sparkBlock
  );
}

function buildSonuc(prompt: LessonPlanPrompt, seed: number): string {
  const closer = CLOSING_OPENERS[seed % CLOSING_OPENERS.length];
  return `${closer} ${prompt.topic} konusuyla ilgili öğrenme hedeflerine ulaşılıp ulaşılmadığı kısaca gözden geçirilir.`;
}

function buildOlcmeDegerlendirme(prompt: LessonPlanPrompt, seed: number): string {
  if (prompt.assessmentPreference) {
    return prompt.assessmentPreference;
  }
  const technique = ASSESSMENT_TECHNIQUES[seed % ASSESSMENT_TECHNIQUES.length];
  return `"${technique}" yöntemiyle öğrencilerin ${prompt.topic} konusunu ne ölçüde kavradığı kısaca kontrol edilir.`;
}

/** Concrete adaptations for three learner tiers, per the Part 5 differentiation requirement. */
function buildFarklilastirma(prompt: LessonPlanPrompt): string {
  const struggling = prompt.specialNeeds
    ? `Zorlanan öğrenciler: ${prompt.specialNeeds}`
    : "Zorlanan öğrenciler: Yönergeler sadeleştirilir, görsel destek ve ek süre sağlanır.";

  const average = prompt.studentLevel
    ? `Orta düzey öğrenciler: Etkinlikler ${prompt.studentLevel} seviyesine göre uygulanır.`
    : "Orta düzey öğrenciler: Standart etkinlik akışıyla devam edilir.";

  const advanced =
    "İleri düzey öğrenciler: Konuyu derinleştiren ek bir soru veya küçük bir araştırma görevi verilir.";

  const parts = [struggling, average, advanced];

  if (prompt.refinements.includes("inclusionAdaptation")) {
    parts.push(
      "Kaynaştırma öğrencileri için görsel destekli materyaller kullanılır, yönergeler sadeleştirilir ve ek süre tanınır."
    );
  }

  return parts.join("\n\n");
}

/** The nine Teacher Coach labels, filled with topic-aware mock guidance. Order, emoji and labels match teaching-library.ts exactly. */
function buildTeacherCoachContent(prompt: LessonPlanPrompt): string {
  const coachText: Record<string, string> = {
    "Dersten Önce": `${prompt.topic} konusuna özgü materyalleri (kartlar, görseller veya örnekler) önceden hazırlayın.`,
    "Öğretmen İpucu": "Anlatımı kısa tutup öğrencilerin aktif olduğu bölümlere daha çok zaman ayırın.",
    "Sık Görülen Yanlış Kavramlar": `Öğrenciler ${prompt.topic} konusunda sıkça kavram karmaşası yaşayabilir; temel terimleri örneklerle pekiştirin.`,
    "Güçlü Sorular": `"${prompt.topic} olmasaydı ne değişirdi?" gibi bir soru sınıfı düşünmeye teşvik eder.`,
    "B Planı": "Planlanan etkinlik işlemezse, aynı konuyu kısa bir sınıf tartışmasıyla işleyebilirsiniz.",
    "Gerçek Hayat Bağlantısı": `${prompt.topic} konusunun öğrencilerin günlük hayatındaki bir örnekle ilişkisini vurgulayın.`,
    "Ev Uzantısı": `Öğrenciler ailesiyle birlikte ${prompt.topic} ile ilgili kısa bir gözlem veya sohbet yapabilir.`,
    "Disiplinlerarası Bağlantı": `${prompt.topic} konusu, başka bir dersteki benzer bir kavramla ilişkilendirilebilir.`,
    "Ek Zenginleştirme Görevi": `Hızlı bitiren öğrenciler, ${prompt.topic} konusuyla ilgili küçük bir araştırma veya sunum hazırlayabilir.`,
  };

  return TEACHER_COACH_LABELS.map((item) => `${item.emoji} ${item.label}: ${coachText[item.label]}`).join("\n\n");
}

function buildOgretmenNotlari(prompt: LessonPlanPrompt): string {
  const intro = prompt.additionalNotes ? `${prompt.additionalNotes}\n\n` : "";
  return `${intro}${buildTeacherCoachContent(prompt)}`;
}

function buildSectionContent(
  key: LessonPlanSectionKey,
  prompt: LessonPlanPrompt,
  seed: number
): string {
  switch (key) {
    case "dersBilgileri":
      return buildDersBilgileri(prompt);
    case "ogrenmeHedefleri":
      return buildOgrenmeHedefleri(prompt);
    case "gerekliMalzemeler":
      return buildGerekliMalzemeler(prompt);
    case "derseHazirlik":
      return buildDerseHazirlik(prompt);
    case "giris":
      return buildGiris(prompt, seed);
    case "gelisme":
      return buildGelisme(prompt, seed);
    case "sonuc":
      return buildSonuc(prompt, seed);
    case "olcmeDegerlendirme":
      return buildOlcmeDegerlendirme(prompt, seed);
    case "farklilastirma":
      return buildFarklilastirma(prompt);
    case "ogretmenNotlari":
      return buildOgretmenNotlari(prompt);
    default:
      return "";
  }
}

export const mockLessonPlanGenerationService: LessonPlanGenerationService = {
  async generate(prompt: LessonPlanPrompt, options?: GenerateLessonPlanOptions): Promise<LessonPlan> {
    for (let stage = 0; stage < STAGE_COUNT; stage += 1) {
      options?.onProgress?.(stage);
      await delay(STAGE_DELAY_MS);
    }

    const seed = Math.floor(Math.random() * 1000);

    return {
      id: createLessonPlannerId("plan"),
      subject: prompt.subject,
      gradeLevel: prompt.gradeLevel,
      topic: prompt.topic,
      duration: prompt.durationMinutes,
      generatedAt: new Date().toISOString(),
      sections: LESSON_PLAN_SECTION_ORDER.map((key) => ({
        key,
        content: buildSectionContent(key, prompt, seed),
      })),
    };
  },
};
