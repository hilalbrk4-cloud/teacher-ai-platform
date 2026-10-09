import { describe, expect, it } from "vitest";

import { buildQuizBlueprint } from "@/lib/ai/blueprint/quiz-blueprint";
import { buildQuizPrompt } from "@/lib/ai/prompts/quiz-generator-prompt";
import { validateQuizResponse } from "@/lib/ai/schemas/quiz-schema";
import { okuKesir, type GorselSoruGorevTanimi, type GorselSoruSorunu } from "@/lib/quiz-generator/gorsel-sorular/ortak";
import {
  GORSEL_SORU_TANIMLARI,
  dogrulaGorselSoru,
  gorevTanimi,
  gorselSoruCevapMetni,
} from "@/lib/quiz-generator/gorsel-sorular/tanimlar";
import { esitMi, oranYap, tamSayiMi } from "@/lib/quiz-generator/gorsel-sorular/kesir-aritmetigi";
import { senaryoSayilariUret } from "@/lib/quiz-generator/gorsel-sorular/senaryo-sayilari";
import { mockQuizGenerationService } from "@/lib/quiz-generator/mock-generation-service";
import { GORSEL_SORU_TIPLERI, type GorselSoruPlani, type GorselSoruTipi } from "@/types/gorsel-soru";
import type { QuizFormInput } from "@/types/quiz-generator";

type Veri = Record<string, unknown>;

function klonla<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Bir görevin planı; sayısal senaryolarda örneğin kendi plan sayılarıyla (bağlam, cevap, kodun şıkları). */
function ornekPlan(tip: GorselSoruTipi, gorev: string): GorselSoruPlani {
  const sayilar = gorevTanimi({ tip, gorev } as GorselSoruPlani).ornekSayilari;
  return { tip, gorev, ...(sayilar ? { sayilar: klonla(sayilar) } : {}) } as GorselSoruPlani;
}

const TUM_PLANLAR: GorselSoruPlani[] = GORSEL_SORU_TIPLERI.flatMap((tip) =>
  Object.keys(GORSEL_SORU_TANIMLARI[tip].gorevler).map((gorev) => ornekPlan(tip, gorev))
);

function ornekVeri(tip: GorselSoruTipi, gorev: string): Veri {
  return klonla(gorevTanimi({ tip, gorev } as GorselSoruPlani).ornek.veri);
}

function dogrulaVeri(tip: GorselSoruTipi, veri: unknown, plan?: GorselSoruPlani) {
  const sorunlar: GorselSoruSorunu[] = [];
  const gorev = (veri as Veri | undefined)?.gorev;
  const kullanilacakPlan = plan ?? (typeof gorev === "string" ? ornekPlan(tip, gorev) : undefined);
  const sonuc = dogrulaGorselSoru({ tip, veri }, "q", sorunlar, kullanilacakPlan);
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

  it("kesir bölme/çarpma gerektiren senaryo görevlerini 5. sınıfa atamaz; kesir konusunda metinsel görevi kullanmaz", () => {
    const tumSenaryoGorevleri = (sinif: string) =>
      new Set(
        planlar({ ...FORM, gradeLevel: sinif, questionCount: 18 })
          .filter((plan) => plan.tip === "gercek_hayat_senaryo")
          .map((plan) => plan.gorev)
      );
    const besinci = tumSenaryoGorevleri("5. Sınıf");
    expect([...besinci].sort()).toEqual(["coklugunKesri", "kalaniBulma", "karsilastirma"]);
    const altinci = tumSenaryoGorevleri("6. Sınıf");
    expect(altinci.has("bolmeEnFazla") && altinci.has("birimOlcekleme")).toBe(true);
    expect(altinci.has("cokAdimliCikarim")).toBe(false);
    // Anlamsal çelişki riski nedeniyle plandan çıkarıldı (bkz. gorev tanımı).
    expect(altinci.has("araliklar")).toBe(false);
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

  it("hedefeEnYakin: tam sayı hedefi tanır (gerçek çıktı: 'hangisi 1'e en yakındır?')", () => {
    const veri = ornekVeri("sayi_dogrusu", "hedefeEnYakin");
    veri.hedef = { tam: 1, pay: 0, payda: 1 };
    veri.soru = "Hangi hayvanın bulunduğu nokta 1'e en yakındır?";
    expect(dogrulaVeri("sayi_dogrusu", veri).sorunlar).toEqual([]);
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
  it("cevabı ve şıkları kod üretir; çözüm metni doğrulanmış hesaptan üretilir", () => {
    const { icVeri, sonuc, sorunlar } = dogrulaVeri("gercek_hayat_senaryo", ornekVeri("gercek_hayat_senaryo", "bolmeEnFazla"));
    expect(sorunlar).toEqual([]);
    expect((icVeri?.secenekler as Veri[]).map((secenek) => secenek.metin)).toEqual(["3", "4", "4 1/4", "5"]);
    expect(icVeri?.dogruSecenekId).toBe("B");
    expect(sonuc?.cozum).toContain("34/5 ÷ 8/5 = 4 1/4");
    expect(sonuc?.cozum).toContain("4 1/4 → 4");
  });

  it("modelin yazdığı şıkları yok sayar; doğru şık planın şıklarından gelir", () => {
    const veri = { ...ornekVeri("gercek_hayat_senaryo", "karsilastirma"), secenekler: [{ id: "A", metin: "999" }], dogruSecenekId: "D" };
    const { icVeri, sorunlar } = dogrulaVeri("gercek_hayat_senaryo", veri);
    expect(sorunlar).toEqual([]);
    expect(icVeri?.dogruSecenekId).toBe("B");
    expect((icVeri?.secenekler as Veri[])[1].metin).toBe("30 sayfa");
  });

  it("hesap planın cevabına ulaşmıyorsa reddeder (metnin anlattığı işlem planla örtüşmüyor)", () => {
    const veri = ornekVeri("gercek_hayat_senaryo", "kalaniBulma");
    // Model ikinci kesri TÜM elmaya değil KALANA uygulamış: 32 − 8 = 24, 24 × 3/8 = 9, 24 − 9 = 15.
    const kesir = (pay: number, payda = 1) => ({ tam: null, pay, payda });
    veri.hesap = [
      { id: "a1", aciklama: "Öğleden önce satılan", islem: "carp", girdiler: [{ adimId: null, deger: kesir(32) }, { adimId: null, deger: kesir(1, 4) }], sonuc: kesir(8) },
      { id: "a2", aciklama: "Öğlen kalan", islem: "cikar", girdiler: [{ adimId: null, deger: kesir(32) }, { adimId: "a1", deger: null }], sonuc: kesir(24) },
      { id: "a3", aciklama: "Öğleden sonra satılan", islem: "carp", girdiler: [{ adimId: "a2", deger: null }, { adimId: null, deger: kesir(3, 8) }], sonuc: kesir(9) },
      { id: "a4", aciklama: "Akşam kalan", islem: "cikar", girdiler: [{ adimId: "a2", deger: null }, { adimId: "a3", deger: null }], sonuc: kesir(15) },
    ];
    const { sonuc, sorunlar } = dogrulaVeri("gercek_hayat_senaryo", veri);
    expect(sonuc).toBeUndefined();
    expect(sorunlar.some((sorun) => sorun.message.includes("doğru cevap 12"))).toBe(true);
  });

  it("sayılması gereken yerde kesirli sonucu reddeder (gerçek çıktı: 15 çocuğun yarısı)", () => {
    const plan = ornekPlan("gercek_hayat_senaryo", "coklugunKesri");
    plan.sayilar = {
      ...plan.sayilar!,
      veriler: [
        { ad: "yolcu", deger: { pay: 40, payda: 1 } },
        { ad: "yetişkin kesri", deger: { pay: 5, payda: 8 } },
        { ad: "öğrenci kesri", deger: { pay: 1, payda: 2 } },
      ],
      cevap: { tam: 7, pay: 1, payda: 2 },
    };
    const kesir = (pay: number, payda = 1) => ({ tam: null, pay, payda });
    const veri = {
      gorev: "coklugunKesri",
      sahne: "yolculuk",
      senaryo: "Bir otobüste 40 yolcu var. Yolcuların 5/8'i yetişkin, geri kalanı çocuktur. Çocukların 1/2'si öğrencidir.",
      soru: "Otobüste öğrenci olmayan kaç çocuk vardır?",
      hesap: [
        { id: "a1", aciklama: "Yetişkinler", islem: "carp", girdiler: [{ adimId: null, deger: kesir(40) }, { adimId: null, deger: kesir(5, 8) }], sonuc: kesir(25) },
        { id: "a2", aciklama: "Çocuklar", islem: "cikar", girdiler: [{ adimId: null, deger: kesir(40) }, { adimId: "a1", deger: null }], sonuc: kesir(15) },
        { id: "a3", aciklama: "Öğrenciler", islem: "carp", girdiler: [{ adimId: "a2", deger: null }, { adimId: null, deger: kesir(1, 2) }], sonuc: kesir(15, 2) },
        { id: "a4", aciklama: "Öğrenci olmayan çocuklar", islem: "cikar", girdiler: [{ adimId: "a2", deger: null }, { adimId: "a3", deger: null }], sonuc: kesir(15, 2) },
      ],
    };
    const { sonuc, sorunlar } = dogrulaVeri("gercek_hayat_senaryo", veri, plan);
    expect(sonuc).toBeUndefined();
    expect(sorunlar[0].message).toContain("tam sayı");
  });

  it("plansız bir sayısal senaryoyu kabul etmez (cevap ve şıklar garanti edilemez)", () => {
    const sorunlar: GorselSoruSorunu[] = [];
    const plansiz = { tip: "gercek_hayat_senaryo", gorev: "bolmeEnFazla" } as GorselSoruPlani;
    expect(dogrulaGorselSoru(gorevTanimi(plansiz).ornek, "q", sorunlar, plansiz)).toBeUndefined();
  });

  it("hesapta senaryoda olmayan bir sayı kullanılırsa reddeder", () => {
    const veri = ornekVeri("gercek_hayat_senaryo", "kalaniBulma");
    veri.senaryo = (veri.senaryo as string).replace("3/8", "5/8");
    const { sorunlar } = dogrulaVeri("gercek_hayat_senaryo", veri);
    expect(sorunlar.some((sorun) => sorun.message.includes("3/8 senaryoda geçmiyor"))).toBe(true);
  });

  it("'en fazla' görevini 'en az' soru köküyle kabul etmez", () => {
    const veri = ornekVeri("gercek_hayat_senaryo", "bolmeEnFazla");
    veri.soru = "Buna göre terzi bu kumaşla en az kaç gömlek dikebilir?";
    expect(dogrulaVeri("gercek_hayat_senaryo", veri).sonuc).toBeUndefined();
  });

  it("çarpma/bölme içermeyen ya da görevin adımlarını atlayan hesabı reddeder", () => {
    const veri = ornekVeri("gercek_hayat_senaryo", "karsilastirma");
    // Elif'in sayfası bulunmadan doğrudan çıkarma: tek çarpma yetmez.
    (veri.hesap as Veri[]).splice(0, 1);
    const { sonuc } = dogrulaVeri("gercek_hayat_senaryo", veri);
    expect(sonuc).toBeUndefined();
  });

  it("senaryodaki bir sayı hesapta kullanılmıyorsa reddeder (gerçek çıktı: '3 gün boyunca' hiç kullanılmamış)", () => {
    const veri = ornekVeri("gercek_hayat_senaryo", "karsilastirma");
    veri.senaryo = (veri.senaryo as string).replace("Elif ", "Elif 3 gün boyunca ");
    const { sorunlar } = dogrulaVeri("gercek_hayat_senaryo", veri);
    expect(sorunlar.some((sorun) => sorun.message.includes("Senaryodaki 3 çözümde hiç kullanılmıyor"))).toBe(true);
  });

  it("soru kökünde geçen veriyi tanır (gerçek çıktı: 'musluktan 6 dakikada kaç litre su akar?')", () => {
    const veri = ornekVeri("gercek_hayat_senaryo", "birimOlcekleme");
    veri.senaryo = (veri.senaryo as string).replace(", kütüphane ile kafe arası 3 karedir", "");
    veri.senaryo = (veri.senaryo as string).replace("Okul ile kütüphane arası 2 kare.", "Okul ile kütüphane arası 2 karedir.");
    veri.soru = "Buna göre 3 karelik kütüphane ile kafe arası kaç kilometredir?";
    expect(dogrulaVeri("gercek_hayat_senaryo", veri).sorunlar).toEqual([]);
  });

  it("cevap senaryoda zaten yazıyorsa reddeder", () => {
    const veri = ornekVeri("gercek_hayat_senaryo", "birimOlcekleme");
    veri.senaryo = `${veri.senaryo as string} Kütüphane ile kafe arası 3 3/5 km'dir.`;
    const { sonuc, sorunlar } = dogrulaVeri("gercek_hayat_senaryo", veri);
    expect(sonuc).toBeUndefined();
    expect(sorunlar.some((sorun) => sorun.message.includes("3 3/5"))).toBe(true);
  });

  it("sık yapılan dil hatalarını reddeder ('kesiri', eksik kesme işareti)", () => {
    const kesiri = ornekVeri("gercek_hayat_senaryo", "karsilastirma");
    kesiri.soru = "Buna göre Elif, okuduğu kesiri dikkate alınca Can'dan kaç sayfa fazla okumuştur?";
    expect(dogrulaVeri("gercek_hayat_senaryo", kesiri).sorunlar[0]?.message).toContain("kesri");

    const ek = ornekVeri("gercek_hayat_senaryo", "karsilastirma");
    ek.senaryo = (ek.senaryo as string).replace("3/4'ünü", "3/4 ünü");
    expect(dogrulaVeri("gercek_hayat_senaryo", ek).sonuc).toBeUndefined();
  });

  it("senaryo metni soru cümlesi içeriyorsa reddeder (tek soru yalnızca kökte sorulur)", () => {
    const veri = ornekVeri("gercek_hayat_senaryo", "kalaniBulma");
    veri.senaryo = `${veri.senaryo as string} Akşama ne kadar elma kalır?`;
    expect(dogrulaVeri("gercek_hayat_senaryo", veri).sonuc).toBeUndefined();
  });

  it("metinsel görevde tek adımda çözülen soruyu reddeder", () => {
    const veri = ornekVeri("gercek_hayat_senaryo", "cokAdimliCikarim");
    veri.islemAdimlari = ["Yalnızca A gelişti."];
    expect(dogrulaVeri("gercek_hayat_senaryo", veri).sonuc).toBeUndefined();
  });

  it("tanınmayan dekoratif sahneyi soruyu bozmadan 'genel'e düşürür", () => {
    const veri = ornekVeri("gercek_hayat_senaryo", "coklugunKesri");
    veri.sahne = "uzay_istasyonu";
    expect(dogrulaVeri("gercek_hayat_senaryo", veri).icVeri?.sahne).toBe("genel");
  });
});

describe("senaryo planı (bağlam, sayılar, şıklar kod tarafından)", () => {
  const SAYISAL = ["bolmeEnFazla", "birimOlcekleme", "araliklar", "kalaniBulma", "coklugunKesri", "karsilastirma"] as const;
  const SAYILAN = new Set(["bolmeEnFazla", "araliklar", "kalaniBulma", "coklugunKesri", "karsilastirma"]);

  it.each(SAYISAL)("%s: 300 tohumda koşulları sağlayan sayılar ve 4 farklı şık üretir", (gorev) => {
    for (let tohum = 1; tohum <= 300; tohum += 1) {
      const plan = senaryoSayilariUret(gorev, tohum * 7919);
      const cevap = oranYap(plan.cevap);
      expect(cevap.pay).toBeGreaterThan(0);
      if (SAYILAN.has(gorev)) expect(cevap.payda).toBe(1);
      // Cevap, senaryoya yazılacak verilerden biri olmamalı (cevap metinde verilmez).
      expect(plan.veriler.some((veri) => esitMi(oranYap(veri.deger), cevap))).toBe(false);
      // Şıklar: 4 tane, değerce farklı, pozitif; tam olarak biri doğru ve o da cevap.
      expect(plan.secenekler).toHaveLength(4);
      const degerler = plan.secenekler.map((secenek) => oranYap(secenek.deger));
      expect(degerler.every((deger) => deger.pay > 0)).toBe(true);
      expect(degerler.every((a, i) => degerler.every((b, j) => i === j || !esitMi(a, b)))).toBe(true);
      const dogrular = plan.secenekler.filter((secenek) => secenek.hata === undefined);
      expect(dogrular).toHaveLength(1);
      expect(esitMi(oranYap(dogrular[0].deger), cevap)).toBe(true);
      expect(plan.baglam.length).toBeGreaterThan(20);
      expect(plan.ornekSoru.trim().endsWith("?")).toBe(true);
    }
  });

  it("çeldiriciler yaygın hataların hesaplanmış sonuçlarıdır (örnek: 'en fazla' görevinde yanlış yöne yuvarlama)", () => {
    for (let tohum = 1; tohum <= 100; tohum += 1) {
      const plan = senaryoSayilariUret("bolmeEnFazla", tohum * 7919);
      const cevap = oranYap(plan.cevap).pay;
      const enFazla = plan.ornekSoru.includes("en fazla");
      const yanlisYon = plan.secenekler.find(
        (secenek) => secenek.hata === "yuvarlama" && tamSayiMi(oranYap(secenek.deger))
      );
      expect(oranYap(yanlisYon!.deger).pay).toBe(enFazla ? cevap + 1 : cevap - 1);
    }
  });

  it("plandaki sayılarla yazılmamış bir senaryoyu, kendi içinde doğru hesaplı olsa bile reddeder", () => {
    const plan = ornekPlan("gercek_hayat_senaryo", "araliklar");
    plan.sayilar = {
      ...plan.sayilar!,
      veriler: [
        { ad: "toplam uzunluk", deger: { pay: 45, payda: 2 } },
        { ad: "aralık", deger: { tam: 1, pay: 1, payda: 2 } },
      ],
      cevap: { pay: 14, payda: 1 },
    };
    const sorunlar: GorselSoruSorunu[] = [];
    // Registry örneği kendi sayılarıyla (49/2 ve 1 3/4) doğrudur ama plandaki sayıları kullanmıyor.
    expect(dogrulaGorselSoru(gorevTanimi(plan).ornek, "q", sorunlar, plan)).toBeUndefined();
    expect(sorunlar[0].message).toContain("senaryoda geçmiyor");
  });
});

describe("okuKesir", () => {
  it("paydası 1 olan tam sayılı yazımı tam sayı olarak okur ({tam:35,pay:35,payda:1} → 35, 70 değil)", () => {
    const sorunlar: GorselSoruSorunu[] = [];
    expect(okuKesir({ tam: 35, pay: 35, payda: 1 }, "k", sorunlar)).toEqual({ pay: 35, payda: 1 });
    expect(okuKesir({ tam: 35, pay: 0, payda: 1 }, "k", sorunlar)).toEqual({ pay: 35, payda: 1 });
    expect(sorunlar).toEqual([]);
    expect(okuKesir({ tam: 2, pay: 3, payda: 1 }, "k", sorunlar)).toBeUndefined();
    expect(sorunlar).toHaveLength(1);
  });
});

describe("Quiz akışına entegrasyon", () => {
  // Registry örnekleri kendi sabit sayılarını taşır; bu testte her sıra,
  // kodun ürettiği sayılar yerine örneğin kendi plan sayılarıyla doğrulanır
  // (üretilen sayılar "senaryo planı" testlerinde denetlenir).
  const blueprint = {
    ...buildQuizBlueprint(FORM),
    slots: buildQuizBlueprint(FORM).slots.map((slot) =>
      slot.gorselPlani ? { ...slot, gorselPlani: ornekPlan(slot.gorselPlani.tip, slot.gorselPlani.gorev) } : slot
    ),
  };
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
