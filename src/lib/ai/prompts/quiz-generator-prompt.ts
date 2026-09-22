import { isMathSubject, isScienceSubject } from "@/lib/ai/blueprint/quiz-blueprint";
import { QUIZ_QUESTION_TYPE_METADATA, QUIZ_VISUAL_TYPE_METADATA } from "@/lib/ai/schemas/quiz-schema";
import {
  buildKnowledgePackOverviewBlock,
  buildKnowledgePackSelfCheckBlock,
  buildSlotPatternGuidanceText,
  computeQuestionPatternCoverage,
  type QuizGeneratorPackContext,
  type SlotPatternAssignment,
} from "@/lib/ai/prompts/quiz-generator-knowledge-pack-blocks";
import type { QuestionBlueprintSlot, QuizBlueprint, QuizPrompt } from "@/types/quiz-blueprint";
import type { CognitiveLevel, QuestionApproach } from "@/types/quiz-generator";

const AI_ROLE =
  "Sen yapay zekâ bir asistan DEĞİLSİN. Türkiye'de görev yapan, yıllardır ortaokulda ders anlatan, deneyimli " +
  "bir ölçme-değerlendirme uzmanı öğretmensin. Şu anda kendi öğrencilerin için özgün bir sınav hazırlıyorsun — " +
  "bu, bir yapay zekâ talebine verilen yanıt değil, senin mesleki birikiminle yazdığın gerçek bir sınav. Amacın " +
  "yalnızca soru sormak değil; öğrencinin gerçekten anlayıp anlamadığını, akıl yürütüp yürütemediğini ve hangi " +
  "kavram yanılgılarına sahip olduğunu ortaya çıkarmaktır. Ürettiğin her soru, meslektaşların tarafından " +
  "\"bunu bir öğretmen yazmış\" denecek kadar doğal ve özgün hissettirmelidir.";

const MEB_LGS_PHILOSOPHY_BLOCK = [
  "MEB / LGS DEĞERLENDİRME FELSEFESİ:",
  "- Sorularını, güncel MEB kazanım anlayışı ve LGS tarzı yetkinlik temelli sınav felsefesine göre kurgula.",
  "- Var olan gerçek bir MEB veya LGS sorusunu ASLA birebir veya yakın biçimde kopyalama; yalnızca o sınavların " +
    "arkasındaki felsefeyi (yetkinlik temelli değerlendirme, akıl yürütme öncelikli düşünme, yorumlama, özgün " +
    "bağlam) yansıt.",
  "- Kaçınman gerekenler: doğrudan ezber/hatırlama soruları (yaklaşım Hızlı Tekrar/Öğrenme Kontrolü değilse), " +
    "yapay/zorlama hikayeler, gerçekçi olmayan sahte bağlamlar ve yapay zekâ gibi duyulan ifadeler.",
].join("\n");

const COGNITIVE_LEVEL_LABELS: Record<CognitiveLevel, string> = {
  remember: "Hatırlama",
  understand: "Anlama",
  apply: "Uygulama",
  analyze: "Analiz",
  evaluate: "Değerlendirme",
};

// Operational behavior per cognitive level — controls HOW a question at
// that level must be written, not just what it's called. Only levels
// actually present in the blueprint are shown to the model (see
// buildCognitiveLevelDefinitionsBlock).
const COGNITIVE_LEVEL_DEFINITIONS: Record<CognitiveLevel, string> = {
  remember: "Öğrenciden bir bilgiyi veya tanımı doğrudan hatırlamasını iste.",
  understand: "Öğrenciden bir kavramı kendi cümleleriyle açıklamasını veya yorumlamasını iste.",
  apply: "Öğrenciden bilgiyi daha önce görmediği YENİ bir durumda kullanmasını iste; doğrudan hatırlamayla " +
    "çözülemesin.",
  analyze: "Öğrenciden karşılaştırma yapmasını, bilgiyi parçalarına ayırmasını veya farklı bilgiler arasında " +
    "ilişki kurmasını iste.",
  evaluate: "Öğrenciden bir seçimi, yargıyı veya çözümü gerekçelendirmesini ya da savunmasını iste.",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Kolay",
  medium: "Orta",
  hard: "Zor",
};

const APPROACH_LABELS: Record<QuestionApproach, string> = {
  quickReview: "Hızlı tekrar",
  learningCheck: "Öğrenme kontrolü",
  competencyBased: "Yetkinlik temelli",
  newGeneration: "Yeni nesil",
  realLifeContext: "Gerçek hayat bağlamlı",
  problemSolving: "Problem çözme",
  experimentInterpretation: "Deney/gözlem yorumlama",
  graphInterpretation: "Grafik yorumlama",
  mixed: "Karma",
};

// Operational writing behavior per approach — converts each label into a
// concrete rule instead of leaving it as a name the model must guess the
// meaning of. Only approaches actually present in the blueprint are shown
// (see buildApproachDefinitionsBlock). "mixed" never appears on an actual
// slot (the Blueprint always resolves it to a concrete approach per slot),
// so it has no definition here.
const APPROACH_DEFINITIONS: Partial<Record<QuestionApproach, string[]>> = {
  newGeneration: [
    "Hesaplama yapılmadan önce akıl yürütme gerektirmeli.",
    "Doğrudan ezber veya hatırlama ile çözülememeli.",
    "Öğrenci, verilen bilgiyi yorumlayarak sonuca ulaşmalı.",
  ],
  realLifeContext: [
    "Soru, anlamlı bir gerçek hayat durumuyla BAŞLAMALI (bkz. BAĞLAM ÖNCE SORU KURALI).",
    "Bağlam, kavramı doğal ve zorunlu biçimde gerektirmeli; kavram bağlama sonradan yapıştırılmış gibi durmamalı.",
  ],
  problemSolving: [
    "Birden fazla akıl yürütme/işlem adımı gerektirmeli.",
    "Öğrenci çözüm yolunda bir karar vermek zorunda kalmalı (ör. hangi bilgiyi/işlemi kullanacağına karar vermek).",
  ],
  experimentInterpretation: [
    "Bir gözlem veya deney sonucunu somut biçimde betimlemeli.",
    "Öğrenciden bir tanım hatırlaması değil, bu gözlemi yorumlaması istenmeli.",
  ],
  graphInterpretation: [
    "Bir grafikten veya tablodan değer okumayı gerektirmeli.",
    "Eğilimleri karşılaştırmayı ve bir sonuca varmayı gerektirmeli.",
  ],
  competencyBased: [
    "Doğrudan hedeflenen kazanımı ölçmeli.",
    "Terim ezberini değil, kazanımın gerçek bir durumda uygulanmasını ölçmeli.",
  ],
  quickReview: [
    "Basit, doğrudan bir tekrar sorusu olması kabul edilebilir; bu soruyu zorlama karmaşıklaştırma.",
  ],
  learningCheck: [
    "Kavramın doğrudan doğrulanması kabul edilebilir; karmaşık bir bağlam zorunlu değildir.",
  ],
};

// Approaches that demand a situational context before the question itself
// — used to conditionally include the "context before question" rule.
const CONTEXTUAL_APPROACHES = new Set<QuestionApproach>([
  "newGeneration",
  "realLifeContext",
  "problemSolving",
  "experimentInterpretation",
  "graphInterpretation",
  "competencyBased",
]);

function buildSlotLine(slot: QuestionBlueprintSlot, index: number): string {
  const typeLabel = QUIZ_QUESTION_TYPE_METADATA.find((meta) => meta.key === slot.type)?.label ?? slot.type;
  const visualLabel =
    slot.visualType === "none"
      ? "yok"
      : (QUIZ_VISUAL_TYPE_METADATA.find((meta) => meta.key === slot.visualType)?.label ?? slot.visualType);
  // Both the literal machine key AND its Turkish label are shown — the
  // model must copy the key (before the parenthesis) into the JSON "type"
  // field, never the label. Showing only the label here previously caused
  // the model to write e.g. "type": "Çoktan seçmeli" instead of
  // "multipleChoice", since the output contract says "type" must match
  // this plan line exactly and the label was the only value present.
  const visualField = slot.visualType === "none" ? "yok" : `${slot.visualType} (${visualLabel})`;

  return (
    `${index + 1}. Tür anahtarı: ${slot.type} (${typeLabel}) | Bilişsel düzey: ${COGNITIVE_LEVEL_LABELS[slot.cognitiveLevel]} | ` +
    `Zorluk: ${DIFFICULTY_LABELS[slot.difficulty]} | Yaklaşım: ${APPROACH_LABELS[slot.approach]} | ` +
    `Kazanım: ${slot.learningOutcome} | Görsel anahtarı: ${visualField}`
  );
}

/**
 * Builds each slot's plan line and, when a Knowledge Pack pattern is
 * assigned to that slot, its non-negotiable guidance immediately
 * underneath it — interleaved, never in a separate trailing section, so it
 * never has to compete with the rest of the prompt for the model's
 * attention (see `buildSlotPatternGuidanceText`).
 */
function buildSlotBlock(
  slot: QuestionBlueprintSlot,
  index: number,
  packContext: QuizGeneratorPackContext | undefined,
  assignment: SlotPatternAssignment | undefined,
  otherSlotNumbersWithSamePattern: number[]
): string {
  const planLine = buildSlotLine(slot, index);
  if (!packContext || !assignment) return planLine;

  const guidance = buildSlotPatternGuidanceText(assignment, packContext.projection);
  if (!guidance) return planLine;

  // The same pattern can legitimately cover more than one slot (coverage
  // fill). Without an explicit disambiguation, the model sometimes treats
  // two same-pattern questions as duplicates of one and collapses them into
  // a single question — so every repeat is called out by exact question
  // number, with an explicit instruction to keep them distinct.
  const repeatNote =
    otherSlotNumbersWithSamePattern.length > 0
      ? `\n   Bu desen ${otherSlotNumbersWithSamePattern.join(", ")}. soru(lar) için de kullanılmıştır — bu ` +
        `${index + 1}. soru onlardan TAMAMEN FARKLI bir senaryo ve farklı sayılar kullanmalıdır; iki ayrı soru ` +
        "olarak kalmalı, ASLA birleştirilmemeli veya tek soruya indirgenmemelidir."
      : "";

  return `${planLine}\n${guidance}${repeatNote}`;
}

function buildQuestionPlanBlock(blueprint: QuizBlueprint, packContext?: QuizGeneratorPackContext): string {
  const assignments = packContext
    ? computeQuestionPatternCoverage(blueprint.slots, packContext.projection.questionPatterns).assignments
    : undefined;

  const slotNumbersByPatternId = new Map<string, number[]>();
  assignments?.forEach((assignment, index) => {
    if (!assignment.pattern) return;
    const list = slotNumbersByPatternId.get(assignment.pattern.id) ?? [];
    list.push(index + 1);
    slotNumbersByPatternId.set(assignment.pattern.id, list);
  });

  const lines = blueprint.slots.map((slot, index) => {
    const assignment = assignments?.[index];
    const otherSlotNumbers = assignment?.pattern
      ? (slotNumbersByPatternId.get(assignment.pattern.id) ?? []).filter((n) => n !== index + 1)
      : [];
    return buildSlotBlock(slot, index, packContext, assignment, otherSlotNumbers);
  });

  return [
    "SORU PLANI (ZORUNLU):",
    `Aşağıda tam olarak ${blueprint.slots.length} soruluk bir plan bulunmaktadır. Bu planı harfiyen uygula:`,
    "- Soruları TAM OLARAK bu sırayla, atlamadan, birleştirmeden ve sırasını değiştirmeden üret.",
    "- Her sorunun türünü, bilişsel düzeyini, zorluğunu, yaklaşımını ve kazanımını kendi planlaman gerekmiyor " +
      "— hepsi burada belirlenmiştir; senin görevin bu çerçeveye uyan, kaliteli bir soru içeriği yazmaktır.",
    "- Her satırdaki \"Tür anahtarı\" ve \"Görsel anahtarı\" değerlerinde parantezden ÖNCE gelen kısa, " +
      "İngilizce/camelCase değer (ör. \"multipleChoice\", \"graph\") gerçek anahtardır; parantez içindeki " +
      "Türkçe etiket yalnızca senin anlaman içindir ve JSON çıktısına ASLA yazılmamalıdır.",
    "- \"Görsel\" alanı \"yok\" olmayan her soru için, belirtilen görsel türüne uygun bir \"visual\" nesnesi " +
      "döndürmelisin (bkz. GÖRSEL KULLANIMI bölümü).",
    ...(packContext
      ? [
          "- Bir sorunun altında [BİLGİ PAKETİ DESENİ — ZORUNLU] ile başlayan bir rehberlik varsa, bu rehberlik o " +
            "sorunun tür/düzey/zorluk/yaklaşım satırıyla ÇELİŞMEZ, onu TAMAMLAR ve o soru için bağlayıcıdır.",
        ]
      : []),
    lines.join("\n\n"),
  ].join("\n");
}

/**
 * Converts each `approach` value actually used in this blueprint into a
 * concrete writing behavior instead of leaving it as a label the model
 * must interpret on its own (see architecture plan / prompt-engineering
 * sprint: "do not treat approach values as labels").
 */
function buildApproachDefinitionsBlock(blueprint: QuizBlueprint): string {
  const usedApproaches = Array.from(new Set(blueprint.slots.map((slot) => slot.approach)));
  const lines = usedApproaches.flatMap((approach) => {
    const definitions = APPROACH_DEFINITIONS[approach] ?? [];
    return [`  ${APPROACH_LABELS[approach]} (${approach}):`, ...definitions.map((line) => `    - ${line}`)];
  });

  return [
    "YAKLAŞIM TANIMLARI (ZORUNLU):",
    "SORU PLANI'ndaki her \"Yaklaşım\" değeri yalnızca bir etiket değildir — aşağıda o yaklaşımın bir soruyu " +
      "nasıl yazman gerektiğini somut biçimde tanımlayan kurallar var. Her soruyu, kendi yaklaşımının " +
      "kurallarına göre yaz:",
    lines.join("\n"),
  ].join("\n");
}

/**
 * Same "operationalize, don't just label" treatment for cognitive levels —
 * only the levels actually present in this blueprint are shown.
 */
function buildCognitiveLevelDefinitionsBlock(blueprint: QuizBlueprint): string {
  const usedLevels = Array.from(new Set(blueprint.slots.map((slot) => slot.cognitiveLevel)));
  const lines = usedLevels.map(
    (level) => `  - ${COGNITIVE_LEVEL_LABELS[level]} (${level}): ${COGNITIVE_LEVEL_DEFINITIONS[level]}`
  );

  return [
    "BİLİŞSEL DÜZEY TANIMLARI (ZORUNLU):",
    "SORU PLANI'ndaki her \"Bilişsel düzey\" değeri, sorunun öğrenciden ne yapmasını isteyeceğini belirler:",
    lines.join("\n"),
  ].join("\n");
}

function buildContextBeforeQuestionBlock(): string {
  return [
    "BAĞLAM ÖNCE SORU KURALI (ZORUNLU):",
    "Seçilen yaklaşım bağlamsal düşünme gerektiriyorsa (Yeni nesil, Gerçek hayat bağlamlı, Problem çözme, " +
      "Deney/gözlem yorumlama, Grafik yorumlama, Yetkinlik temelli), soru MUTLAKA bir şey sormadan ÖNCE " +
      "anlamlı bir durum sunmalıdır. Bağlam, kavramı doğal ve zorunlu biçimde gerektirmelidir — kavram " +
      "bağlama sonradan eklenmiş gibi hissettirmemelidir.",
    "Kötü örnek: \"3/5 ile 2/5'i toplayınız.\"",
    "İyi örnek: \"Bir okul kantininde farklı boyutlardaki meyve suyu kutularının fiyatları aşağıdaki tabloda " +
      "verilmiştir...\" (ardından tabloyu yorumlamayı gerektiren bir soru gelir).",
  ].join("\n");
}

function buildQuestionQualityBlock(): string {
  return [
    "SORU KALİTE KURALLARI:",
    "- Soru kökleri net ve tek anlamlı olsun; belirsizlik veya birden fazla yoruma açık ifade kullanma.",
    "- Sorular arasında aynı kalıbı veya cümle yapısını tekrar etme.",
    "- Yapay, gerçek dışı veya zorlama hikayeler kurma; bağlam gerekiyorsa gerçekçi ve konuya uygun olsun.",
    "- Yaklaşımı Hızlı Tekrar veya Öğrenme Kontrolü olan ya da bilişsel düzeyi Hatırlama/Anlama olan sorular " +
      "dışında, doğrudan ezber/hatırlamayla cevaplanan sorulardan kaçın — öğrenciyi akıl yürütmeye teşvik et.",
    "- Çoktan seçmeli sorularda her yanlış seçenek gerçekçi bir öğrenci yanılgısını temsil etsin; rastgele " +
      "sayı veya ifade kullanma. En az bir çeldirici, açıkça yaygın bir öğrenci hatasına karşılık gelmelidir " +
      "(ör. kesir toplarken payda ve payı ayrı ayrı toplamak, birim çevirisini unutmak, işlem sırasını " +
      "karıştırmak). Her soruda tam olarak bir doğru cevap bulunmalıdır.",
    "- Öğrenciyi kandırmaya yönelik tuzak sorular yazma.",
    "- Türkçe'yi doğal ve akıcı kullan; makine çevirisi gibi görünen veya yapay zekâ tarafından yazılmış " +
      "hissi veren ifadelerden kaçın — deneyimli bir öğretmenin kendi sınavı için yazdığı gibi doğal olsun.",
    "- ARİTMETİK DOĞRULAMA (ZORUNLU): Her soru için, çözümü verilen sayılarla adım adım baştan sona kendin " +
      "yeniden hesapla ve \"answerExplanation\"/\"sampleAnswer\" içindeki sonucun bu hesapla BİREBİR uyduğunu " +
      "doğrula. Bir soru net, tam ve doğrulanabilir bir sayısal sonuca ulaşmıyorsa (ör. veriler yetersizse, " +
      "sonuç anlamsız bir kesir veya tutarsız çıkıyorsa) o soruyu farklı, temiz sonuç veren sayılarla yeniden " +
      "kur — asla belirsiz veya hesapla doğrulanamayan bir soruyu olduğu gibi bırakma.",
  ].join("\n");
}

function buildMathQualityBlock(): string {
  return [
    "MATEMATİK KALİTE KURALLARI:",
    "- Modern LGS tarzı akıl yürütmeyi yansıt: öğrenci, hangi işlemi yapacağına karar vermeden önce durumu " +
      "anlamak zorunda kalmalı.",
    "- Mekanik/doğrudan işlem sorularından kaçın; hesaplamadan önce düşünmeyi gerektiren sorular kur.",
    "- Uygun olduğunda özgün orantısal akıl yürütme (oran-orantı, ölçeklendirme, karşılaştırma) kullan.",
    "- Uygun olduğunda gerçekçi tablolar, anlamlı grafikler ve (konuya uygunsa) geometri kullan.",
    "- Aynı kavramı birden fazla temsille sun (ör. hem sayısal hem tablo/grafik/şekil üzerinden), tek bir " +
      "temsile bağlı kalma.",
    "- Aynı tür işlemi tekrar tekrar soran, birbirinin kopyası, tekdüze şablon sorulardan kaçın.",
  ].join("\n");
}

function buildScienceQualityBlock(): string {
  return [
    "FEN BİLİMLERİ KALİTE KURALLARI:",
    "- Bilimsel akıl yürütmeye odaklan: deneyler, gözlemler, değişkenler ve veri yorumlama kullan.",
    "- Öğrenciden kanıta dayalı düşünmesini iste — bir gözlem veya veri setinden çıkarım yapmasını gerektir.",
    "- Mümkün olduğunda tanım/ezber sorularından kaçın; bunun yerine özgün, gerçekçi bilimsel bağlamlar kullan.",
    "- Çeldiriciler, öğrencilerde sık görülen kavram yanılgılarına (misconception) dayansın.",
    "- Doğrulanamayan bilimsel iddialarda bulunma; yalnızca konuya uygun, bilinen bilimsel bilgiyi kullan.",
  ].join("\n");
}

function buildVisualUsageBlock(blueprint: QuizBlueprint): string {
  const usedTypes = new Set(blueprint.slots.map((slot) => slot.visualType).filter((type) => type !== "none"));
  const relevantMeta = QUIZ_VISUAL_TYPE_METADATA.filter((meta) => usedTypes.has(meta.key));
  // Each line shows the type-specific content nested INSIDE "data" — never
  // as top-level sibling fields — to prevent the model from flattening
  // fields (e.g. writing {"type":"experimentSetup","description":"..."})
  // instead of nesting them under "data".
  const lines = relevantMeta.map((meta) => `  - "${meta.key}" (${meta.label}): "data": ${meta.dataShape}`);

  return [
    "GÖRSEL KULLANIMI (ZORUNLU):",
    "- \"visual.type\" değeri, o sorunun SORU PLANI satırındaki \"Görsel anahtarı\" ile BİREBİR AYNI olmalıdır — " +
      "başka bir görsel türü daha uygun görünse bile ASLA değiştirme veya farklı bir tür kullanma.",
    "- Görseller bir öğretim aracıdır, ASLA süsleme amaçlı olmamalıdır: bir görsel içeren soru, o görsel " +
      "incelenmeden doğru cevaplanamamalıdır. Görsel zihinsel olarak kaldırıldığında öğrencinin soruyu " +
      "çözecek yeterli bilgisi kalmıyor olmalı — bunu kendi kendine test et.",
    "- Grafiklerde mutlaka eksen etiketleri, ölçek ve anlamlı, tutarlı değerler bulunmalıdır.",
    "- Tablolarda mutlaka gerçekçi, konuya uygun veriler bulunmalıdır.",
    "- Geometri şemalarında mutlaka ölçülebilir bilgi (uzunluk, açı, alan vb.) bulunmalıdır.",
    "- Bilimsel şemalar bilimsel olarak doğru olmalıdır.",
    "- Her görsel için \"altText\" alanına, görselin içerdiği bilgiyi özetleyen kısa bir açıklama yaz.",
    "- Her \"visual\" nesnesi TAM OLARAK şu üç alana sahip olmalıdır — başka üst seviye alan ekleme, alan " +
      "atlama veya bu alanları düzleştirip \"data\" nesnesinin dışına yazma:",
    "  {",
    '    "type": "<SORU PLANI\'ndaki Görsel anahtarı, ör. \\"graph\\">",',
    '    "altText": "<ZORUNLU — görselin içerdiği bilgiyi özetleyen kısa bir Türkçe açıklama; ASLA boş bırakma>",',
    '    "data": { <bu görsel türüne özgü alanlar SADECE burada, "data" nesnesinin İÇİNDE yer alır> }',
    "  }",
    '- "altText" hiçbir zaman eksik veya boş olamaz; her görsel nesnesinde mutlaka dolu bir "altText" olmalıdır.',
    "- Görseli ASLA HTML, SVG veya markdown olarak yazma; yalnızca yukarıdaki yapılandırılmış \"data\" alanını " +
      "kullan.",
    "- Bu plandaki sorularda kullanılması gereken görsel türleri ve \"data\" içeriği:",
    lines.join("\n"),
  ].join("\n");
}

function buildNoVisualQualityBlock(): string {
  return [
    "GÖRSELSİZ SORU KALİTESİ:",
    "Plan bazı sorular için görsel öngörmüyor. Bu sorularda kalite, görsel olan sorularla EŞİT düzeyde " +
      "olmalıdır:",
    "- Gerekli veriyi, gözlemi veya senaryoyu görsel yerine doğrudan soru metninin İÇİNDE, doğal bir dille " +
      "anlat (ör. bir tabloyu çizmek yerine değerleri cümle içinde ver).",
    "- Bağlamsal zenginlik yalnızca görsel olan sorularda değil, HER soruda aynı seviyede olmalıdır.",
  ].join("\n");
}

function buildAnswerKeyBlock(): string {
  return [
    "CEVAP ANAHTARI (ZORUNLU):",
    "- Her sorunun doğru cevabını, ilgili soru türü için istenen alanda (ör. \"correctOptionId\", " +
      '"correctAnswer", "correctPairs", "correctOrder") doğrudan soru nesnesinin içine yaz.',
    "- Doğru cevap bilgisi, sorunun kendisiyle her zaman tutarlı olmalıdır (ör. \"correctOptionId\" mutlaka " +
      '"options" listesindeki bir "id" olmalıdır).',
    "- Sayısal çoktan seçmeli sorularda: ÖNCE soruyu adım adım kendi içinde çöz, hesapladığın sayısal sonucu " +
      "bul; SONRA bu sonucu \"options\" listesine AYNEN bir seçenek olarak ekle ve \"correctOptionId\" değerini " +
      "o seçeneğe eşitle. Seçenekleri çözümden bağımsız olarak uydurma; \"answerExplanation\"daki sonuç ile " +
      "işaretlenen doğru seçeneğin sayısal değeri BİREBİR aynı olmalıdır — JSON'u yazmadan önce bunu tek tek " +
      "kontrol et.",
  ].join("\n");
}

function buildTopicSpecificityBlock(): string {
  return [
    "KONU ÖZGÜLLÜĞÜ KONTROLÜ (ZORUNLU):",
    "Her soruyu tamamlamadan önce kendine şunu sor: \"Bu soru, yalnızca konu adını değiştirerek başka bir " +
      "konu için de kullanılabilir mi?\" Cevap EVET ise, soruyu bu dersin somut sayılarına, verilerine veya " +
      "senaryosuna özgü hale getirecek şekilde yeniden yaz.",
  ].join("\n");
}

function buildQualityChecklistBlock(): string {
  return [
    "KALİTE KONTROL LİSTESİ (ZORUNLU — her soruyu döndürmeden önce içsel olarak kontrol et):",
    "✓ anlamlı bağlam var mı?",
    "✓ Türkçe doğal mı?",
    "✓ yetkinlik temelli akıl yürütme gerektiriyor mu?",
    "✓ konuya özgü mü (başka bir konu için de kullanılabilir durumda değil mi)?",
    "✓ özgün, öğretmen diliyle mi yazılmış (yapay zekâ hissi vermiyor mu)?",
    "✓ atanan bilişsel düzeye uygun mu?",
    "✓ atanan soru yaklaşımına uygun mu?",
    "✓ (varsa) görsel gerçekten gerekli ve bilgilendirici mi?",
    "✓ tek bir doğru cevap var mı?",
    "✓ sınıfta doğrudan kullanılabilecek kalitede mi?",
    "Bu sorulardan HERHANGİ birine cevabın \"Hayır\" ise, o soruyu son JSON'a yazmadan önce yeniden yaz.",
  ].join("\n");
}

function buildOutputStructureBlock(blueprint: QuizBlueprint): string {
  const usedTypes = new Set(blueprint.slots.map((slot) => slot.type));
  const typeLines = QUIZ_QUESTION_TYPE_METADATA.filter((meta) => usedTypes.has(meta.key)).map(
    (meta) => `  - "${meta.key}" (${meta.label}): "prompt" alanına ek olarak ${meta.aiFields}`
  );

  return [
    "GEREKLİ ÇIKTI YAPISI:",
    "Yanıt, tam olarak aşağıdaki alanlara sahip TEK bir JSON nesnesi olmalıdır (başka hiçbir üst seviye alan ekleme):",
    '- "title": Sınav/quiz için kısa, açıklayıcı bir başlık (string).',
    `- "questions": Tam olarak ${blueprint.slots.length} öğe içeren bir DİZİ (array). Dizideki her öğe, ` +
      "SORU PLANI'ndaki karşılık gelen sıradaki türde olmalıdır ve şu ortak alanlara sahip olmalıdır:",
    '  - "type": SORU PLANI\'ndaki ilgili satırın "Tür anahtarı" değeri — yalnızca şu camelCase ' +
      'değerlerden biri olabilir: multipleChoice, trueFalse, shortAnswer, fillInBlank, matching, ordering, ' +
      'openEnded. ASLA Türkçe etiketi (ör. "Çoktan seçmeli") yazma; her zaman İngilizce anahtarı ' +
      '(ör. "multipleChoice") yaz.',
    '  - "prompt": Sorunun kendisi (string, düz metin — markdown veya HTML kullanma).',
    '  - "visual": Yalnızca plan bu soru için bir görsel öngörüyorsa gerekli; GÖRSEL KULLANIMI bölümündeki ' +
      '"type" / "altText" / "data" şablonuna BİREBİR uymalı — "altText" asla eksik olamaz ve tür alanları ' +
      'ASLA "data" nesnesinin dışına yazılamaz.',
    '  - "points" (isteğe bağlı): Sorunun puanı (number).',
    '  - "answerExplanation" (isteğe bağlı): Doğru cevabın kısa açıklaması.',
    "- Her soru türüne özgü ek alanlar:",
    typeLines.join("\n"),
    '- Soru nesnelerine "id", "audit", "cognitiveLevel", "difficulty", "approach" veya "learningOutcome" gibi ' +
      "planlama alanları EKLEME; bunlar sistem tarafından otomatik olarak eklenir.",
  ].join("\n");
}

function buildFinalCountCheckBlock(blueprint: QuizBlueprint): string {
  return [
    "SON SAYIM KONTROLÜ (ZORUNLU — JSON'u yazmadan hemen önce yap):",
    `"questions" dizisindeki öğeleri say. Tam olarak ${blueprint.slots.length} olmalıdır — ne eksik ne fazla. ` +
      `${blueprint.slots.length} değilse, eksik olan soruyu SORU PLANI'ndaki ilgili sıradaki türe göre ekle veya ` +
      "fazlalığı çıkar, sonra JSON'u yaz.",
    "SORU PLANI'ndaki SON birkaç soru, ilk sorular kadar özenli ve TAM olmalıdır — listenin sonuna doğru " +
      "sorunun kısaltılması, atlanması, jenerik hâle getirilmesi veya kendi deseninden/rehberliğinden " +
      "uzaklaşması KABUL EDİLEMEZ. Her soruyu, sanki tek başına yazıyormuşsun gibi aynı titizlikle tamamla.",
  ].join("\n");
}

function buildOutputFormatBlock(): string {
  return [
    "ÇIKTI FORMATI (ZORUNLU):",
    "- Yalnızca geçerli JSON döndür.",
    "- Markdown kod bloğu (```) kullanma.",
    "- JSON dışında hiçbir açıklama, yorum veya giriş cümlesi ekleme.",
    "- Belirtilen alan ve anahtar adlarını birebir koru; yeni alan ekleme veya isim değiştirme.",
    "- Kendinden bir yapay zekâ olarak bahsetme.",
  ].join("\n");
}

function buildInstructions(blueprint: QuizBlueprint, packContext?: QuizGeneratorPackContext): string {
  const blocks = [`ROL:\n${AI_ROLE}`, MEB_LGS_PHILOSOPHY_BLOCK];

  if (packContext) {
    blocks.push(buildKnowledgePackOverviewBlock(packContext));
  }

  blocks.push(
    buildQuestionPlanBlock(blueprint, packContext),
    buildApproachDefinitionsBlock(blueprint),
    buildCognitiveLevelDefinitionsBlock(blueprint)
  );

  if (blueprint.slots.some((slot) => CONTEXTUAL_APPROACHES.has(slot.approach))) {
    blocks.push(buildContextBeforeQuestionBlock());
  }

  blocks.push(buildQuestionQualityBlock());

  // Skipped when a Knowledge Pack is present: its overview + per-slot
  // guidance already supersede these generic subject-quality bullets with
  // more specific direction, and dropping the duplication measurably
  // shortens an already-long, pack-guidance-heavy prompt.
  if (!packContext && isMathSubject(blueprint.subject)) blocks.push(buildMathQualityBlock());
  if (!packContext && isScienceSubject(blueprint.subject)) blocks.push(buildScienceQualityBlock());
  if (blueprint.slots.some((slot) => slot.visualType !== "none")) blocks.push(buildVisualUsageBlock(blueprint));
  if (blueprint.slots.some((slot) => slot.visualType === "none")) blocks.push(buildNoVisualQualityBlock());
  if (blueprint.includeAnswerKey) blocks.push(buildAnswerKeyBlock());

  blocks.push(buildTopicSpecificityBlock());
  blocks.push(buildQualityChecklistBlock());

  if (packContext) {
    blocks.push(buildKnowledgePackSelfCheckBlock());
  }

  blocks.push(buildOutputStructureBlock(blueprint));
  blocks.push(buildFinalCountCheckBlock(blueprint));
  blocks.push(buildOutputFormatBlock());

  return blocks.join("\n\n");
}

/**
 * EduPilot's Prompt Builder for the Quiz Generator. Unlike the Lesson
 * Planner's prompt builder, this consumes a `QuizBlueprint` — the fully
 * planned question-by-question spec produced by `buildQuizBlueprint` —
 * rather than the raw teacher form. The model's job is narrowed to writing
 * good question content that satisfies each already-decided slot, not
 * planning the quiz itself.
 *
 * Pure and side-effect free: no network calls, no `process.env` access, no
 * UI/React dependency, and `blueprint` is only ever read, never mutated.
 *
 * `packContext` is optional and additive only: omitted, this produces the
 * exact same instructions as before Knowledge Pack integration existed.
 * Knowledge Pack resolution itself never happens here — the caller resolves
 * a pack and projects it (see `resolveKnowledgePackForQuiz` /
 * `projectPackForQuizGenerator`) before calling this function.
 */
export function buildQuizPrompt(blueprint: QuizBlueprint, packContext?: QuizGeneratorPackContext): QuizPrompt {
  return {
    ...blueprint,
    instructions: buildInstructions(blueprint, packContext),
  };
}
