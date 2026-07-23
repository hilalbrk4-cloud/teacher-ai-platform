import { LESSON_PLAN_SECTION_METADATA } from "@/lib/ai/schemas/lesson-plan-schema";
import {
  ASSESSMENT_TECHNIQUES,
  DIGITAL_TOOL_SUGGESTIONS,
  EDUPILOT_SPARK_MARKER,
  RICH_ACTIVITY_IDEAS,
  SPARK_FIELD_LABELS,
  SPARK_IDEA_POOL,
  TEACHER_COACH_LABELS,
  TEACHING_STRATEGIES,
} from "@/lib/lesson-planner/teaching-library";
import { LESSON_PLAN_SECTION_ORDER } from "@/types/lesson-planner";
import type {
  LessonPlanFormInput,
  LessonPlanPrompt,
  LessonPlanPromptContext,
  LessonPlanRefinementId,
} from "@/types/lesson-planner";

const AI_ROLE =
  "Türkiye'de görev yapan, öğrencileri tarafından çok sevilen, yıllardır ders anlatan deneyimli bir rehber " +
  "öğretmen ve öğretim tasarımcısısın. Sıradan, ders kitabı gibi kuru planlar yazmazsın; meslektaşlarına ilham " +
  "veren, hazırlık süresini azaltan, akılda kalıcı fikirler öneren, öğrenci katılımını artıran ve aktif " +
  "öğrenmeyi teşvik eden yaratıcı bir eğitimci gibi düşünürsün. Şablon, birbirinin kopyası veya herhangi bir " +
  "konuya uyabilecek genel geçer öneriler vermezsin; her zaman derse ve konuya özgü, somut ve doğrudan " +
  "uygulanabilir içerik üretirsin. Türkiye'deki tipik sınıf koşullarını (kalabalık sınıf, standart tahta/ders " +
  "kitabı, sınırlı teknoloji) göz önünde bulundurursun. Amacın, planı okuyan öğretmenin \"Bu dersi yarın " +
  "anlatmak için sabırsızlanıyorum\" demesini sağlamaktır.";

const REFINEMENT_DESCRIPTIONS: Record<LessonPlanRefinementId, string> = {
  fiveE:
    "'gelisme' bölümünü 5E modelinin beş aşamasına göre yapılandır ve HER aşama için konuya özgü, somut bir " +
    "etkinlik yaz — aşamanın adını yazıp genel bir tanım yapmakla yetinme:\n" +
    "  • Girme (Engage): Konuyla ilgili şaşırtıcı bir soru, kısa bir gösterim veya günlük hayattan somut bir " +
    "örnekle dikkat çek.\n" +
    "  • Keşfetme (Explore): Öğrencilerin konuyu kendi başlarına veya küçük gruplarla, gözlemleyerek ya da " +
    "deneyerek keşfedeceği somut bir etkinlik tanımla.\n" +
    "  • Açıklama (Explain): Keşfetme aşamasındaki gözlemleri konuya özgü terimlerle açıkla.\n" +
    "  • Derinleştirme (Elaborate): Öğrenileni yeni, farklı bir somut örnek veya problem üzerinde uygulat.\n" +
    "  • Değerlendirme (Evaluate): Öğrenme hedefleriyle doğrudan bağlantılı, spesifik bir soru veya görevle " +
    "kavrayışı kontrol et.\n" +
    "  Her aşamayı en az bir öğrenme hedefiyle açıkça ilişkilendir.",
  groupWork:
    "Plana, öğrencilerin somut bir görev üzerinde birlikte çalışacağı, rolleri veya adımları açıkça tanımlanmış " +
    "en az bir grup çalışması etkinliği ekle; grupların ne üreteceğini (poster, cevap, sunum vb.) belirt.",
  warmUpActivity:
    "Derse, konuyla doğrudan ilgili, öğrencinin merakını uyandıracak somut bir soru, görsel veya kısa bir " +
    "senaryoyla başla; genel geçer bir 'ısınma sorusu' yazma.",
  inclusionAdaptation:
    "Kaynaştırma öğrencileri için belirtilen ihtiyaca uygun somut bir uyarlama tanımla (ör. basitleştirilmiş " +
    "yönerge, görsel destek, ek süre, akran desteği) — yalnızca 'uyarlama yapılır' deme, uyarlamanın ne olduğunu yaz.",
};

function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Turns raw teacher input into a structured Prompt Builder context. Pure
 * function: no API calls, no environment access, no UI/React dependency,
 * and the input object is never mutated (only read from).
 */
function buildContext(input: LessonPlanFormInput): LessonPlanPromptContext {
  return {
    role: AI_ROLE,
    subject: input.subject.trim(),
    gradeLevel: input.gradeLevel.trim(),
    topic: input.topic.trim(),
    durationMinutes: input.duration,
    outcomes: input.objectives.trim(),
    teachingMethod: emptyToUndefined(input.teachingApproach),
    studentLevel: emptyToUndefined(input.studentLevel),
    materials: emptyToUndefined(input.materials),
    assessmentPreference: emptyToUndefined(input.assessmentPreference),
    specialNeeds: emptyToUndefined(input.specialNeeds),
    additionalNotes: emptyToUndefined(input.additionalNotes),
    refinements: [...input.refinements],
    requiredSections: LESSON_PLAN_SECTION_ORDER,
    language: "tr",
  };
}

function buildTeacherInputBlock(context: LessonPlanPromptContext): string {
  const lines: string[] = [
    `Ders: ${context.subject}`,
    `Sınıf düzeyi: ${context.gradeLevel}`,
    `Konu: ${context.topic}`,
    `Ders süresi: ${context.durationMinutes} dakika`,
    `Öğrenme hedefleri: ${context.outcomes}`,
  ];

  if (context.teachingMethod) lines.push(`Öğretim yaklaşımı: ${context.teachingMethod}`);
  if (context.studentLevel) lines.push(`Öğrenci seviyesi: ${context.studentLevel}`);
  if (context.materials) lines.push(`Kullanılacak materyaller: ${context.materials}`);
  if (context.assessmentPreference) lines.push(`Ölçme ve değerlendirme tercihi: ${context.assessmentPreference}`);
  if (context.specialNeeds) lines.push(`Özel gereksinimler / uyarlama ihtiyacı: ${context.specialNeeds}`);
  if (context.additionalNotes) lines.push(`Ek notlar: ${context.additionalNotes}`);

  if (context.refinements.length > 0) {
    const refinementLines = context.refinements.map((id) => `- ${REFINEMENT_DESCRIPTIONS[id]}`).join("\n");
    lines.push(`Seçilen yapay zekâ önerileri:\n${refinementLines}`);
  }

  return `ÖĞRETMEN GİRDİLERİ:\n${lines.join("\n")}`;
}

function buildLanguageBlock(context: LessonPlanPromptContext): string {
  return [
    "DİL VE ÜSLUP KURALLARI:",
    "- Çıktıyı doğal, akıcı Türkçe ile yaz.",
    "- Makine çevirisi gibi görünen veya aşırı akademik bir dil kullanma.",
    "- Türkiye'deki öğretmenlerin günlük olarak kullandığı terimleri tercih et.",
    `- Anlatım ve etkinlik önerilerini ${context.gradeLevel} seviyesine uygun tut.`,
    "- Kısa ve öz cümleler kullan; her bölümü gereksiz uzatmadan doğrudan uygulanabilir bilgi ver.",
    "- Bölümler arasında aynı açılış cümlesini veya kalıbı tekrar etme; her bölümde farklı bir anlatımla başla.",
    `- Genel geçer tavsiyeler yerine "${context.topic}" konusuna özgü somut ifadeler, örnekler ve mümkünse ` +
      "örnek sorular/cümleler kullan.",
  ].join("\n");
}

function buildPedagogyBlock(context: LessonPlanPromptContext): string {
  return [
    "PEDAGOJİK GEREKSİNİMLER:",
    `- Ders süresini dakika bazında bölümlere ayır ve bu dağılımı "dersBilgileri" bölümünde belirt (ör. Giriş: ` +
      `X dk, Gelişme: Y dk, Sonuç: Z dk); dağılımın toplamı tam olarak ${context.durationMinutes} dakika olmalıdır.`,
    `- "gelisme" bölümündeki HER etkinliği öğrenme hedeflerinden en az biriyle açıkça ilişkilendir; hedefle ` +
      "ilgisi olmayan etkinlik ekleme.",
    "- Her etkinliği somut bir örnekle anlat: kullanılacak soru, problem, materyal veya senaryonun kendisini " +
      "yaz — \"örnekler üzerinden ilerlenir\" gibi belirsiz ifadelerle geçiştirme.",
    "- Türkiye'deki tipik bir sınıf ortamını varsay (kalabalık sınıf, standart sıra düzeni, tahta, ders kitabı); " +
      "öğretmenin açıkça belirtmediği gelişmiş teknoloji veya materyal varsayma.",
    "- \"farklilastirma\" bölümünde zorlanan, orta düzey ve ileri düzey öğrenciler için AYRI ve somut " +
      "uyarlamalar yaz (üç ayrı fikir); \"etkinlikler uyarlanır\" gibi genel bir ifadeyle geçme. İstenen özel " +
      "bir uyarlama/farklılaştırma ihtiyacı belirtilmişse bunu da bu üç uyarlamaya dahil et.",
    `- "olcmeDegerlendirme" bölümünde ölçme tercihine uygun somut bir soru, görev veya ölçüt yaz ve bunun ` +
      "hangi öğrenme hedefini kontrol ettiğini belirt. Aynı ölçme yöntemini her derste tekrar etme; şu " +
      `tekniklerden konuya uygun birini seç: ${ASSESSMENT_TECHNIQUES.join(", ")}.`,
    "- Kullanıcı tarafından açıkça verilmediği sürece resmi bir MEB kazanım kodu ya da müfredat kodu uydurma; " +
      "resmî müfredata uygunluk iddia etme.",
    "- Doğrulanamayan bilimsel veya istatistiksel iddialarda bulunma.",
  ].join("\n");
}

function buildTeachingApproachBlock(context: LessonPlanPromptContext): string {
  const strategyChoice = context.refinements.includes("fiveE")
    ? "- Öğretmen 5E modelini seçti; \"gelisme\" bölümünü yukarıda açıklanan 5E aşamalarına göre yapılandır."
    : "- \"gelisme\" bölümü için en uygun öğretim stratejisini SEN seç; körü körüne her derste 5E modelini " +
      `kullanma. Uygun seçenekler arasından ders, konu, sınıf düzeyi ve süreye en uygun olanını belirle: ` +
      `${TEACHING_STRATEGIES.join(", ")}. Seçtiğin stratejiyi zorlama; doğal bir şekilde uygula.`;

  return [
    "ÖĞRETİM YAKLAŞIMI VE ETKİNLİKLER:",
    strategyChoice,
    "- Jenerik etkinlikler yazma. Bunun yerine zengin, somut sınıf deneyimleri kurgula; şu tarz fikirlerden " +
      `esinlenebilirsin (doğrudan kopyalama, konuya uyarla): ${RICH_ACTIVITY_IDEAS.join(", ")}.`,
    "- Faydalı olduğunda, aşağıdaki dijital araçlardan konuya uygun birini doğal bir şekilde öner; zorlamadan " +
      `ve gerekmiyorsa hiç bahsetmeden: ${DIGITAL_TOOL_SUGGESTIONS.join(", ")}.`,
  ].join("\n");
}

function buildSignatureContentBlock(): string {
  const sparkFieldLines = SPARK_FIELD_LABELS.map(
    (item) => `    - "${item.label}": ${item.description}`
  ).join("\n");
  const coachLines = TEACHER_COACH_LABELS.map(
    (item) => `  - "${item.emoji} ${item.label}": ${item.description}`
  ).join("\n");

  return [
    "EDUPILOT İMZA İÇERİĞİ (ZORUNLU):",
    '- "gelisme" bölümünün içine EduPilot\'ın imza özelliği olan TAM bir etkinlik yaz. Tek cümlelik bir öneri ' +
      "ASLA yeterli değildir — bu, öğretmenin doğrudan sınıfta uygulayabileceği eksiksiz bir etkinlik olmalı. " +
      "Şu iki adımı izle:",
    `  1. Tam olarak "${EDUPILOT_SPARK_MARKER}" ile başlayan bir satırda, konuya özgü ve gerçekten özgün, ` +
      "yaratıcı bir etkinlik BAŞLIĞI yaz (genel bir etkinlik tekrarı olmamalı).",
    "  2. Bu satırın hemen ardından, aşağıdaki alanların HER BİRİNİ tam olarak verilen etiketle, kendi " +
      "satırında yaz. Başka bir alan ekleme veya atlama:",
    sparkFieldLines,
    "- Etkinlik fikrini şu tarz yöntemlerden konuya en uygun olanından esinlenerek seç (asla zorlama, " +
      `birebir kopyalama): ${SPARK_IDEA_POOL.join(", ")}.`,
    '- Bu etkinliği okuyan bir öğretmen "Bunu yarın denemek istiyorum" demeli.',
    "",
    '"ogretmenNotlari" bölümünün içine, aşağıdaki dokuz başlığın HER BİRİNİ tam olarak verilen emoji ve ' +
      'Türkçe etiketle ("emoji Etiket: içerik" biçiminde), kendi paragrafında, bu SIRAYLA yaz. Başka bir ' +
      "başlık ekleme veya başlıkları atlama:",
    coachLines,
    "- Bu bölüm, yıllardır ders anlatan deneyimli bir öğretmenin bir meslektaşına verdiği içten, pratik bir " +
      "tavsiye gibi hissettirmeli — genel bir ders kitabı tavsiyesi gibi değil.",
  ].join("\n");
}

function buildQualityBarBlock(context: LessonPlanPromptContext): string {
  return [
    "KALİTE STANDARDI:",
    `- Yanıtı tamamlamadan önce kontrol et: bu plan yalnızca "${context.topic}" konusu için mi yazıldı, yoksa ` +
      "başka bir konuya da uyar mı? Başka konulara da uyuyorsa, konuya özgü ayrıntılar ekleyerek yeniden yaz.",
    "- Her bölümde en az bir somut, konuya özgü ayrıntı (örnek soru, sayısal değer, gözlem, senaryo, cümle vb.) " +
      "bulunmalıdır.",
    "- \"gelisme\" dışındaki bölümler kısa ve öz olmalıdır (yaklaşık 2-5 cümle); \"gelisme\" bölümü, içerdiği " +
      "etkinlik sayısına göre daha uzun olabilir.",
    "- Son kontrol: bu planı okuyan bir öğretmen \"Bu dersi yarın anlatmak istiyorum\" der mi? Demiyorsa, " +
      "daha somut ve ilham verici hale getirmeden yanıtı tamamlama.",
  ].join("\n");
}

function buildOutputStructureBlock(): string {
  const sectionList = LESSON_PLAN_SECTION_METADATA.map(
    (section) => `  - "${section.key}": ${section.label} — ${section.description}`
  ).join("\n");

  return [
    "GEREKLİ ÇIKTI YAPISI:",
    "Yanıt, tam olarak aşağıdaki alanlara sahip TEK bir JSON nesnesi olmalıdır (başka hiçbir üst seviye alan ekleme):",
    '- "id": Bu ders planı için kısa bir metin tanımlayıcı (string).',
    '- "subject": Ders adı (string).',
    '- "gradeLevel": Sınıf düzeyi (string).',
    '- "topic": Konu (string).',
    '- "duration": Ders süresi, dakika cinsinden bir sayı (number, metin değil).',
    '- "generatedAt": Şu anki tarih ve saat, ISO 8601 formatında bir metin (ör. "2025-01-01T12:00:00.000Z").',
    '- "sections": Aşağıdaki bölümlerin HER BİRİNİ ayrı bir nesne olarak içeren bir DİZİ (array). Dizideki ' +
      'her nesne tam olarak iki alana sahip olmalıdır: "key" (aşağıdaki listeden birebir bir anahtar) ve ' +
      '"content" (o bölümün düzenlenebilir, sınıfta kullanıma hazır metni, string).',
    "",
    '"sections" dizisinde bulunması ZORUNLU anahtarlar:',
    sectionList,
  ].join("\n");
}

function buildOutputFormatBlock(): string {
  return [
    "ÇIKTI FORMATI (ZORUNLU):",
    "- Yalnızca geçerli JSON döndür.",
    "- Markdown kod bloğu (```) kullanma.",
    "- JSON dışında hiçbir açıklama, yorum veya giriş cümlesi ekleme.",
    "- Bölüm anahtarlarını (ör. \"dersBilgileri\") ÜST SEVİYE bir alan adı olarak KULLANMA; hepsi \"sections\" " +
      "dizisinin içindeki nesnelerde \"key\" ve \"content\" alanları olarak yer almalıdır.",
    "- Belirtilen alan ve anahtar adlarını birebir koru; yeni alan ekleme veya isim değiştirme.",
    "- Genel geçer, belirsiz ifadeler yerine konuya özgü ve yararlı içerik üret.",
    "- Kendinden bir yapay zekâ olarak bahsetme.",
  ].join("\n");
}

function buildInstructions(context: LessonPlanPromptContext): string {
  return [
    `ROL:\n${context.role}`,
    buildTeacherInputBlock(context),
    buildLanguageBlock(context),
    buildPedagogyBlock(context),
    buildTeachingApproachBlock(context),
    buildSignatureContentBlock(),
    buildQualityBarBlock(context),
    buildOutputStructureBlock(),
    buildOutputFormatBlock(),
  ].join("\n\n");
}

/**
 * EduPilot's Prompt Builder for the Lesson Planner. Converts structured
 * teacher input into a fully-specified AI request — role, teacher inputs,
 * language rules, pedagogical constraints and a strict JSON output contract
 * — so the teacher never has to write a prompt themselves.
 *
 * Pure and side-effect free: no network calls, no `process.env` access, no
 * UI/React dependency, and `input` is only ever read, never mutated.
 */
export function buildLessonPlanPrompt(input: LessonPlanFormInput): LessonPlanPrompt {
  const context = buildContext(input);
  return {
    ...context,
    instructions: buildInstructions(context),
  };
}
