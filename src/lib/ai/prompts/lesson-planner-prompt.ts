import { lessonPlanSectionMeta, SKILLS_PER_GROUP } from "@/lib/ai/schemas/lesson-plan-schema";
import { fiveETimeRanges, formatTimeRange, lessonPlanModel, lessonPlanSectionOrder } from "@/lib/lesson-planner/five-e";
import { TYMM_SKILL_GROUP_LABELS, TYMM_SKILL_GROUP_ORDER, TYMM_SKILL_GROUPS } from "@/lib/lesson-planner/tymm-skills";
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
import { LESSON_PLAN_5E_PHASES } from "@/types/lesson-planner";
import { formatCurriculumTag } from "@/lib/curriculum/catalog";
import type { LessonPlanCurriculumContext } from "@/types/curriculum";
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
    "Planı Türkiye Yüzyılı Maarif Modeli'ne uygun 5E modeliyle kur: klasik Giriş / Gelişme / Sonuç bölümleri " +
    "YOK; dersin akışı doğrudan beş ayrı aşama bölümüdür (ayrıntılar aşağıdaki 5E AKIŞI bloğunda).",
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
function buildContext(
  input: LessonPlanFormInput,
  officialCurriculum: LessonPlanCurriculumContext | undefined
): LessonPlanPromptContext {
  const model = lessonPlanModel(input.refinements);
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
    model,
    requiredSections: lessonPlanSectionOrder(model),
    phaseTimeRanges: model === "5e" ? fiveETimeRanges(input.duration) : undefined,
    officialCurriculum,
    language: "tr",
  };
}

/** Modelde ana etkinlik akışını taşıyan bölümler (kalite ve uzunluk kuralları için). */
function mainFlowKeys(context: LessonPlanPromptContext): string {
  return context.model === "5e"
    ? LESSON_PLAN_5E_PHASES.map((key) => `"${key}"`).join(", ")
    : '"gelisme"';
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
  const timeRule =
    context.model === "5e"
      ? `- "dersBilgileri" bölümünde süre dağılımı olarak YALNIZCA aşağıdaki 5E AKIŞI bloğundaki dakika ` +
        `aralıklarını yaz (toplam ${context.durationMinutes} dakika); Giriş / Gelişme / Sonuç dağılımı yazma.`
      : `- Ders süresini dakika bazında bölümlere ayır ve bu dağılımı "dersBilgileri" bölümünde belirt (ör. Giriş: ` +
        `X dk, Gelişme: Y dk, Sonuç: Z dk); dağılımın toplamı tam olarak ${context.durationMinutes} dakika olmalıdır.`;
  const assessmentKey = context.model === "5e" ? "degerlendirme" : "olcmeDegerlendirme";
  return [
    "PEDAGOJİK GEREKSİNİMLER:",
    timeRule,
    `- ${mainFlowKeys(context)} bölümlerindeki HER etkinliği öğrenme hedeflerinden en az biriyle açıkça ` +
      "ilişkilendir; hedefle ilgisi olmayan etkinlik ekleme.",
    "- Her etkinliği somut bir örnekle anlat: kullanılacak soru, problem, materyal veya senaryonun kendisini " +
      "yaz — \"örnekler üzerinden ilerlenir\" gibi belirsiz ifadelerle geçiştirme.",
    "- \"farklilastirma\" bölümünde zorlanan, orta düzey ve ileri düzey öğrenciler için AYRI ve somut " +
      "uyarlamalar yaz (üç ayrı fikir); \"etkinlikler uyarlanır\" gibi genel bir ifadeyle geçme. İstenen özel " +
      "bir uyarlama/farklılaştırma ihtiyacı belirtilmişse bunu da bu üç uyarlamaya dahil et.",
    `- "${assessmentKey}" bölümünde ölçme tercihine uygun somut bir soru, görev veya ölçüt yaz ve bunun ` +
      "hangi öğrenme hedefini kontrol ettiğini belirt. Aynı ölçme yöntemini her derste tekrar etme; şu " +
      `tekniklerden konuya uygun birini seç: ${ASSESSMENT_TECHNIQUES.join(", ")}.`,
    context.officialCurriculum
      ? "- Yalnızca MEB RESMİ ÖĞRENME ÇIKTILARI bloğunda verilen kodları kullan; listede olmayan hiçbir kazanım, " +
        "öğrenme çıktısı veya beceri kodu uydurma."
      : "- Kullanıcı tarafından açıkça verilmediği sürece resmi bir MEB kazanım kodu ya da müfredat kodu uydurma; " +
        "resmî müfredata uygunluk iddia etme.",
    "- Doğrulanamayan bilimsel veya istatistiksel iddialarda bulunma.",
  ].join("\n");
}

/**
 * Gerçek sınıf koşulları: 30-35 kişilik, sıraları sabit, malzemesi kısıtlı
 * sınıflarda uygulanabilir, steril olmayan yönergeler.
 */
function buildClassroomRealityBlock(): string {
  return [
    "GERÇEK SINIF KOŞULLARI (ZORUNLU):",
    "- Varsayılan sınıf: 30-35 öğrenci, sabit sıra düzeni, tahta ve ders kitabı; öğretmenin açıkça belirtmediği " +
      "laboratuvar, akıllı tahta, tablet veya pahalı malzeme varsayma.",
    "- Grup çalışmalarını sıraları taşımadan kur: sıra arkadaşıyla ikili veya ön-arka sıra birleşerek 4 kişilik " +
      "gruplar. Malzeme gerekiyorsa grup başına değil sıra başına bir set öngör ve sayısını yaz.",
    "- Her etkinlikte öğretmenin söyleyeceği yönergeyi tek cümleyle ver ve süre tutmayı belirt (ör. \"3 dakika " +
      "sayaç başlatılır\"). Kalabalık sınıfta sesi ve geçişleri yönetmek için somut bir işaret öner " +
      "(el kaldırma, geri sayım, zil).",
    "- Etkinlikler steril/ideal değil gerçekçi olsun: herkesin konuşamayacağını varsay; paylaşımı 2-3 gönüllü veya " +
      "kura ile seçilen grup üzerinden yap, kalanlar için \"katılıyorum / ekliyorum\" gibi hızlı bir yanıt yolu ver.",
    "- Hazırlığı az tut: ders öncesi hazırlık 10 dakikayı geçmesin; fotokopi gerekiyorsa yarım A4 ile sınırla.",
    "- Her etkinlik kendi süresi İÇİNDE tamamlanabilir olmalı. Sonucu saatler/günler süren deney ve gözlemleri " +
      "derste \"yapılacak\" diye yazma: öğretmenin günler önce kurduğu hazır düzeneği (ör. önceden karanlıkta " +
      "bekletilmiş örnek) ya da hazır gözlem verisini/fotoğrafını kullan ve bunu \"derseHazirlik\"te belirt.",
    "- Bilimsel olarak tutarsız malzeme veya yöntem önerme (ör. sprey şişesiyle gaz vermek); her malzemenin " +
      "etkinlikte ne işe yaradığı açık olsun.",
  ].join("\n");
}

/** 5E akışı: aşamalar, koddan gelen kesin dakika aralıkları ve çıkış bileti zorunluluğu. */
function buildFiveEBlock(context: LessonPlanPromptContext): string | undefined {
  const ranges = context.phaseTimeRanges;
  if (context.model !== "5e" || !ranges) return undefined;
  const phaseGuidance: Record<(typeof LESSON_PLAN_5E_PHASES)[number], string> = {
    girme:
      "Merak uyandır ve ön bilgiyi yokla: konuya özgü şaşırtıcı bir soru, kısa bir gösterim veya günlük hayattan " +
      "bir durum. Öğrencilerin tahminleri tahtaya not edilir; doğru cevap henüz VERİLMEZ.",
    kesfetme:
      "Öğrenciler ikili/dörtlü gruplarla doğrudan deneyimler: gözlem, basit deney, veri toplama veya kart " +
      "eşleştirme. Öğretmen yönlendirici soru sorar ama kavramı AÇIKLAMAZ. Grupların ne kaydedeceğini yaz.",
    aciklama:
      "Grupların keşif bulgularından yola çıkılarak kavram birlikte oluşturulur; öğretmen terimleri netleştirir ve " +
      "Girme'deki tahminlere geri döner. Tahtaya yazılacak kısa özeti/şemayı ver.",
    derinlestirme:
      "Kavram YENİ bir bağlama aktarılır: gerçek yaşam problemi, karar verme durumu veya kısa üretim görevi. " +
      "Keşfetme'deki etkinliğin tekrarı olmamalı.",
    degerlendirme:
      "Süreç odaklı ölçme: derste gözlenecek 2-3 somut ölçüt (öğretmen sıralar arasında dolaşırken neye bakar) VE " +
      "ZORUNLU bir çıkış bileti. Satırı tam olarak \"Çıkış Bileti:\" ile başlat; öğrencinin dersin son 3-5 " +
      "dakikasında yarım kâğıda yazacağı 2-3 NUMARALI kısa maddeyi (1) kavram sorusu, 2) yeni durumda uygulama " +
      "sorusu, 3) \"aklımda kalan soru\" / öz değerlendirme) birebir yaz ve biletlerin nasıl toplanıp ertesi " +
      "derste nasıl kullanılacağını belirt.",
  };
  const phaseLines = LESSON_PLAN_5E_PHASES.map((key) => {
    const meta = lessonPlanSectionMeta(key);
    return `  - "${key}" — ${meta.label} [${formatTimeRange(ranges[key])}]: ${phaseGuidance[key]}`;
  }).join("\n");
  return [
    "5E AKIŞI (TYMM UYUMLU, ZORUNLU):",
    "- Dersin akışı yalnızca şu beş aşama bölümünden oluşur; \"giris\", \"gelisme\", \"sonuc\" ve " +
      "\"olcmeDegerlendirme\" bölümlerini ÜRETME.",
    "- Dakika aralıkları kesindir ve EduPilot tarafından hesaplanmıştır; değiştirme, yeni süre önerme. Her aşama " +
      "metnini bu aralığa sığacak kadar etkinlikle yaz. \"dersBilgileri\" bölümünde bu beş aralığı aynen listele.",
    phaseLines,
    "- Her aşamayı en az bir öğrenme hedefiyle açıkça ilişkilendir; aşamalar birbirine bağlansın (Girme'deki soru " +
      "Açıklama'da cevaplanır, Keşfetme'nin verisi Açıklama'da kullanılır).",
  ].join("\n");
}

/**
 * Öğretmenin müfredat havuzundan seçtiği resmî çıktılar. Metinler ve kodlar
 * sunucudaki havuzdan gelir; model bunları birebir kullanır, değiştirmez.
 */
function buildOfficialCurriculumBlock(context: LessonPlanPromptContext): string | undefined {
  const curriculum = context.officialCurriculum;
  if (!curriculum) return undefined;
  const programLabel =
    curriculum.program === "tymm" ? "Türkiye Yüzyılı Maarif Modeli öğrenme çıktıları" : "önceki program kazanımları";
  const outcomeLines = curriculum.outcomes
    .map((outcome) => {
      const components = outcome.components.map(
        (component, index) => `      ${String.fromCharCode(97 + index)}) ${component}`
      );
      return [`  - ${outcome.code} — ${outcome.text}`, ...components].join("\n");
    })
    .join("\n");
  const tagLine = (title: string, tags: LessonPlanCurriculumContext["sdb"]) =>
    tags.length > 0 ? `- ${title}: ${tags.map(formatCurriculumTag).join(", ")}` : undefined;
  const assessmentKey = context.model === "5e" ? "degerlendirme" : "olcmeDegerlendirme";
  return [
    `MEB RESMİ ÖĞRENME ÇIKTILARI (ZORUNLU — ${programLabel}):`,
    `Ünite/Tema: ${curriculum.unit} · Konu: ${curriculum.topic}`,
    outcomeLines,
    tagLine("Sosyal-duygusal öğrenme becerileri (SDB)", curriculum.sdb),
    tagLine("Değerler (D)", curriculum.values),
    tagLine("Okuryazarlık becerileri (OB)", curriculum.literacy),
    curriculum.assessment.length > 0
      ? `- Programın önerdiği ölçme ve değerlendirme kanıtları: ${curriculum.assessment.join(" ").slice(0, 600)}`
      : undefined,
    "KURALLAR:",
    '- "ogrenmeHedefleri" bölümünde yukarıdaki HER çıktıyı kodu ve metniyle birebir yaz ("KOD — metin"); ' +
      "süreç bileşenlerini (a, b, c…) alt madde olarak ekleyebilirsin. Öğretmenin ek hedefi varsa onları ayrıca yaz.",
    "- Etkinlikleri bu süreç bileşenlerini gerçekleştirecek şekilde kurgula ve bir etkinlik bir çıktıya hizmet " +
      `ediyorsa satır sonunda kodunu parantez içinde belirt (ör. "(${curriculum.outcomes[0].code})").`,
    "- Yukarıdaki SDB ve Değerlerin her biri en az bir etkinlikte gözlenebilir biçimde yer almalı (ör. iş birliği için " +
      "rol dağılımlı grup görevi); Okuryazarlık becerileri uygun etkinliklerde kullanılmalı.",
    `- "${assessmentKey}" bölümünde ölçme kanıtlarını programın önerdiği yöntemlerden seç ve her ölçme aracının ` +
      "hangi çıktı koduna ait olduğunu yaz.",
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

/** TYMM Beceriler Örgüsü: etiketler sabit listelerden seçilir, kod uydurulmaz. */
function buildSkillsBlock(context: LessonPlanPromptContext): string {
  const groupLines = TYMM_SKILL_GROUP_ORDER.map((group) => {
    const { short, label } = TYMM_SKILL_GROUP_LABELS[group];
    return `  - "${group}" (${short} — ${label}): ${TYMM_SKILL_GROUPS[group].join(", ")}`;
  }).join("\n");
  return [
    "TYMM BECERİLER ÖRGÜSÜ (ZORUNLU):",
    `- "skills" alanında her grup için planın GERÇEKTEN çalıştırdığı ${SKILLS_PER_GROUP.min}-${SKILLS_PER_GROUP.max} ` +
      "etiketi yalnızca aşağıdaki listelerden, birebir yazımla seç:",
    groupLines,
    "- Seçtiğin her beceri planın en az bir etkinliğinde gözlenebilir olmalı (ör. \"İş birliği\" seçtiysen grup " +
      "çalışması, \"Veri toplama ve kaydetme\" seçtiysen gözlem tablosu olmalı). Uygun değilse seçme.",
    "- Numaralı program kodu (ör. \"KB2.10\", \"SDB1.1\") yazma.",
    ...(context.officialCurriculum
      ? [
          "- Resmî SDB, Değer ve Okuryazarlık kodları plana EduPilot tarafından eksiksiz eklenecek; \"socialEmotional\" " +
            "ve \"values\" için yine de listeden bunlara en yakın etiketleri seç.",
        ]
      : []),
  ].join("\n");
}

function buildTeachingApproachBlock(context: LessonPlanPromptContext): string {
  const strategyChoice = context.model === "5e"
    ? "- Öğretmen 5E modelini seçti; ders akışını yukarıdaki 5E AKIŞI bloğuna göre kur. Keşfetme ve " +
      "Derinleştirme aşamalarında aşağıdaki etkinlik türlerinden konuya uygun olanları kullanabilirsin."
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

function buildSignatureContentBlock(context: LessonPlanPromptContext): string {
  const sparkSection = context.model === "5e" ? "kesfetme" : "gelisme";
  const sparkFieldLines = SPARK_FIELD_LABELS.map(
    (item) => `    - "${item.label}": ${item.description}`
  ).join("\n");
  const coachLines = TEACHER_COACH_LABELS.map(
    (item) => `  - "${item.emoji} ${item.label}": ${item.description}`
  ).join("\n");

  return [
    "EDUPILOT İMZA İÇERİĞİ (ZORUNLU):",
    `- "${sparkSection}" bölümünün içine EduPilot'ın imza özelliği olan TAM bir etkinlik yaz. Tek cümlelik bir öneri ` +
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
    `- ${mainFlowKeys(context)} dışındaki bölümler kısa ve öz olmalıdır (yaklaşık 2-5 cümle); ders akışı ` +
      "bölümleri içerdikleri etkinlik sayısına göre daha uzun olabilir.",
    "- Son kontrol: bu planı okuyan bir öğretmen \"Bu dersi yarın anlatmak istiyorum\" der mi? Demiyorsa, " +
      "daha somut ve ilham verici hale getirmeden yanıtı tamamlama.",
  ].join("\n");
}

function buildOutputStructureBlock(context: LessonPlanPromptContext): string {
  const sectionList = context.requiredSections
    .map((key) => {
      const section = lessonPlanSectionMeta(key);
      return `  - "${section.key}": ${section.label} — ${section.description}`;
    })
    .join("\n");

  return [
    "GEREKLİ ÇIKTI YAPISI:",
    "Yanıt, tam olarak iki alana sahip TEK bir JSON nesnesi olmalıdır (ders adı, sınıf, süre ve kimlik bilgisini " +
      "EduPilot ekler; sen ekleme):",
    '- "sections": Aşağıdaki bölümlerin HER BİRİNİ, bu SIRAYLA, ayrı bir nesne olarak içeren bir DİZİ (array). ' +
      'Dizideki her nesne tam olarak iki alana sahip olmalıdır: "key" (aşağıdaki listeden birebir bir anahtar) ve ' +
      '"content" (o bölümün düzenlenebilir, sınıfta kullanıma hazır metni, string).',
    '- "skills": TYMM BECERİLER ÖRGÜSÜ bloğunda tanımlanan dört grup ("conceptual", "socialEmotional", ' +
      '"dispositions", "values"); her biri izinli etiketlerden oluşan bir dizi.',
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
    buildOfficialCurriculumBlock(context),
    buildPedagogyBlock(context),
    buildClassroomRealityBlock(),
    buildFiveEBlock(context),
    buildTeachingApproachBlock(context),
    buildSignatureContentBlock(context),
    buildSkillsBlock(context),
    buildQualityBarBlock(context),
    buildOutputStructureBlock(context),
    buildOutputFormatBlock(),
  ]
    .filter((block): block is string => Boolean(block))
    .join("\n\n");
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
export function buildLessonPlanPrompt(
  input: LessonPlanFormInput,
  options: { curriculum?: LessonPlanCurriculumContext } = {}
): LessonPlanPrompt {
  const context = buildContext(input, options.curriculum);
  return {
    ...context,
    instructions: buildInstructions(context),
  };
}
