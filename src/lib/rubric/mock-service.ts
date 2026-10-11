import { assembleRubric, RubricProviderError, type RubricGenerationService } from "@/lib/rubric/generation";
import { validateRubricBody } from "@/lib/rubric/schema";
import type { Rubric, RubricPrompt, RubricTaskType } from "@/types/rubric";

interface MockCriterion {
  title: string;
  /** "Öğrenci …" cümlesinin yüklemi: "araştırma sürecini planlar". */
  action: string;
  question: string;
  hint: string;
  kb: string;
  /** Bu kritere bağlanacak beceri kodu türü. */
  link: "outcome" | "sdb" | "values" | "literacy";
}

const TEMPLATES: Record<RubricTaskType, MockCriterion[]> = {
  proje: [
    { title: "Planlama ve Süreç Yönetimi", action: "proje adımlarını planlar ve zamanında uygular", question: "Projeni adım adım planlayıp zamanında bitirdin mi?", hint: "Planındaki her adımın yanına tarih yaz.", kb: "Karar verme", link: "values" },
    { title: "Konu Bilgisinin Doğruluğu", action: "konuya ilişkin bilgileri doğru ve tutarlı biçimde kullanır", question: "Projendeki bilgiler doğru ve konuyla ilgili mi?", hint: "Her bilgiyi en az bir kaynakla karşılaştır.", kb: "Çıkarım yapma", link: "outcome" },
    { title: "Araştırma ve Kaynak Kullanımı", action: "güvenilir kaynaklardan bilgi toplar ve kaynaklarını gösterir", question: "Kaynaklarını doğru gösterdin mi?", hint: "Kaynakçanı projenin sonuna ekle.", kb: "Bilgi toplama", link: "literacy" },
    { title: "Özgünlük ve Yaratıcılık", action: "ürününde özgün fikirler ve yaratıcı çözümler ortaya koyar", question: "Projende kendi fikrini kullandın mı?", hint: "Seni başkalarından ayıran bir öğeyi işaretle.", kb: "Yaratıcı düşünme", link: "outcome" },
    { title: "Ürünün Sunumu ve İletişim", action: "ürününü düzenli ve anlaşılır biçimde sunar", question: "Ürününü arkadaşlarının anlayacağı şekilde anlattın mı?", hint: "Sunmadan önce bir arkadaşına anlatıp dene.", kb: "Özetleme", link: "sdb" },
  ],
  sunum: [
    { title: "İçeriğin Doğruluğu ve Düzeni", action: "sunum içeriğini doğru bilgilerle mantıklı bir sırada düzenler", question: "Sunumundaki bilgiler doğru ve sıralı mı?", hint: "Giriş, gelişme ve sonuç bölümlerini ayır.", kb: "Sınıflandırma", link: "outcome" },
    { title: "Sözlü İfade ve Beden Dili", action: "anlaşılır bir ses tonu, göz teması ve uygun beden dili kullanır", question: "Sesin duyuluyor ve göz teması kuruyor muydun?", hint: "Arka sıradaki arkadaşına göre sesini ayarla.", kb: "Yorumlama", link: "sdb" },
    { title: "Görsel ve Yardımcı Materyal", action: "konuyu destekleyen görsel ve materyalleri etkili kullanır", question: "Görsellerin anlattığın konuyu destekliyor mu?", hint: "Her görselin altına kısa bir açıklama koy.", kb: "Yorumlama", link: "literacy" },
    { title: "Süre Yönetimi", action: "sunumu verilen süre içinde tamamlar", question: "Sunumunu verilen sürede bitirdin mi?", hint: "Evde süre tutarak bir kez prova yap.", kb: "Karar verme", link: "values" },
    { title: "Konu Hâkimiyeti ve Sorulara Yanıt", action: "dinleyici sorularını konuya hâkim biçimde yanıtlar", question: "Arkadaşlarının sorularını yanıtlayabildin mi?", hint: "Sorulabilecek üç soruyu önceden düşün.", kb: "Eleştirel düşünme", link: "outcome" },
  ],
  deney: [
    { title: "Araştırma Sorusu ve Hipotez", action: "deneye uygun bir araştırma sorusu ve sınanabilir hipotez kurar", question: "Deneyinin sorusunu ve tahminini yazdın mı?", hint: "Tahminini \"Eğer … ise …\" diye yaz.", kb: "Hipotez kurma", link: "outcome" },
    { title: "Deney Düzeneği ve Güvenlik", action: "deney düzeneğini kurar ve güvenlik kurallarına uyar", question: "Düzeneği kurarken güvenlik kurallarına uydun mu?", hint: "Başlamadan önce güvenlik listesini kontrol et.", kb: "Deney yapma", link: "values" },
    { title: "Veri Toplama ve Kaydetme", action: "gözlem ve ölçümlerini düzenli biçimde kaydeder", question: "Ölçümlerini tabloya düzenli kaydettin mi?", hint: "Her ölçümün birimini yazmayı unutma.", kb: "Veri toplama ve kaydetme", link: "literacy" },
    { title: "Verileri Yorumlama ve Sonuç Çıkarma", action: "verileri hipotezle ilişkilendirerek kanıta dayalı sonuç çıkarır", question: "Sonucunu topladığın verilerle açıkladın mı?", hint: "Sonuç cümlende en az bir ölçümünü kullan.", kb: "Çıkarım yapma", link: "outcome" },
    { title: "Grup İçi İş Birliği", action: "deney sürecinde görev paylaşımına uyar ve grubuna katkı sağlar", question: "Grubunda sana düşen görevi yaptın mı?", hint: "Görevini deney föyünde işaretle.", kb: "Problem çözme", link: "sdb" },
  ],
  grup: [
    { title: "Görev Paylaşımı ve Sorumluluk", action: "grupta üstlendiği görevi zamanında ve eksiksiz yerine getirir", question: "Grupta üstlendiğin görevi zamanında yaptın mı?", hint: "Görev listesinde adının yanına tarih yaz.", kb: "Karar verme", link: "values" },
    { title: "İletişim ve İş Birliği", action: "grup üyelerini dinler ve fikirlerini saygıyla paylaşır", question: "Arkadaşlarını dinleyip fikrini kibarca söyledin mi?", hint: "Konuşmadan önce arkadaşının sözünü bitirmesini bekle.", kb: "Sorgulama", link: "sdb" },
    { title: "Konu Bilgisinin Doğruluğu", action: "grup ürününe konuyla ilgili doğru bilgiler katar", question: "Grubuna doğru bilgilerle katkı verdin mi?", hint: "Bilgini kitaptan ya da güvenilir bir kaynaktan doğrula.", kb: "Bilgi toplama", link: "outcome" },
    { title: "Ortak Ürünün Niteliği", action: "grubun ortak ürününü düzenli ve amaca uygun biçimde tamamlar", question: "Grubunuzun ürünü görevin istediklerini karşılıyor mu?", hint: "Teslimden önce görev yönergesini birlikte okuyun.", kb: "Problem çözme", link: "outcome" },
  ],
  portfolyo: [
    { title: "Ürün Seçimi ve Çeşitliliği", action: "gelişimini gösteren farklı türde ürünler seçer", question: "Dosyana farklı türde çalışmalar koydun mu?", hint: "En az üç farklı türde çalışma seç.", kb: "Sınıflandırma", link: "outcome" },
    { title: "Gelişimin Görünürlüğü", action: "ilk ve son çalışmaları arasındaki gelişimi gösterir", question: "İlk ve son çalışman arasındaki farkı gösterdin mi?", hint: "Çalışmalarını tarih sırasına koy.", kb: "Karşılaştırma", link: "outcome" },
    { title: "Öz Yansıtma", action: "her ürün için güçlü yönlerini ve geliştireceği noktaları yazar", question: "Her çalışman için neyi geliştireceğini yazdın mı?", hint: "Her çalışmaya kısa bir not kâğıdı ekle.", kb: "Yorumlama", link: "sdb" },
    { title: "Düzen ve Bütünlük", action: "portfolyosunu düzenli, eksiksiz ve zamanında teslim eder", question: "Dosyan düzenli ve zamanında teslim edildi mi?", hint: "İçindekiler sayfası hazırla.", kb: "Özetleme", link: "values" },
  ],
};

/** Seviye tanımı kalıpları (en düşükten en yükseğe); resmî, üçüncü tekil dil. */
const LEVEL_PATTERNS: Record<3 | 4, ((action: string) => string)[]> = {
  3: [
    (action) => `Öğretmen desteğiyle ${action}; önemli eksiklikler vardır.`,
    (action) => `Büyük ölçüde ${action}; küçük eksiklikler vardır.`,
    (action) => `Bağımsız olarak, eksiksiz ve özenle ${action}.`,
  ],
  4: [
    (action) => `Desteğe rağmen ${action.replace(/r$/, "rken")} zorlanır; ürün belirgin biçimde eksiktir.`,
    (action) => `Öğretmen desteğiyle kısmen ${action}; birkaç önemli eksiklik vardır.`,
    (action) => `Büyük ölçüde bağımsız olarak ${action}; küçük eksiklikler vardır.`,
    (action) => `Bağımsız olarak, eksiksiz ve özgün biçimde ${action}.`,
  ],
};

/**
 * Yapay zekâ olmadan, deterministik rubrik. Çıktısı gerçek servisle aynı
 * doğrulayıcıdan geçer; geliştirme ve testlerde kullanılır.
 */
export const mockRubricGenerationService: RubricGenerationService = {
  async generate(prompt: RubricPrompt): Promise<Rubric> {
    const { input, curriculum } = prompt;
    const templates = TEMPLATES[input.taskType];
    const outcomes = curriculum?.outcomes.map((outcome) => outcome.code) ?? [];
    const pick = {
      sdb: curriculum?.sdb[0]?.code,
      values: curriculum?.values[0]?.code,
      literacy: curriculum?.literacy[0]?.code,
    };
    // Her çıktı kodu en az bir "outcome" kriterine dağıtılır; kalan çıktılar son kritere eklenir.
    const outcomeSlots = templates.map((template, index) => (template.link === "outcome" ? index : -1)).filter((index) => index >= 0);
    const outcomeCodesFor = (index: number) => {
      const slot = outcomeSlots.indexOf(index);
      if (slot < 0 || outcomes.length === 0) return [];
      return outcomes.filter((_, codeIndex) => codeIndex % outcomeSlots.length === slot);
    };

    const raw = {
      taskTitle: `${input.topic.trim()} ${input.taskType === "deney" ? "Deney Raporu" : "Görevi"}`,
      teacherTaskSummary: `Öğrenciler ${input.topic.trim()} konusunda bir görev hazırlar ve bu ölçekte belirtilen ölçütlere göre değerlendirilir.`,
      studentTaskSummary: `${input.topic.trim()} konusunda görevini hazırla; bitirince aşağıdaki soruları kendine sor.`,
      criteria: templates.map((template, index) => ({
        weight: template.link === "outcome" ? 3 : 2,
        conceptualSkills: [template.kb],
        skillCodes: [
          ...outcomeCodesFor(index),
          ...(template.link !== "outcome" && pick[template.link] ? [pick[template.link]] : []),
        ],
        teacherCriterion: {
          title: template.title,
          description: `Öğrenci ${template.action}.`,
          levels: LEVEL_PATTERNS[input.scale].map((pattern) => pattern(template.action)),
        },
        studentFriendlyCriterion: { question: template.question, hint: template.hint },
      })),
      holisticLevels:
        input.rubricType === "butuncul"
          ? LEVEL_PATTERNS[input.scale].map((pattern, index) => ({
              teacher: pattern("görevin tüm ölçütlerini karşılar"),
              student: ["Görevin birçok parçası eksik kaldı.", "Görevin bir kısmını tamamladın.", "Görevin neredeyse tamamını yaptın.", "Görevin tüm parçalarını eksiksiz ve özenle tamamladın."].slice(-input.scale)[index],
            }))
          : [],
    };

    const validation = validateRubricBody(raw, prompt);
    if (!validation.body) {
      throw new RubricProviderError("schema_validation_failed", validation.issues.map((issue) => issue.message).join(" | "), validation.issues);
    }
    return assembleRubric(prompt, validation.body);
  },
};
