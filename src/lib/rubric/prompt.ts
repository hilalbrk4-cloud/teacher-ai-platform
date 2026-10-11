import { formatCurriculumTag } from "@/lib/curriculum/catalog";
import { RUBRIC_TYPE_DEFINITIONS, TASK_TYPE_DEFINITIONS } from "@/lib/rubric/definitions";
import { TYMM_SKILL_GROUPS } from "@/lib/lesson-planner/tymm-skills";
import type { LessonPlanCurriculumContext } from "@/types/curriculum";
import { RUBRIC_SCALE_LEVELS, type RubricFormInput, type RubricPrompt } from "@/types/rubric";

export const RUBRIC_CRITERIA_RANGE = { min: 4, max: 6 } as const;

/** Bundan fazla kazanım seçilirse model en kritik 3-5 tanesini temel alır (bkz. `requiredOutcomeCoverage`). */
export const MAX_FULLY_COVERED_OUTCOMES = 5;

const ROLE =
  "Türkiye'de görev yapan, Türkiye Yüzyılı Maarif Modeli (TYMM) ölçme ve değerlendirme yaklaşımını iyi bilen deneyimli " +
  "bir öğretmen ve ölçme-değerlendirme uzmanısın. Zümre dosyasına konabilecek resmî rubrikler hazırlarsın; aynı " +
  "ölçütleri öğrencinin kendi başına kullanabileceği sade bir kontrol listesine de dönüştürürsün.";

/** Kriterlerin bağlanabileceği resmî kodlar: seçilen çıktılar + SDB + Değerler + OB. */
export function allowedSkillCodes(curriculum: LessonPlanCurriculumContext | undefined): string[] {
  if (!curriculum) return [];
  return [
    ...curriculum.outcomes.map((outcome) => outcome.code),
    ...curriculum.sdb.map((tag) => tag.code),
    ...curriculum.values.map((tag) => tag.code),
    ...curriculum.literacy.map((tag) => tag.code),
  ];
}

function curriculumBlock(curriculum: LessonPlanCurriculumContext): string {
  const count = curriculum.outcomes.length;
  const tooMany = count > MAX_FULLY_COVERED_OUTCOMES;
  const previous = curriculum.program === "onceki";
  const outcomes = curriculum.outcomes
    .map((outcome) => {
      const components = outcome.components.map((component, index) => `      ${String.fromCharCode(97 + index)}) ${component}`);
      return [`  - ${outcome.code} — ${outcome.text}`, ...components].join("\n");
    })
    .join("\n");
  const tags = (title: string, list: LessonPlanCurriculumContext["sdb"]) =>
    list.length > 0 ? `- ${title}: ${list.map(formatCurriculumTag).join(", ")}` : undefined;
  return [
    `MEB RESMİ ÖĞRENME ÇIKTILARI VE BECERİLER (${curriculum.unit} › ${curriculum.topic}):`,
    outcomes,
    tags("Sosyal-duygusal öğrenme becerileri (SDB)", curriculum.sdb),
    tags("Değerler (D)", curriculum.values),
    tags("Okuryazarlık becerileri (OB)", curriculum.literacy),
    curriculum.assessment.length > 0
      ? `- Programın önerdiği öğrenme kanıtları: ${curriculum.assessment.join(" ").slice(0, 500)}`
      : undefined,
    "KRİTER HAVUZU KURALLARI:",
    "- Her kriterin \"skillCodes\" alanına, o kriterin gerçekten ölçtüğü kodları yalnızca yukarıdaki listeden yaz.",
    tooMany
      ? `- ${count} kazanım seçildi; ${RUBRIC_CRITERIA_RANGE.min}-${RUBRIC_CRITERIA_RANGE.max} kriterle hepsi ölçülemez. ` +
        "En kritik 3-5 kazanımı temel alarak rubrik oluştur: görev türüyle en doğrudan ölçülebilecek olanları seç ve " +
        "yalnızca onları kriterlere bağla; diğerlerini zorla kriterlere ekleme."
      : "- Yukarıdaki HER öğrenme çıktısı kodu en az bir kriterde yer almalı; süreç bileşenleri (a, b, c…) kriterlere " +
        "dönüştürülmeli.",
    previous
      ? "- Bu sınıf düzeyi henüz TYMM'ye geçmemiştir (önceki program): SDB, Değer ve KB kodu zorunlu değildir; kriterleri " +
        "kazanımlara ve görev türüne göre kur."
      : "- En az bir kriter bir SDB kodunu, en az bir kriter bir Değer (D) kodunu gözlenebilir davranışla ölçmeli " +
        "(ör. iş birliği → görev paylaşımı ve katkı; sorumluluk → teslim ve süre yönetimi).",
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

/**
 * Rubrik Oluşturucu prompt'u. Saf fonksiyon; resmî müfredat bağlamı sunucu
 * tarafından havuzdan çözülerek parametre olarak verilir.
 */
export function buildRubricPrompt(input: RubricFormInput, curriculum?: LessonPlanCurriculumContext): RubricPrompt {
  const levels = RUBRIC_SCALE_LEVELS[input.scale];
  const task = TASK_TYPE_DEFINITIONS[input.taskType];
  const type = RUBRIC_TYPE_DEFINITIONS[input.rubricType];
  const allowed = allowedSkillCodes(curriculum);

  const instructions = [
    `ROL:\n${ROLE}`,
    [
      "ÖĞRETMEN GİRDİLERİ:",
      `Ders: ${input.subject.trim()}`,
      `Sınıf düzeyi: ${input.gradeLevel.trim()}`,
      `Konu: ${input.topic.trim()}`,
      `Görev türü: ${task.label} (tipik ölçüt alanları: ${task.focus})`,
      `Rubrik türü: ${type.label}`,
      `Puan skalası: ${input.scale} seviye, en düşükten en yükseğe: ${levels.map((level) => level.label).join(" → ")}`,
      input.taskDescription.trim() ? `Öğretmenin görev açıklaması: ${input.taskDescription.trim()}` : undefined,
    ]
      .filter(Boolean)
      .join("\n"),
    curriculum ? curriculumBlock(curriculum) : undefined,
    [
      "RUBRİK YAPISI:",
      `- ${RUBRIC_CRITERIA_RANGE.min}-${RUBRIC_CRITERIA_RANGE.max} kriter yaz; her biri tek bir gözlenebilir performans boyutunu ölçsün, ` +
        "kriterler birbiriyle örtüşmesin.",
      `- ${type.rule}`,
      "- \"weight\": kriterin göreli önemi (1-10 arası tam sayı). Puanları EduPilot hesaplar; toplamı 100 yapmaya çalışma.",
      `- "conceptualSkills": kriterin işlettiği kavramsal beceriler (KB), yalnızca şu listeden 1-2 etiket: ${TYMM_SKILL_GROUPS.conceptual.join(", ")}.`,
      curriculum ? undefined : "- Resmî kazanım/öğrenme çıktısı kodu veya beceri kodu uydurma; kod yazma.",
    ]
      .filter(Boolean)
      .join("\n"),
    [
      "ÇİFT GÖRÜNÜM (ZORUNLU):",
      "Her kriter için iki ayrı metin yaz:",
      "1) \"teacherCriterion\" — MEB zümre dosyasına uygun resmî ve akademik dil:",
      "   - \"title\": kısa ölçüt adı (ör. \"Bilimsel Süreç Becerilerini Kullanma\").",
      "   - \"description\": ölçütün neyi değerlendirdiğini 1 cümlede, üçüncü tekil kişiyle (\"Öğrenci … \") açıkla.",
      `   - "levels": TAM ${input.scale} seviye tanımı, en düşükten en yükseğe (${levels.map((level) => level.label).join(", ")}). ` +
        "Seviyeler gözlenebilir ölçütle (sayı, nitelik, bağımsızlık derecesi) ayrışsın; \"iyi yapar / kötü yapar\" gibi " +
        "belirsiz ifade, soru cümlesi ve \"sen\" dili kullanma.",
      "2) \"studentFriendlyCriterion\" — öğrencinin ve akranının anlayacağı \"sen diliyle\" kontrol ölçütü:",
      "   - \"question\": evet/hayır ile yanıtlanabilen, en fazla 12 kelimelik, soru işaretiyle biten soru " +
        "(ör. \"Kaynaklarını doğru gösterdin mi?\", \"Verilerini tabloya düzenli kaydettin mi?\"). Teknik terim, kod, " +
        "\"öğrenci\" kelimesi kullanma.",
      "   - \"hint\": kontrol ederken bakacağı somut ipucu, tek kısa cümle, sen diliyle (ör. \"Kaynakçanı ödevinin sonuna ekle.\").",
      "- \"taskTitle\": görevin kısa adı; \"teacherTaskSummary\": görevin resmî tanımı (1-2 cümle); " +
        "\"studentTaskSummary\": öğrenciye görevi sen diliyle anlatan 1-2 cümle.",
      input.rubricType === "butuncul"
        ? `- "holisticLevels": TAM ${input.scale} öğe, en düşükten en yükseğe; her öğede "teacher" (resmî düzey tanımı) ve ` +
          "\"student\" (aynı düzeyin sen diliyle kısa karşılığı, ör. \"Görevin tüm parçalarını eksiksiz ve özenle tamamladın.\")."
        : undefined,
    ]
      .filter(Boolean)
      .join("\n"),
    [
      "KALİTE:",
      `- Ölçütler "${input.topic.trim()}" konusuna ve ${input.gradeLevel.trim()} düzeyine özgü olsun; başka bir göreve aynen ` +
        "uyacak genel ifadelerden kaçın.",
      "- Kalabalık sınıfta öğretmenin birkaç dakikada puanlayabileceği kadar net ve kısa yaz.",
      "- Yalnızca istenen JSON alanlarını doldur; açıklama ekleme.",
    ].join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n");

  return { input, curriculum, allowedSkillCodes: allowed, instructions };
}
