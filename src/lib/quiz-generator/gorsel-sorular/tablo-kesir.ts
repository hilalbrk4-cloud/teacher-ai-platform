import { esitMi, oranMetni, oranYap, type Oran } from "@/lib/quiz-generator/gorsel-sorular/kesir-aritmetigi";
import type { GorselSoruGorevTanimi, GorselSoruTanimi } from "@/lib/quiz-generator/gorsel-sorular/ortak";
import {
  PLANLI_GORSEL_SEMA_ACIKLAMASI,
  ham,
  metinPlani,
  planliDogruCevapMetni,
  planliGorselDogrula,
  planliGorselSema,
  siklar,
  type CizimPlaniOf,
  type PlanliGorselPlan,
  type Uretim as GenelUretim,
} from "@/lib/quiz-generator/gorsel-sorular/planli-gorsel";
import { ebob, rastgeleOlustur, type Rastgele } from "@/lib/quiz-generator/gorsel-sorular/senaryo-sayilari";
import { TABLO_KESIR_GOREVLERI, type Kesir, type TabloKesirGorevi, type TabloKesirVerisi } from "@/types/gorsel-soru";

/**
 * tablo_kesir — tablo (çoklu veri) modeli; references/gorsel-tip-haritasi.md, Tip 4.
 * Desen daire_kesir ile aynıdır: tabloyu ve doğru cevabı KOD kurar; tablodaki
 * değerler metne yazılmaz, soru bunların üstüne bileşik kesri yorumlama, eşikle
 * karşılaştırma ya da payda eşitleyip çıkarma ister.
 */

type Uretim = GenelUretim<CizimPlaniOf<"tablo_kesir">>;

const o = (pay: number, payda = 1): Oran => oranYap({ pay, payda });
const yaz = (oran: Oran) => oranMetni(oran);
const HARFLER = ["A", "B", "C", "D", "E"];

/** Sayıdan sonra ayrılma eki, okunuşa göre: 1'den, 2'den, 3'ten, 6'dan. */
const AYRILMA_EKI: Record<number, string> = { 1: "den", 2: "den", 3: "ten", 4: "ten", 5: "ten", 6: "dan", 7: "den", 8: "den", 9: "dan" };
const ayrilma = (n: number) => `${n}'${AYRILMA_EKI[n] ?? "den"}`;

interface TabloBaglami {
  konu: string;
  baglam: string;
  basliklar: [string, string];
  /** Sayılan nesne ("3 tahta") ve ölçü birimi ("metre"). */
  nesne: string;
  birim: string;
  esikSoru: (esik: number) => string;
  esikIfadesi: string[];
  farkSoru: string;
}

const TABLO_BAGLAMLARI: readonly TabloBaglami[] = [
  {
    konu: "atölye",
    baglam: "Bir marangozun atölyesindeki tahtaların boyları tabloda verilmiştir.",
    basliklar: ["Tahta", "Boyu (metre)"],
    nesne: "tahta",
    birim: "metre",
    esikSoru: (esik) => `Buna göre boyu ${esik} metreden uzun kaç tahta vardır?`,
    esikIfadesi: ["uzun"],
    farkSoru: "Buna göre en uzun tahta ile en kısa tahtanın boyları arasındaki fark kaç metredir?",
  },
  {
    konu: "ölçüm",
    baglam: "Bir laboratuvardaki kürelerin kütleleri tabloda verilmiştir.",
    basliklar: ["Küre", "Kütlesi (kilogram)"],
    nesne: "küre",
    birim: "kg",
    esikSoru: (esik) => `Buna göre kütlesi ${esik} kilogramdan fazla olan kaç küre vardır?`,
    esikIfadesi: ["fazla", "ağır"],
    farkSoru: "Buna göre en ağır küre ile en hafif kürenin kütleleri arasındaki fark kaç kilogramdır?",
  },
  {
    konu: "mutfak",
    baglam: "Bir sınıftaki su şişelerindeki su miktarları tabloda verilmiştir.",
    basliklar: ["Şişe", "Su miktarı (litre)"],
    nesne: "şişe",
    birim: "litre",
    esikSoru: (esik) => `Buna göre içinde ${esik} litreden fazla su olan kaç şişe vardır?`,
    esikIfadesi: ["fazla"],
    farkSoru: "Buna göre en çok su olan şişe ile en az su olan şişedeki su miktarları arasındaki fark kaç litredir?",
  },
  {
    konu: "lojistik",
    baglam: "Bir kargo şubesine gelen paketlerin kütleleri tabloda verilmiştir.",
    basliklar: ["Paket", "Kütlesi (kilogram)"],
    nesne: "paket",
    birim: "kg",
    esikSoru: (esik) => `Buna göre kütlesi ${esik} kilogramdan fazla olan kaç paket vardır?`,
    esikIfadesi: ["fazla", "ağır"],
    farkSoru: "Buna göre en ağır paket ile en hafif paketin kütleleri arasındaki fark kaç kilogramdır?",
  },
  {
    konu: "meteoroloji",
    baglam: "Beş farklı meteoroloji istasyonunda bir günde ölçülen yağış miktarları tabloda verilmiştir.",
    basliklar: ["İstasyon", "Yağış (santimetre)"],
    nesne: "istasyon",
    birim: "cm",
    esikSoru: (esik) => `Buna göre yağış miktarı ${esik} santimetreden fazla olan kaç istasyon vardır?`,
    esikIfadesi: ["fazla"],
    farkSoru: "Buna göre en çok ve en az yağış alan istasyonların yağış miktarları arasındaki fark kaç santimetredir?",
  },
];

/** (alt, üst) açık aralığında, tam sayı olmayan sade bir kesir (bileşik yazımla). */
function araliktaKesir(r: Rastgele, alt: number, ust: number, paydalar: readonly number[]): Kesir | undefined {
  const payda = r.sec(paydalar);
  const adaylar = Array.from({ length: (ust - alt) * payda - 1 }, (_, i) => alt * payda + 1 + i).filter(
    (pay) => pay > 0 && pay % payda !== 0 && ebob(pay, payda) === 1
  );
  return adaylar.length > 0 ? { pay: r.sec(adaylar), payda } : undefined;
}

function farkliMi(kesirler: Kesir[]): boolean {
  const degerler = kesirler.map(oranYap);
  return degerler.every((a, i) => degerler.every((b, j) => i === j || !esitMi(a, b)));
}

function esikSay(r: Rastgele): Uretim {
  const b = r.sec(TABLO_BAGLAMLARI);
  const esik = r.aralik(1, 3);
  const buyukSayisi = r.aralik(1, 3);
  const kucukSayisi = 4 - buyukSayisi;
  const paydalar = [2, 3, 4, 5, 6, 8];
  // Tuzak: eşiğe EŞİT, sadeleşmemiş bir değer (10/5 = 2); "den uzun" sorusunda sayılmaz.
  const tuzakPayda = r.sec([3, 4, 5]);
  const tuzak: Kesir = { pay: esik * tuzakPayda, payda: tuzakPayda };
  const buyukler = Array.from({ length: buyukSayisi }, () => araliktaKesir(r, esik, esik + 1, paydalar));
  const kucukler = Array.from({ length: kucukSayisi }, () => araliktaKesir(r, esik - 1, esik, paydalar));
  const degerler = [...buyukler, ...kucukler];
  if (degerler.some((kesir) => !kesir)) return undefined;
  const tumu = [...(degerler as Kesir[]), tuzak];
  if (!farkliMi(tumu)) return undefined;
  const satirlar = r.karistir(tumu).map((deger, index) => ({ ad: HARFLER[index], deger }));
  const sayi = (n: number) => `${n} ${b.nesne}`;
  const secenekler = siklar(r, sayi(buyukSayisi), [
    { metin: sayi(buyukSayisi + 1), hata: "esitligiDahilEtme" }, // eşiğe eşit olanı da saymak
    { metin: sayi(kucukSayisi), hata: "tersYon" }, // eşikten küçükleri saymak
    ...(buyukSayisi > 1 ? [{ metin: sayi(buyukSayisi - 1), hata: "birEksik" }] : []),
    { metin: sayi(kucukSayisi + 1), hata: "tersYonEsitDahil" },
    { metin: sayi(satirlar.length), hata: "hepsiniSayma" },
  ]);
  if (!secenekler) return undefined;
  // Yalnızca bileşik kesirler (pay ≥ payda) çevrilir; basit kesirler zaten 1'den küçüktür.
  const donusumler = satirlar
    .filter((satir) => satir.deger.pay >= satir.deger.payda)
    .map((satir) => `${satir.ad}: ${ham(satir.deger.pay, satir.deger.payda)} = ${yaz(oranYap(satir.deger))}`);
  return {
    cizim: { tip: "tablo_kesir", tablo: { basliklar: b.basliklar, satirlar } },
    cikarim: metinPlani({
      baglam: `${b.baglam} Tablodaki değerleri metne YAZMA: öğrenci tablodan okur.`,
      konu: b.konu,
      ornekSoru: b.esikSoru(esik),
      veriler: [{ ad: `sınır değer (${b.birim}; yalnızca soru kökünde yaz, ayrı bir cümle kurma)`, deger: { pay: esik, payda: 1 } }],
      anahtarIfadeler: [["tablo"]],
      kokIfadeleri: [["kaç"], b.esikIfadesi],
      ipucu: `${donusumler.join("; ")}; ${ayrilma(esik)} büyük olanlar ${buyukSayisi} tane (${ham(tuzak.pay, tuzak.payda)} = ${esik} sayılmaz)`,
      cozum:
        `Bileşik kesirler tam sayılı kesre çevrilir: ${donusumler.join(", ")}. ${ayrilma(esik)} büyük olan ${buyukSayisi} ` +
        `${b.nesne} vardır; ${ham(tuzak.pay, tuzak.payda)} = ${esik} olduğu için sayılmaz.`,
      secenekler,
    }),
  };
}

/** Ortak paydası küçük payda grupları (5. sınıfta paydaları eşitleme). */
const PAYDA_GRUPLARI: readonly number[][] = [[2, 4, 8], [3, 6, 12], [2, 5, 10], [2, 3, 6], [4, 8]];

function enBuyukFark(r: Rastgele): Uretim {
  const b = r.sec(TABLO_BAGLAMLARI);
  const grup = r.sec(PAYDA_GRUPLARI);
  const degerler = Array.from({ length: 4 }, () => araliktaKesir(r, 1, 4, grup));
  if (degerler.some((kesir) => !kesir)) return undefined;
  const kesirler = degerler as Kesir[];
  if (!farkliMi(kesirler)) return undefined;
  const satirlar = kesirler.map((deger, index) => ({ ad: HARFLER[index], deger }));
  const oranlar = kesirler.map(oranYap);
  const sirali = [...oranlar].sort((x, y) => x.pay * y.payda - y.pay * x.payda);
  const [enKucuk, enBuyuk] = [sirali[0], sirali[sirali.length - 1]];
  const fark = o(enBuyuk.pay * enKucuk.payda - enKucuk.pay * enBuyuk.payda, enBuyuk.payda * enKucuk.payda);
  // Pay yanılgısı: yalnızca paylara bakıp en büyük/en küçüğü seçmek.
  const payaGore = [...kesirler].sort((x, y) => x.pay - y.pay);
  const payFarki = o(
    payaGore[3].pay * payaGore[0].payda - payaGore[0].pay * payaGore[3].payda,
    payaGore[3].payda * payaGore[0].payda
  );
  const ilkSon = o(
    Math.abs(oranlar[0].pay * oranlar[3].payda - oranlar[3].pay * oranlar[0].payda),
    oranlar[0].payda * oranlar[3].payda
  );
  const olcu = (oran: Oran) => `${yaz(oran)} ${b.birim}`;
  const secenekler = siklar(r, olcu(fark), [
    ...(payFarki.pay > 0 ? [{ metin: olcu(payFarki), hata: "yalnizcaPay" }] : []),
    ...(ilkSon.pay > 0 ? [{ metin: olcu(ilkSon), hata: "ilkVeSonSatir" }] : []),
    { metin: olcu(o(enBuyuk.pay * enKucuk.payda + enKucuk.pay * enBuyuk.payda, enBuyuk.payda * enKucuk.payda)), hata: "toplama" },
    { metin: olcu(enBuyuk), hata: "yalnizcaEnBuyuk" },
  ]);
  if (!secenekler) return undefined;
  return {
    cizim: { tip: "tablo_kesir", tablo: { basliklar: b.basliklar, satirlar } },
    cikarim: metinPlani({
      baglam: `${b.baglam} Tablodaki değerleri metne YAZMA: öğrenci tablodan okur.`,
      konu: b.konu,
      ornekSoru: b.farkSoru,
      anahtarIfadeler: [["tablo"]],
      kokIfadeleri: [["fark"]],
      ipucu: `en büyük ${yaz(enBuyuk)}, en küçük ${yaz(enKucuk)}; fark ${yaz(fark)}`,
      cozum:
        `Paydalar eşitlenerek karşılaştırılınca en büyük değer ${yaz(enBuyuk)}, en küçük değer ${yaz(enKucuk)} olur. ` +
        `Fark: ${yaz(enBuyuk)} − ${yaz(enKucuk)} = ${yaz(fark)} ${b.birim}.`,
      secenekler,
    }),
  };
}

const URETICILER: Record<TabloKesirGorevi, (r: Rastgele) => Uretim> = { esikSay, enBuyukFark };

/** Deterministik: aynı tohum aynı planı verir; koşulları sağlamayan tohumlar atlanır. */
export function tabloKesirPlaniUret(gorev: TabloKesirGorevi, tohum: number): PlanliGorselPlan<CizimPlaniOf<"tablo_kesir">> {
  for (let deneme = 0; ; deneme += 1) {
    const plan = URETICILER[gorev](rastgeleOlustur(tohum + deneme * 1013));
    if (plan) return plan;
  }
}

// ---------------------------------------------------------------------------
// Tanım
// ---------------------------------------------------------------------------

function gorevTanimi(
  gorev: TabloKesirGorevi,
  tanim: Pick<GorselSoruGorevTanimi<"tablo_kesir">, "etiket" | "aciklama" | "kurallar" | "ornekCikarim" | "ornekCizim"> & {
    ornek: { senaryo: string; soru: string };
  }
): GorselSoruGorevTanimi<"tablo_kesir"> {
  return {
    ...tanim,
    gorev,
    kesirKonusuGerekir: true,
    semaAciklamasi: PLANLI_GORSEL_SEMA_ACIKLAMASI,
    ornek: { tip: "tablo_kesir", veri: { gorev, ...tanim.ornek } },
    jsonSemasi: planliGorselSema(gorev),
  };
}

const gorevler: GorselSoruTanimi<"tablo_kesir">["gorevler"] = {
  esikSay: gorevTanimi("esikSay", {
    etiket: "Eşikle karşılaştırıp sayma",
    aciklama:
      "Tablodaki bileşik kesirler tam sayılı kesre çevrilip bir eşikle karşılaştırılır; eşikten büyük olanlar sayılır. " +
      "Eşiğe eşit (sadeleşmemiş yazılmış) değeri de saymak tipik hatadır.",
    kurallar: ["Yalnızca eşiği yaz; tablodaki değerleri metne yazma."],
    ornek: {
      senaryo: "Bir marangozun atölyesindeki tahtaların boyları tabloda verilmiştir.",
      soru: "Buna göre boyu 2 metreden uzun kaç tahta vardır?",
    },
    ornekCizim: {
      tip: "tablo_kesir",
      tablo: {
        basliklar: ["Tahta", "Boyu (metre)"],
        satirlar: [
          { ad: "A", deger: { pay: 9, payda: 5 } },
          { ad: "B", deger: { pay: 25, payda: 8 } },
          { ad: "C", deger: { pay: 10, payda: 5 } },
          { ad: "D", deger: { pay: 7, payda: 4 } },
          { ad: "E", deger: { pay: 15, payda: 7 } },
        ],
      },
    },
    ornekCikarim: metinPlani({
      baglam: "Bir marangozun atölyesindeki tahtaların boyları tabloda verilmiştir. Tablodaki değerleri metne YAZMA: öğrenci tablodan okur.",
      konu: "atölye",
      ornekSoru: "Buna göre boyu 2 metreden uzun kaç tahta vardır?",
      veriler: [{ ad: "karşılaştırma eşiği (metre)", deger: { pay: 2, payda: 1 } }],
      anahtarIfadeler: [["tablo"]],
      kokIfadeleri: [["kaç"], ["uzun"]],
      ipucu: "A: 9/5 = 1 4/5; B: 25/8 = 3 1/8; C: 10/5 = 2; D: 7/4 = 1 3/4; E: 15/7 = 2 1/7; 2'den büyük olanlar 2 tane (10/5 = 2 sayılmaz)",
      cozum:
        "Bileşik kesirler tam sayılı kesre çevrilir: A: 9/5 = 1 4/5, B: 25/8 = 3 1/8, C: 10/5 = 2, D: 7/4 = 1 3/4, " +
        "E: 15/7 = 2 1/7. 2'den büyük olan 2 tahta vardır; 10/5 = 2 olduğu için sayılmaz.",
      secenekler: [
        { metin: "3 tahta", hata: "esitligiDahilEtme" },
        { metin: "2 tahta" },
        { metin: "1 tahta", hata: "birEksik" },
        { metin: "5 tahta", hata: "hepsiniSayma" },
      ],
    }),
  }),
  enBuyukFark: gorevTanimi("enBuyukFark", {
    etiket: "En büyük ile en küçük değerin farkı",
    aciklama:
      "Tablodaki farklı paydalı kesirler karşılaştırılır; en büyük ve en küçük değer bulunup payda eşitlenerek farkları " +
      "hesaplanır. Yalnızca paylara bakarak en büyüğü seçmek tipik hatadır.",
    kurallar: ["Tablodaki değerleri metne yazma."],
    ornek: {
      senaryo: "Bir sınıftaki su şişelerindeki su miktarları tabloda verilmiştir.",
      soru: "Buna göre en çok su olan şişe ile en az su olan şişedeki su miktarları arasındaki fark kaç litredir?",
    },
    ornekCizim: {
      tip: "tablo_kesir",
      tablo: {
        basliklar: ["Şişe", "Su miktarı (litre)"],
        satirlar: [
          { ad: "A", deger: { pay: 5, payda: 4 } },
          { ad: "B", deger: { pay: 11, payda: 8 } },
          { ad: "C", deger: { pay: 3, payda: 2 } },
          { ad: "D", deger: { pay: 9, payda: 8 } },
        ],
      },
    },
    ornekCikarim: metinPlani({
      baglam: "Bir sınıftaki su şişelerindeki su miktarları tabloda verilmiştir. Tablodaki değerleri metne YAZMA: öğrenci tablodan okur.",
      konu: "mutfak",
      ornekSoru: "Buna göre en çok su olan şişe ile en az su olan şişedeki su miktarları arasındaki fark kaç litredir?",
      anahtarIfadeler: [["tablo"]],
      kokIfadeleri: [["fark"]],
      ipucu: "en büyük 1 1/2, en küçük 1 1/8; fark 3/8",
      cozum:
        "Paydalar eşitlenerek karşılaştırılınca en büyük değer 1 1/2, en küçük değer 1 1/8 olur. Fark: 1 1/2 − 1 1/8 = 3/8 litre.",
      secenekler: [
        { metin: "1 1/2 litre", hata: "yalnizcaEnBuyuk" },
        { metin: "3/8 litre" },
        { metin: "1/8 litre", hata: "ilkVeSonSatir" },
        { metin: "2 5/8 litre", hata: "toplama" },
      ],
    }),
  }),
};

export const tabloKesirTanimi: GorselSoruTanimi<"tablo_kesir"> = {
  tip: "tablo_kesir",
  etiket: "Tablo (çoklu veri) modeli",
  aciklama:
    "Kesir değerleri içeren iki sütunlu bir tablo. Sistem tabloyu plandaki değerlerden çizer ve doğru cevabı kendisi " +
    "hesaplar; öğrenci birden çok değeri dönüştürüp karşılaştırır.",
  gorselKategorisi: "fonksiyonel",
  gorselStratejisi: "svg",
  kesirKonusuGerekir: true,
  kurallar: [
    "Bağlam birden çok ölçümdür (tahta boyları, küre kütleleri, su miktarları). Değerler TABLODA görünür; bunları metne " +
      "yazma (sistem metindeki plan dışı sayıları reddeder).",
    "Metin 1-2 kısa cümle olsun: tablonun neyi gösterdiği.",
  ],
  ortakSemaAciklamasi: [],
  gorevler,
  dogrula: (raw, path, sorunlar, plan) =>
    planliGorselDogrula(
      raw,
      path,
      sorunlar,
      plan,
      { gorevler: TABLO_KESIR_GOREVLERI, cizimTipi: "tablo_kesir", serbestSayilar: (cizim) => [cizim.tablo.satirlar.length] },
      (ortak, cizim): TabloKesirVerisi => ({ ...ortak, tablo: cizim.tablo })
    ),
  dogruCevapMetni: planliDogruCevapMetni,
};
