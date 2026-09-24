import { describe, expect, it } from "vitest";

import { buildQuizBlueprint } from "@/lib/ai/blueprint/quiz-blueprint";
import { buildQuizPrompt } from "@/lib/ai/prompts/quiz-generator-prompt";
import { validateQuizResponse } from "@/lib/ai/schemas/quiz-schema";
import type { GorselSoruGorevTanimi, GorselSoruSorunu } from "@/lib/quiz-generator/gorsel-sorular/ortak";
import {
  GORSEL_SORU_TANIMLARI,
  dogrulaGorselSoru,
  gorevTanimi,
  gorselSoruCevapMetni,
} from "@/lib/quiz-generator/gorsel-sorular/tanimlar";
import { mockQuizGenerationService } from "@/lib/quiz-generator/mock-generation-service";
import { GORSEL_SORU_TIPLERI, type GorselSoruPlani, type GorselSoruTipi } from "@/types/gorsel-soru";
import type { QuizFormInput } from "@/types/quiz-generator";

type Veri = Record<string, unknown>;

function klonla<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const TUM_PLANLAR: GorselSoruPlani[] = GORSEL_SORU_TIPLERI.flatMap((tip) =>
  Object.keys(GORSEL_SORU_TANIMLARI[tip].gorevler).map((gorev) => ({ tip, gorev }) as GorselSoruPlani)
);

function ornekVeri(tip: GorselSoruTipi, gorev: string): Veri {
  return klonla(gorevTanimi({ tip, gorev } as GorselSoruPlani).ornek.veri);
}

function dogrulaVeri(tip: GorselSoruTipi, veri: unknown) {
  const sorunlar: GorselSoruSorunu[] = [];
  const sonuc = dogrulaGorselSoru({ tip, veri }, "q", sorunlar);
  const icVeri = sonuc?.icerik.veri as Veri | undefined;
  return { sonuc, sorunlar, icVeri };
}

describe("registry", () => {
  it.each(TUM_PLANLAR.map((plan) => [`${plan.tip}/${plan.gorev}`, plan] as const))(
    "%s: prompt'taki örnek kendi doğrulayıcısından ve kendi planından geçer",
    (_ad, plan) => {
      const sorunlar: GorselSoruSorunu[] = [];
      const sonuc = dogrulaGorselSoru(gorevTanimi(plan).ornek, "q", sorunlar, plan);
      expect(sorunlar).toEqual([]);
      expect(sonuc?.icerik.tip).toBe(plan.tip);
    }
  );

  it("plandan farklı bir görevle yazılmış soruyu reddeder", () => {
    const sorunlar: GorselSoruSorunu[] = [];
    const ornek = gorevTanimi({ tip: "sayi_dogrusu", gorev: "siralama" }).ornek;
    expect(dogrulaGorselSoru(ornek, "q", sorunlar, { tip: "sayi_dogrusu", gorev: "kesriGoster" })).toBeUndefined();
    expect(sorunlar[0].path).toBe("q.veri.gorev");
  });

  it("registry dışındaki bir tipi reddeder", () => {
    const sorunlar: GorselSoruSorunu[] = [];
    expect(dogrulaGorselSoru({ tip: "pasta_grafigi", veri: {} }, "q", sorunlar)).toBeUndefined();
  });
});

const FORM: QuizFormInput = {
  quizType: "exitTicket",
  subject: "Matematik",
  gradeLevel: "5. Sınıf",
  topic: "Kesirler",
  objectives: "Birim kesirleri karşılaştırır.",
  questionCount: 3,
  questionTypes: ["gorselSoru"],
  questionApproach: "newGeneration",
  cognitiveLevel: "analyze",
  difficulty: "medium",
  visualUsage: "none",
  visualTypes: [],
  includeAnswerKey: true,
  includeExplanations: true,
};

function planlar(form: QuizFormInput): GorselSoruPlani[] {
  return buildQuizBlueprint(form).slots.flatMap((slot) => (slot.gorselPlani ? [slot.gorselPlani] : []));
}

describe("görsel soru planı (Blueprint)", () => {
  it("tip sayısı yettiğinde her tipten en fazla bir soru atar", () => {
    const tipler = planlar(FORM).map((plan) => plan.tip);
    expect(new Set(tipler).size).toBe(3);
  });

  it("tip tekrar ettiğinde görev de değişir (emoji değil görev çeşitliliği)", () => {
    const altı = planlar({ ...FORM, questionCount: 6 });
    for (const tip of GORSEL_SORU_TIPLERI) {
      const gorevler = altı.filter((plan) => plan.tip === tip).map((plan) => plan.gorev);
      expect(gorevler).toHaveLength(2);
      expect(new Set(gorevler).size).toBe(2);
    }
  });

  it("kesir dışı konularda yalnızca derse bağımsız tip ve görevleri atar", () => {
    const geometri = planlar({ ...FORM, topic: "Üçgenler", objectives: "Üçgenin iç açılarını bulur." });
    expect(geometri.every((plan) => plan.tip === "gercek_hayat_senaryo" && plan.gorev === "cokAdimliCikarim")).toBe(true);
  });

  it("deterministiktir: aynı form her zaman aynı planı verir", () => {
    expect(planlar(FORM)).toEqual(planlar(FORM));
  });
});

describe("sayi_dogrusu", () => {
  it("siralama: yanlış işaretlenen cevabı veriye göre onarır ve çözümü veriden yazar", () => {
    const veri = ornekVeri("sayi_dogrusu", "siralama");
    veri.dogruSecenekId = "A";
    veri.cozum = "Doğru cevap A'dır.";
    const { icVeri, sonuc } = dogrulaVeri("sayi_dogrusu", veri);
    expect(icVeri?.dogruSecenekId).toBe("B");
    expect(sonuc?.cozum).toContain("1/8 < 1/5 < 1/3");
  });

  it("siralama: kök 'siralama' alanının tersini soruyorsa reddeder", () => {
    const veri = ornekVeri("sayi_dogrusu", "siralama");
    veri.soru = "Birim kesirlerin büyükten küçüğe doğru sıralanışı hangisidir?";
    expect(dogrulaVeri("sayi_dogrusu", veri).sonuc).toBeUndefined();
  });

  it("hedefeEnYakin: iki işaretçi hedefe eşit uzaklıktaysa reddeder", () => {
    const veri = ornekVeri("sayi_dogrusu", "hedefeEnYakin");
    // 1/2'ye 2/5 ile 3/5 eşit uzaklıktadır.
    (veri.isaretciler as Veri[])[1] = { id: "i2", simge: "🐝", ad: "arı", pay: 3, payda: 5, aralikSonu: 1 };
    const { sonuc, sorunlar } = dogrulaVeri("sayi_dogrusu", veri);
    expect(sonuc).toBeUndefined();
    expect(sorunlar.some((sorun) => sorun.message.includes("eşit uzaklıkta"))).toBe(true);
  });

  it("hedefeEnYakin: hedefin farklı yazımlarını kabul eder (gerçek çıktı: '1 tam 1/2')", () => {
    const veri = ornekVeri("sayi_dogrusu", "hedefeEnYakin");
    veri.hedef = { tam: 1, pay: 1, payda: 2 };
    (veri.isaretciler as Veri[]).forEach((isaretci) => (isaretci.aralikSonu = 2));
    for (const soru of ["Hangi nesne 1 tam 1/2'ye en yakındır?", "Hangi nesne 3/2'ye en yakındır?"]) {
      veri.soru = soru;
      expect(dogrulaVeri("sayi_dogrusu", veri).sorunlar).toEqual([]);
    }
  });

  it("hedefeEnYakin: soru kökü hedef kesri anmıyorsa reddeder", () => {
    const veri = ornekVeri("sayi_dogrusu", "hedefeEnYakin");
    veri.soru = "Hangi hayvan yarıma en yakındır?";
    expect(dogrulaVeri("sayi_dogrusu", veri).sonuc).toBeUndefined();
  });

  it("isaretliKesir: doğru kesir hiçbir şıkta yoksa işaretli şıkkı doğru kesirle değiştirir", () => {
    const veri = ornekVeri("sayi_dogrusu", "isaretliKesir");
    (veri.secenekler as Veri[])[1] = { id: "B", tam: null, pay: 5, payda: 5 };
    const { icVeri } = dogrulaVeri("sayi_dogrusu", veri);
    expect((icVeri?.secenekler as Veri[])[1]).toMatchObject({ id: "B", pay: 7, payda: 5 });
  });

  it("isaretliKesir/kesriGoster: bir bölme çizgisine denk gelmeyen işaretçiyi reddeder", () => {
    const veri = ornekVeri("sayi_dogrusu", "kesriGoster");
    // 1/3, her birimi 8 parçaya bölünmüş bir doğruda hiçbir çizgiye denk gelmez.
    (veri.isaretciler as Veri[])[0].pay = 1;
    (veri.isaretciler as Veri[])[0].payda = 3;
    expect(dogrulaVeri("sayi_dogrusu", veri).sonuc).toBeUndefined();
  });

  it("kesriGoster: hiçbir işaretçi hedefte değilse işaretli şıkkın işaretçisini hedefe taşır", () => {
    // Gerçek çıktıdaki hatanın benzeri: model C şıkkını (salyangoz) doğru saymış ama onu 6/8'e koymuş.
    const veri = ornekVeri("sayi_dogrusu", "kesriGoster");
    veri.hedef = { tam: null, pay: 5, payda: 8 };
    veri.soru = "5/8 kesri hangi hayvanla gösterilmiştir?";
    const { icVeri, sonuc } = dogrulaVeri("sayi_dogrusu", veri);
    expect((icVeri?.isaretciler as Veri[])[2]).toMatchObject({ id: "i3", pay: 5, payda: 8 });
    expect(icVeri?.dogruSecenekId).toBe("C");
    expect(sonuc?.cozum).toContain("5. çizgi");
  });

  it("kesriGoster: hedef hiçbir bölme çizgisine denk gelmiyorsa onarmaz, reddeder", () => {
    const veri = ornekVeri("sayi_dogrusu", "kesriGoster");
    veri.hedef = { tam: null, pay: 1, payda: 3 };
    veri.soru = "1/3 kesri hangi hayvanla gösterilmiştir?";
    expect(dogrulaVeri("sayi_dogrusu", veri).sonuc).toBeUndefined();
  });
});

describe("kesir_kartlari", () => {
  it("ifadeDegerlendirme: gerçek model çıktısında niyetiyle çelişen iddiayı düzeltir", () => {
    // gpt-4o'dan gelen ve reddedilen ham çıktı (ilgili alanlar): Mert "yanlış" olarak tasarlanmış
    // ama 5/6 için doğru olan "basit" iddiasını almıştı; dört ifade de doğru olduğundan soru cevapsızdı.
    const veri = {
      gorev: "ifadeDegerlendirme",
      baglam: null,
      kartlar: [
        { id: "k1", renk: "mor", tam: null, pay: 5, payda: 6 },
        { id: "k2", renk: "turuncu", tam: 1, pay: 2, payda: 3 },
        { id: "k3", renk: "mavi", tam: null, pay: 7, payda: 7 },
        { id: "k4", renk: "sari", tam: null, pay: 1, payda: 4 },
      ],
      ogrenciler: [
        { id: "o1", ad: "Mert", kartId: "k1", dogruMu: false, iddia: "basit" },
        { id: "o2", ad: "Zehra", kartId: "k2", dogruMu: true, iddia: "tamSayili" },
        { id: "o3", ad: "Ali", kartId: "k3", dogruMu: true, iddia: "bilesik" },
        { id: "o4", ad: "Derya", kartId: "k4", dogruMu: true, iddia: "birim" },
      ],
      soruBicimi: "yanlisSoyleyenler",
      soru: "Bu ifadelerden hangisi yanlıştır?",
      cozum: "5/6 basit kesirdir (Mert yanlış).",
      secenekler: [
        { id: "A", ogrenciIdleri: ["o1"] },
        { id: "B", ogrenciIdleri: ["o2"] },
        { id: "C", ogrenciIdleri: ["o3"] },
        { id: "D", ogrenciIdleri: ["o4"] },
      ],
      dogruSecenekId: "A",
    };
    const { icVeri, sonuc, sorunlar } = dogrulaVeri("kesir_kartlari", veri);
    expect(sorunlar).toEqual([]);
    expect((icVeri?.ogrenciler as Veri[])[0].iddia).toBe("bilesik");
    expect(icVeri?.dogruSecenekId).toBe("A");
    expect(sonuc?.cozum).toContain("Mert yanlış söylüyor");
  });

  it("ifadeDegerlendirme: herkesin doğru söylediği soruyu reddeder", () => {
    const veri = ornekVeri("kesir_kartlari", "ifadeDegerlendirme");
    const ogrenciler = veri.ogrenciler as Veri[];
    ogrenciler[1] = { ...ogrenciler[1], iddia: "basit", dogruMu: true };
    ogrenciler[3] = { ...ogrenciler[3], iddia: "bilesik", dogruMu: true };
    expect(dogrulaVeri("kesir_kartlari", veri).sonuc).toBeUndefined();
  });

  it("turuBul: aranan türde birden fazla kart varsa reddeder", () => {
    const veri = ornekVeri("kesir_kartlari", "turuBul");
    (veri.kartlar as Veri[])[0].pay = 9; // 9/5 de bileşik olur
    expect(dogrulaVeri("kesir_kartlari", veri).sonuc).toBeUndefined();
  });

  it("gosterimDonusumu: yanlış işaretlenen cevabı doğru tam sayılı gösterime onarır", () => {
    const veri = ornekVeri("kesir_kartlari", "gosterimDonusumu");
    veri.dogruSecenekId = "B";
    const { icVeri, sonuc } = dogrulaVeri("kesir_kartlari", veri);
    expect(icVeri?.dogruSecenekId).toBe("A");
    expect(gorselSoruCevapMetni(sonuc!.icerik)).toBe("A) 2 3/4");
  });

  it("gosterimDonusumu: kök hedef kartı rengiyle anmıyorsa reddeder", () => {
    const veri = ornekVeri("kesir_kartlari", "gosterimDonusumu");
    veri.soru = "Karttaki kesrin tam sayılı gösterimi hangisidir?";
    expect(dogrulaVeri("kesir_kartlari", veri).sonuc).toBeUndefined();
  });
});

describe("gercek_hayat_senaryo", () => {
  it("doğru cevaptaki kesir senaryoda aynen geçiyorsa (cevap metinde verilmiş) reddeder", () => {
    const veri = ornekVeri("gercek_hayat_senaryo", "karsilastirma");
    veri.senaryo = `${veri.senaryo as string} Aradaki fark 1/8 kovadır.`;
    const { sonuc, sorunlar } = dogrulaVeri("gercek_hayat_senaryo", veri);
    expect(sonuc).toBeUndefined();
    expect(sorunlar[0].message).toContain("1/8");
  });

  it("gerçek çıktılardaki yanlış alarmları üretmez: tam sayılı cevap ve sıralama cevabı", () => {
    // Cevap "1 3/4 kg", senaryoda "3/4 kg" geçiyor: 1 3/4 ≠ 3/4, cevap metinde verilmemiş.
    const kalan = ornekVeri("gercek_hayat_senaryo", "kalaniBulma");
    kalan.senaryo = "Bir market 3 kilogram peynir aldı. Gün içinde 1/2 kilogramını kahvaltıda, 3/4 kilogramını sandviçte kullandı.";
    kalan.secenekler = [
      { id: "A", metin: "5/4 kg" },
      { id: "B", metin: "1 1/4 kg" },
      { id: "C", metin: "1 3/4 kg" },
    ];
    kalan.dogruSecenekId = "C";
    expect(dogrulaVeri("gercek_hayat_senaryo", kalan).sorunlar).toEqual([]);

    // Sıralama cevabı senaryodaki kesirleri içerir; bu doğaldır.
    const siralama = ornekVeri("gercek_hayat_senaryo", "karsilastirma");
    (siralama.secenekler as Veri[])[0].metin = "1/4, 1/2, 5/8";
    expect(dogrulaVeri("gercek_hayat_senaryo", siralama).sorunlar).toEqual([]);
  });

  it("tek adımda çözülen (işlem adımı 2'den az) soruyu reddeder", () => {
    const veri = ornekVeri("gercek_hayat_senaryo", "kalaniBulma");
    veri.islemAdimlari = ["2 − 7/8 = 9/8"];
    expect(dogrulaVeri("gercek_hayat_senaryo", veri).sonuc).toBeUndefined();
  });

  it("tanınmayan dekoratif sahneyi soruyu bozmadan 'genel'e düşürür", () => {
    const veri = ornekVeri("gercek_hayat_senaryo", "coklugunKesri");
    veri.sahne = "uzay_istasyonu";
    expect(dogrulaVeri("gercek_hayat_senaryo", veri).icVeri?.sahne).toBe("genel");
  });
});

describe("Quiz akışına entegrasyon", () => {
  const blueprint = buildQuizBlueprint(FORM);
  const ornekler = blueprint.slots.map((slot) => klonla(gorevTanimi(slot.gorselPlani!).ornek));

  it("plana uyan { tip, veri } yanıtını kabul eder", () => {
    const sonuc = validateQuizResponse({ title: "Kesirler", questions: ornekler }, blueprint);
    expect(sonuc.issues).toEqual([]);
    expect(sonuc.data?.questions).toHaveLength(3);
  });

  it("prompt yalnızca plana atanmış görevlerin örneklerini içerir", () => {
    const { instructions } = buildQuizPrompt(blueprint);
    for (const slot of blueprint.slots) {
      expect(instructions).toContain(`Görev: ${slot.gorselPlani!.gorev}`);
      expect(instructions).toContain(JSON.stringify(gorevTanimi(slot.gorselPlani!).ornek));
    }
    const atanmamis = TUM_PLANLAR.filter(
      (plan) => !blueprint.slots.some((slot) => slot.gorselPlani?.gorev === plan.gorev)
    );
    for (const plan of atanmamis) {
      expect(instructions).not.toContain(JSON.stringify(gorevTanimi(plan).ornek));
    }
  });

  it("mock servis plandaki tip ve görevlerle geçerli sorular üretir", async () => {
    const quiz = await mockQuizGenerationService.generate(buildQuizPrompt(blueprint));
    const gorevler = quiz.questions.map((question) =>
      question.type === "gorselSoru" ? (question.veri as { gorev: string }).gorev : null
    );
    expect(gorevler).toEqual(blueprint.slots.map((slot) => slot.gorselPlani?.gorev));
  });
});

// Tip tanımlarının her görevinin kendi örneğini ve şemasını taşıdığından emin olur.
describe("görev tanımları", () => {
  it.each(GORSEL_SORU_TIPLERI)("%s: her görevin etiketi, açıklaması, örneği ve şeması var", (tip) => {
    for (const tanim of Object.values(GORSEL_SORU_TANIMLARI[tip].gorevler) as GorselSoruGorevTanimi<GorselSoruTipi>[]) {
      expect(tanim.etiket.length).toBeGreaterThan(0);
      expect(tanim.aciklama.length).toBeGreaterThan(0);
      expect(tanim.ornek.tip).toBe(tip);
      expect((tanim.ornek.veri as Veri).gorev).toBe(tanim.gorev);
      expect(tanim.jsonSemasi.type).toBe("object");
    }
  });
});
