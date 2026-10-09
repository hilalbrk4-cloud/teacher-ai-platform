import { esitMi, oranMetni, oranYap, type Oran } from "@/lib/quiz-generator/gorsel-sorular/kesir-aritmetigi";
import { ebob, rastgeleOlustur, type Rastgele } from "@/lib/quiz-generator/gorsel-sorular/senaryo-sayilari";
import type { CikarimGorevi, Kesir, SenaryoCikarimPlani } from "@/types/gorsel-soru";

/**
 * Cevabı bir sayı olmayan senaryo görevleri (sıralama, "olabilir",
 * "olamaz") için BAĞLAMI, VERİLERİ, DOĞRU CEVABI ve ŞIKLARI kod kurar —
 * "veri doğruluğun kaynağıdır" (references/senaryo-kalite-referans-v2.md,
 * Bölüm 5). Model yalnızca bu bağlamda, bu verilerle senaryo metnini ve soru
 * kökünü yazar; kod metnin verileri ve gerekli ifadeleri içerdiğini denetler.
 *
 * Çeldiriciler adı konmuş öğrenci hatalarının sonucudur (payda büyüdükçe
 * kesir büyür sanmak, eşitliği görmemek, sınırı dâhil etmek, bölüm ile
 * kalanı karıştırmak…). Deterministiktir: aynı tohum aynı planı verir.
 */

const o = (pay: number, payda = 1): Oran => oranYap({ pay, payda });

/** Yazıldığı gibi (sadeleştirmeden) gösterim: 15/3, 4/10. */
function yazim(k: Kesir): string {
  return k.tam !== undefined ? `${k.tam} ${k.pay}/${k.payda}` : `${k.pay}/${k.payda}`;
}

function buyukHarf(metin: string): string {
  return metin.charAt(0).toLocaleUpperCase("tr-TR") + metin.slice(1);
}

function okek(a: number, b: number): number {
  return (a * b) / ebob(a, b);
}

/** Doğru şık ile çeldiricileri birleştirip gösterim sırasını karıştırır. */
function sikSirasi(r: Rastgele, dogru: string, celdiriciler: { metin: string; hata: string }[]): SenaryoCikarimPlani["secenekler"] {
  return r.karistir([{ metin: dogru }, ...celdiriciler]);
}

// ---------------------------------------------------------------------------
// Aile 2 + 3: farklı paydalı kesirleri karşılaştırma / sıralama
// ---------------------------------------------------------------------------

interface SiralamaBaglami {
  konu: string;
  baglam: string;
  adlar: [string, string, string];
  veriAdi: (ad: string) => string;
  /** Aynı bütünün kesirleri karşılaştırıldığını belli eden ifadeler. */
  anahtarIfadeler: string[][];
  ornekSoru: (yon: SiralamaYonu) => string;
}

type SiralamaYonu = "buyuktenKucuge" | "kucuktenBuyuge";

const SIRALAMA_BAGLAMLARI: readonly SiralamaBaglami[] = [
  {
    konu: "tarım",
    baglam: "Bir çiftçi tarlasının bir kısmına domates, bir kısmına biber, bir kısmına salatalık ekti.",
    adlar: ["domates", "biber", "salatalık"],
    veriAdi: (ad) => `${ad} ekilen alan (tarlanın kesri)`,
    anahtarIfadeler: [["tarla"]],
    ornekSoru: (yon) =>
      `Buna göre ekili alanların ${yon === "buyuktenKucuge" ? "büyükten küçüğe" : "küçükten büyüğe"} doğru sıralanışı aşağıdakilerden hangisidir?`,
  },
  {
    konu: "spor",
    baglam: "Ali, Ece ve Can aynı uzunluktaki bir koşu parkurunun bir kısmını koştu.",
    adlar: ["Ali", "Ece", "Can"],
    veriAdi: (ad) => `${ad} için koşulan kısım (parkurun kesri)`,
    anahtarIfadeler: [["aynı uzunlukta", "eşit uzunlukta", "aynı parkur"]],
    ornekSoru: (yon) =>
      `Buna göre koşulan mesafelerin ${yon === "buyuktenKucuge" ? "büyükten küçüğe" : "küçükten büyüğe"} doğru sıralanışı aşağıdakilerden hangisidir?`,
  },
  {
    // Aile 2: "daha çok parçaya bölünen daha büyüktür" yanılgısı.
    konu: "mutfak",
    baglam:
      "Eşit büyüklükteki üç pizza farklı sayıda eş dilime bölünmüş; Zeynep, Mert ve Elif kendi pizzalarının bir kısmını yedi.",
    adlar: ["Zeynep", "Mert", "Elif"],
    veriAdi: (ad) => `${ad} için yenen kısım (kendi pizzasının kesri)`,
    anahtarIfadeler: [["eşit büyüklükte", "aynı büyüklükte", "eş büyüklükte"]],
    ornekSoru: (yon) =>
      `Buna göre yenen pizza miktarlarının ${yon === "buyuktenKucuge" ? "büyükten küçüğe" : "küçükten büyüğe"} doğru sıralanışı aşağıdakilerden hangisidir?`,
  },
];

/** Ortak paydaya kolayca genişletilebilen payda üçlüleri (5-6. sınıf). */
const PAYDA_UCLULERI: readonly [number, number, number][] = [
  [2, 4, 8],
  [3, 6, 12],
  [2, 5, 10],
  [4, 6, 12],
  [3, 4, 12],
  [5, 10, 20],
];

const KOK_IFADELERI: Record<SiralamaYonu, string[]> = {
  buyuktenKucuge: ["büyükten küçüğe", "çoktan aza", "en çoktan", "en büyükten", "fazladan aza"],
  kucuktenBuyuge: ["küçükten büyüğe", "azdan çoğa", "en azdan", "en küçükten"],
};

interface Oge {
  ad: string;
  k: Kesir;
  d: Oran;
  sira: number;
}

/** Değeri eşit olanları "=" ile gruplayan sıralama metni ("Biber > Domates = Salatalık"). */
function siraMetni(ogeler: Oge[], yon: SiralamaYonu, esitlikGoster: boolean): string {
  const isaret = yon === "buyuktenKucuge" ? " > " : " < ";
  const parcalar: string[] = [];
  ogeler.forEach((oge, index) => {
    const onceki = ogeler[index - 1];
    const ayrac = index === 0 ? "" : esitlikGoster && onceki && esitMi(onceki.d, oge.d) ? " = " : isaret;
    parcalar.push(ayrac + buyukHarf(oge.ad));
  });
  return parcalar.join("");
}

function sirala(ogeler: Oge[], anahtar: (oge: Oge) => number, yon: SiralamaYonu): Oge[] {
  const carpan = yon === "buyuktenKucuge" ? -1 : 1;
  return [...ogeler].sort((a, b) => carpan * (anahtar(a) - anahtar(b)) || a.sira - b.sira);
}

function kesirSiralama(r: Rastgele): SenaryoCikarimPlani {
  for (;;) {
    const b = r.sec(SIRALAMA_BAGLAMLARI);
    const yon: SiralamaYonu = r.sec(["buyuktenKucuge", "kucuktenBuyuge"] as const);
    const paydalar = r.karistir([...r.sec(PAYDA_UCLULERI)]);
    const esitlikIste = r.aralik(0, 1) === 1;
    const kesirler: Kesir[] = paydalar.map((payda) => ({ pay: r.aralik(1, payda - 1), payda }));
    if (esitlikIste) {
      // Aile 3: biri diğerinin genişletilmiş hâli (2/5 = 4/10); eşitlik çeldiricileri sınar.
      const [kucukPayda, buyukPayda] = [...paydalar].sort((x, y) => x - y).slice(0, 3).filter((_, i) => i !== 1);
      const kucuk = kesirler[paydalar.indexOf(kucukPayda)];
      const buyuk = kesirler[paydalar.indexOf(buyukPayda)];
      if (buyukPayda % kucukPayda !== 0) continue;
      buyuk.pay = kucuk.pay * (buyukPayda / kucukPayda);
    }
    const ogeler: Oge[] = kesirler.map((k, sira) => ({ ad: b.adlar[sira], k, d: o(k.pay, k.payda), sira }));
    const esitCiftSayisi = ogeler.filter((a, i) => ogeler.some((c, j) => j > i && esitMi(a.d, c.d))).length;
    if (esitCiftSayisi !== (esitlikIste ? 1 : 0)) continue;
    // Eşit olmayan kesirler sade yazılır; eşitlikteki genişletilmiş yazım bilerek bırakılır.
    if (!esitlikIste && ogeler.some((oge) => ebob(oge.k.pay, oge.k.payda) !== 1)) continue;

    const dogruSira = sirala(ogeler, (oge) => oge.d.pay / oge.d.payda, yon);
    const dogru = siraMetni(dogruSira, yon, true);
    const paydaYanilgisi = siraMetni(sirala(ogeler, (oge) => oge.k.payda, yon), yon, false);
    const payYanilgisi = siraMetni(sirala(ogeler, (oge) => oge.k.pay, yon), yon, false);
    const ters = siraMetni([...dogruSira].reverse(), yon, true);
    const esitlikYok = siraMetni(dogruSira, yon, false);
    // Hata modelleri doğru sıradan ayrışmıyorsa (ör. paydalar zaten doğru sırada) soru ayırt edici değildir.
    if (paydaYanilgisi === dogru.replace(/ = /g, yon === "buyuktenKucuge" ? " > " : " < ")) continue;

    const adaylar = [
      ...(esitlikIste ? [{ metin: esitlikYok, hata: "esitligiGormeme" }] : []),
      { metin: paydaYanilgisi, hata: "paydaYanilgisi" }, // payda büyüdükçe kesir büyür sanmak
      { metin: payYanilgisi, hata: "yalnizcaPay" }, // paydayı yok sayıp yalnızca payları karşılaştırmak
      { metin: ters, hata: "tersYon" },
    ];
    const celdiriciler: { metin: string; hata: string }[] = [];
    for (const aday of adaylar) {
      if (aday.metin !== dogru && !celdiriciler.some((c) => c.metin === aday.metin)) celdiriciler.push(aday);
    }
    if (celdiriciler.length < 3) continue;

    const ortak = okek(okek(paydalar[0], paydalar[1]), paydalar[2]);
    const genisletme = ogeler
      .map((oge) => `${oge.ad} ${yazim(oge.k)} = ${(oge.d.pay * ortak) / oge.d.payda}/${ortak}`)
      .join(", ");
    const yonMetni = yon === "buyuktenKucuge" ? "Büyükten küçüğe" : "Küçükten büyüğe";
    return {
      baglam: b.baglam,
      konu: b.konu,
      ornekSoru: b.ornekSoru(yon),
      veriler: ogeler.map((oge) => ({ ad: b.veriAdi(oge.ad), deger: oge.k })),
      adlar: [...b.adlar],
      anahtarIfadeler: b.anahtarIfadeler,
      kokIfadeleri: [KOK_IFADELERI[yon]],
      ipucu: `paydalar ${ortak}'de eşitlenir: ${genisletme}; ${yonMetni.toLocaleLowerCase("tr-TR")}: ${dogru}`,
      cozum: `Paydalar ${ortak}'de eşitlenir: ${genisletme}. ${yonMetni}: ${dogru}.`,
      secenekler: sikSirasi(r, dogru, celdiriciler.slice(0, 3)),
    };
  }
}

// ---------------------------------------------------------------------------
// Aile 7: "olabilir" çıkarımı (eşitsizlik + bileşik kesri yorumlama)
// ---------------------------------------------------------------------------

interface OlabilirBaglami {
  konu: string;
  /** "A, B ve C adlı üç küre var. B en hafif küre, C en ağır küredir." — ekler bağlama göre elle yazılır. */
  tanitim: (enAz: string, enCok: string) => string;
  /** Tamlama: "C küresinin kütlesi". */
  olcu: (harf: string) => string;
  birim: string;
  birimUzun: string;
  /** Senaryoda geçmesi gereken "en küçük" ve "en büyük" ifadeleri (kabul edilen yazımlar). */
  enAzIfadeleri: string[];
  enCokIfadeleri: string[];
}

const OLABILIR_BAGLAMLARI: readonly OlabilirBaglami[] = [
  {
    konu: "ölçüm",
    tanitim: (enAz, enCok) => `A, B ve C adlı üç küre var. ${enAz} en hafif, ${enCok} en ağır küredir.`,
    olcu: (h) => `${h} küresinin kütlesi`,
    birim: "kg",
    birimUzun: "kilogram",
    enAzIfadeleri: ["en hafif"],
    enCokIfadeleri: ["en ağır"],
  },
  {
    konu: "atölye",
    tanitim: (enAz, enCok) => `Bir marangozun A, B ve C adlı üç tahtası var. ${enAz} en kısa, ${enCok} en uzun tahtadır.`,
    olcu: (h) => `${h} tahtasının uzunluğu`,
    birim: "metre",
    birimUzun: "metre",
    enAzIfadeleri: ["en kısa"],
    enCokIfadeleri: ["en uzun"],
  },
  {
    konu: "ev",
    tanitim: (enAz, enCok) => `A, B ve C adlı üç kovada su var. En az su ${enAz} kovasında, en çok su ${enCok} kovasındadır.`,
    olcu: (h) => `${h} kovasındaki su`,
    birim: "litre",
    birimUzun: "litre",
    enAzIfadeleri: ["en az su", "en az"],
    enCokIfadeleri: ["en çok su", "en fazla su", "en çok", "en fazla"],
  },
];

/** (alt, üst) açık aralığında, tam sayı olmayan sade bir bileşik kesir. */
function araliktaKesir(r: Rastgele, alt: number, ust: number, kullanilan: Oran[]): Kesir | undefined {
  for (let deneme = 0; deneme < 50; deneme += 1) {
    const payda = r.sec([2, 3, 4, 5, 6, 8]);
    const adaylar = Array.from({ length: (ust - alt) * payda - 1 }, (_, i) => alt * payda + 1 + i).filter(
      (pay) => pay % payda !== 0 && ebob(pay, payda) === 1 && pay > 0
    );
    if (adaylar.length === 0) continue;
    const pay = r.sec(adaylar);
    if (kullanilan.some((d) => esitMi(d, o(pay, payda)))) continue;
    return { pay, payda };
  }
  return undefined;
}

/** Tam sayıya eşit, sadeleşmemiş bileşik yazım (5 → 15/3): sınır değerini gizler. */
function tamSayiyaEsitKesir(r: Rastgele, n: number): Kesir {
  const payda = r.sec([2, 3, 4]);
  return { pay: n * payda, payda };
}

function karisikMetni(k: Kesir): string {
  return oranMetni(o(k.pay, k.payda));
}

function olabilirCikarim(r: Rastgele): SenaryoCikarimPlani {
  for (;;) {
    const b = r.sec(OLABILIR_BAGLAMLARI);
    const enBuyukSorulur = r.aralik(0, 1) === 1;
    const enAz = r.aralik(2, 6);
    // Harfler: enAzHarf en küçük, enCokHarf en büyük, ortaHarf arada.
    const [enAzHarf, ortaHarf, enCokHarf] = r.karistir(["A", "B", "C"]);
    const kullanilan: Oran[] = [];
    let veriler: SenaryoCikarimPlani["veriler"];
    let sorulanHarf: string;
    let kosul: string;
    let dogru: Kesir | undefined;
    let celdiriciler: { k: Kesir | undefined; hata: string }[];

    if (enBuyukSorulur) {
      // Verilen: en küçük ve ortadaki; sorulan en büyük → ortadakinden büyük olmalı.
      const orta = enAz + r.aralik(1, 2);
      sorulanHarf = enCokHarf;
      veriler = [
        { ad: `${b.olcu(enAzHarf)} (en küçük), ${b.birim}`, deger: { pay: enAz, payda: 1 } },
        { ad: `${b.olcu(ortaHarf)}, ${b.birim}`, deger: { pay: orta, payda: 1 } },
      ];
      kosul = `${b.olcu(enCokHarf)}, ${ortaHarf} için verilen ${orta} ${b.birim} değerinden fazla olmalıdır`;
      dogru = araliktaKesir(r, orta, orta + 1, kullanilan);
      if (dogru) kullanilan.push(o(dogru.pay, dogru.payda));
      const arada = araliktaKesir(r, enAz, orta, kullanilan);
      if (arada) kullanilan.push(o(arada.pay, arada.payda));
      const altinda = araliktaKesir(r, enAz - 1, enAz, kullanilan);
      celdiriciler = [
        { k: arada, hata: "eksikKosul" }, // yalnızca en küçükten büyük olmayı yeterli sanmak
        { k: tamSayiyaEsitKesir(r, orta), hata: "sinirDahil" }, // eşitliği "olabilir" saymak
        { k: altinda, hata: "yanlisYon" },
      ];
    } else {
      // Verilen: en küçük ve en büyük; sorulan ortadaki → ikisinin arasında olmalı.
      const enCok = enAz + r.aralik(2, 3);
      sorulanHarf = ortaHarf;
      veriler = [
        { ad: `${b.olcu(enAzHarf)} (en küçük), ${b.birim}`, deger: { pay: enAz, payda: 1 } },
        { ad: `${b.olcu(enCokHarf)} (en büyük), ${b.birim}`, deger: { pay: enCok, payda: 1 } },
      ];
      kosul = `${b.olcu(ortaHarf)} ${enAz} ile ${enCok} ${b.birim} arasında olmalıdır`;
      dogru = araliktaKesir(r, enAz, enCok, kullanilan);
      if (dogru) kullanilan.push(o(dogru.pay, dogru.payda));
      const ustunde = araliktaKesir(r, enCok, enCok + 1, kullanilan);
      if (ustunde) kullanilan.push(o(ustunde.pay, ustunde.payda));
      const altinda = araliktaKesir(r, enAz - 1, enAz, kullanilan);
      celdiriciler = [
        { k: ustunde, hata: "yanlisYon" }, // en büyüğü aşmak
        { k: tamSayiyaEsitKesir(r, enCok), hata: "sinirDahil" }, // sınırı dâhil etmek
        { k: altinda, hata: "yanlisYon" }, // en küçüğün altına inmek
      ];
    }
    if (!dogru || celdiriciler.some((c) => !c.k)) continue;
    const tumu = [dogru, ...celdiriciler.map((c) => c.k as Kesir)];
    if (new Set(tumu.map(yazim)).size !== tumu.length) continue;

    const donusumler = tumu.map((k) => `${yazim(k)} = ${karisikMetni(k)}`).join(", ");
    return {
      baglam: `${b.tanitim(enAzHarf, enCokHarf)} Sorulan ölçü metinde verilmez; yalnızca verilen iki ölçü yazılır.`,
      konu: b.konu,
      ornekSoru: `Buna göre ${b.olcu(sorulanHarf)} kaç ${b.birimUzun} olabilir?`,
      veriler,
      adlar: [],
      anahtarIfadeler: [b.enAzIfadeleri, b.enCokIfadeleri],
      kokIfadeleri: [["olabilir"]],
      ipucu: `${kosul}; ${donusumler}; yalnızca ${yazim(dogru)} uygun`,
      cozum:
        `${buyukHarf(kosul)}. Şıklar tam sayılı kesre çevrilir: ${donusumler}. ` +
        `Bu koşulu yalnızca ${yazim(dogru)} sağlar.`,
      secenekler: sikSirasi(
        r,
        `${yazim(dogru)} ${b.birim}`,
        celdiriciler.map((c) => ({ metin: `${yazim(c.k as Kesir)} ${b.birim}`, hata: c.hata }))
      ),
    };
  }
}

// ---------------------------------------------------------------------------
// M2: denklik + "olamaz" (bileşik ↔ tam sayılı kesir dönüşümü ve eleme)
// ---------------------------------------------------------------------------

interface DenklikBaglami {
  konu: string;
  baglam: string;
  ornekSoru: string;
  veriAdi: (sira: number) => string;
  anahtarIfadeler: string[][];
}

const DENKLIK_BAGLAMLARI: readonly DenklikBaglami[] = [
  {
    konu: "oyun",
    baglam:
      "Bir oyunda her kartın ön yüzünde bir bileşik kesir, arka yüzünde aynı sayının tam sayılı kesir gösterimi yazılıdır. Masadaki kartların yalnızca ön yüzleri görünmektedir.",
    ornekSoru: "Buna göre aşağıdakilerden hangisi bu kartlardan birinin arka yüzü olamaz?",
    veriAdi: (sira) => `${sira}. kartın ön yüzündeki kesir`,
    anahtarIfadeler: [["ön yüz"], ["arka yüz"]],
  },
  {
    konu: "tarif",
    baglam:
      "Bir kek tarifinde malzeme miktarları bileşik kesirle yazılmıştır. Ayşe her miktarı tam sayılı kesre çevirip deftere not alıyor.",
    ornekSoru: "Buna göre aşağıdakilerden hangisi Ayşe'nin defterine yazdığı miktarlardan biri olamaz?",
    veriAdi: (sira) => `${sira}. malzemenin miktarı (su bardağı)`,
    anahtarIfadeler: [["tam sayılı"]],
  },
];

function tamSayili(k: Kesir): Kesir {
  return { tam: Math.floor(k.pay / k.payda), pay: k.pay % k.payda, payda: k.payda };
}

function denklikOlamaz(r: Rastgele): SenaryoCikarimPlani {
  for (;;) {
    const b = r.sec(DENKLIK_BAGLAMLARI);
    const paydalar = r.karistir([2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3);
    const onler: Kesir[] = paydalar.map((payda) => {
      const adaylar = Array.from({ length: 3 * payda }, (_, i) => payda + 1 + i).filter(
        (pay) => pay % payda !== 0 && ebob(pay, payda) === 1
      );
      return { pay: r.sec(adaylar), payda };
    });
    const arkalar = onler.map(tamSayili);
    const degerler = onler.map((k) => o(k.pay, k.payda));

    // Hatalı dönüşüm (doğru cevap): bir kartın yaygın bir hatayla çevrilmiş hâli.
    const hedefIndex = r.aralik(0, 2);
    const hedef = onler[hedefIndex];
    const { tam: t = 0, pay: kalan } = arkalar[hedefIndex];
    const hatalar: { k: Kesir; aciklama: string }[] = [
      ...(t < hedef.payda && kalan !== t
        ? [{ k: { tam: kalan, pay: t, payda: hedef.payda }, aciklama: "bölüm ile kalan yer değiştirmiş" }]
        : []),
      { k: { tam: t, pay: kalan, payda: hedef.pay }, aciklama: "payda yerine pay yazılmış" },
      { k: { tam: t + 1, pay: kalan, payda: hedef.payda }, aciklama: "tam kısım bir fazla alınmış" },
    ];
    const uygun = r
      .karistir(hatalar)
      .find(({ k }) => k.pay < k.payda && k.pay > 0 && !degerler.some((d) => esitMi(d, o((k.tam ?? 0) * k.payda + k.pay, k.payda))));
    if (!uygun) continue;
    const metinler = [...arkalar.map(yazim), yazim(uygun.k)];
    if (new Set(metinler).size !== metinler.length) continue;

    const donusumler = onler.map((k, i) => `${yazim(k)} = ${yazim(arkalar[i])}`).join(", ");
    return {
      baglam: b.baglam,
      konu: b.konu,
      ornekSoru: b.ornekSoru,
      veriler: onler.map((k, i) => ({ ad: b.veriAdi(i + 1), deger: k })),
      adlar: [],
      anahtarIfadeler: b.anahtarIfadeler,
      kokIfadeleri: [["olamaz"]],
      ipucu: `${donusumler}; ${yazim(uygun.k)} bunların hiçbirine eşit değil (${yazim(hedef)} için ${uygun.aciklama})`,
      cozum:
        `Bileşik kesirler tam sayılı kesre çevrilir: ${donusumler}. ${yazim(uygun.k)} bunların hiçbirine eşit ` +
        `değildir; ${yazim(hedef)} çevrilirken ${uygun.aciklama}.`,
      secenekler: sikSirasi(
        r,
        yazim(uygun.k),
        arkalar.map((k) => ({ metin: yazim(k), hata: "dogruDonusum" }))
      ),
    };
  }
}

// ---------------------------------------------------------------------------

const URETICILER: Record<CikarimGorevi, (r: Rastgele) => SenaryoCikarimPlani> = {
  kesirSiralama,
  olabilirCikarim,
  denklikOlamaz,
};

const KONU_DENEME_SINIRI = 40;

/** \`kacinilacakKonular\`: quizdeki önceki senaryoların konuları; mümkünse farklı bir konu seçilir. */
export function cikarimPlaniUret(
  gorev: CikarimGorevi,
  tohum: number,
  kacinilacakKonular: ReadonlySet<string> = new Set()
): SenaryoCikarimPlani {
  for (let deneme = 0; ; deneme += 1) {
    const plan = URETICILER[gorev](rastgeleOlustur(tohum + deneme * 1013));
    if (deneme < KONU_DENEME_SINIRI && kacinilacakKonular.has(plan.konu)) continue;
    return plan;
  }
}
