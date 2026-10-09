import {
  esitMi,
  islemUygula,
  oranMetni,
  oranYap,
  tamSayiMi,
  type Oran,
} from "@/lib/quiz-generator/gorsel-sorular/kesir-aritmetigi";
import type { Kesir, SenaryoGorevi, SenaryoSayilari } from "@/types/gorsel-soru";

/**
 * Sayısal senaryo görevleri için BAĞLAMI, SAYILARI ve ŞIKLARI kod seçer.
 *
 * - Sayılar cevaptan geriye doğru kurulur: gerçek üretimlerde model,
 *   koşulları aynı anda sağlayan sayıları kurmakta sürekli başarısız oldu.
 * - Bağlam, elle yazılmış gerçekçi şablonlardan seçilir ve sayı aralıkları
 *   o bağlama göre ayarlanır (bir bardağa 1/4 litre süt, bir gömleğe
 *   1 1/5 metre kumaş): model "bisikletle benzin harcamak" gibi zorlama
 *   bağlamlar uyduramaz.
 * - Çeldiriciler rastgele değildir: her biri adı konmuş bir öğrenci
 *   hatasının (yanlış yöne yuvarlama, ±1, birim bulmadan çarpma, kesri
 *   yanlış bütüne uygulama…) hesaplanmış sonucudur.
 *
 * Model yalnızca bu bağlamda, bu sayılarla senaryo metnini, soru kökünü ve
 * hesabı yazar; kod hesabın bu cevaba ulaştığını denetler.
 *
 * Deterministiktir: aynı tohum her zaman aynı sonucu verir (Blueprint
 * rastgelelik kullanmaz).
 */

type SayisalGorev = Exclude<SenaryoGorevi, "cokAdimliCikarim">;

interface Rastgele {
  sec<T>(dizi: readonly T[]): T;
  aralik(min: number, max: number): number;
  karistir<T>(dizi: T[]): T[];
}

/** Küçük, tohumlanabilir sözde rastgele üreteç (mulberry32). */
function rastgeleOlustur(tohum: number): Rastgele {
  let durum = tohum >>> 0;
  const sonraki = () => {
    durum = (durum + 0x6d2b79f5) >>> 0;
    let t = durum;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    sec: (dizi) => dizi[Math.floor(sonraki() * dizi.length)],
    aralik: (min, max) => min + Math.floor(sonraki() * (max - min + 1)),
    karistir: (dizi) => {
      const kopya = [...dizi];
      for (let i = kopya.length - 1; i > 0; i -= 1) {
        const j = Math.floor(sonraki() * (i + 1));
        [kopya[i], kopya[j]] = [kopya[j], kopya[i]];
      }
      return kopya;
    },
  };
}

function ebob(a: number, b: number): number {
  return b === 0 ? a : ebob(b, a % b);
}

const o = (pay: number, payda = 1): Oran => oranYap({ pay, payda });
const topla = (a: Oran, b: Oran) => islemUygula("topla", [a, b]) as Oran;
const cikar = (a: Oran, b: Oran) => islemUygula("cikar", [a, b]) as Oran;
const carp = (a: Oran, b: Oran) => islemUygula("carp", [a, b]) as Oran;
const bol = (a: Oran, b: Oran) => islemUygula("bol", [a, b]) as Oran;

/** Öğrencinin göreceği biçim: tam sayı → 4, 1'den büyükse karışık (2 2/5) ya da bileşik (34/5). */
function kesir(oran: Oran, bicim: "karisik" | "bilesik" = "karisik"): Kesir {
  if (tamSayiMi(oran)) return { pay: oran.pay, payda: 1 };
  if (bicim === "bilesik" || oran.pay < oran.payda) return { pay: oran.pay, payda: oran.payda };
  return { tam: Math.floor(oran.pay / oran.payda), pay: oran.pay % oran.payda, payda: oran.payda };
}

function metin(oran: Oran): string {
  return oranMetni(oran);
}

/** Sade (pay ile paydası aralarında asal) bir kesir; `birdenBuyuk` ise pay > payda. */
function sadeKesir(r: Rastgele, paydalar: readonly number[], birdenBuyuk: boolean): Oran {
  const payda = r.sec(paydalar);
  const adaylar = (birdenBuyuk
    ? Array.from({ length: payda - 1 }, (_, i) => payda + 1 + i)
    : Array.from({ length: payda - 1 }, (_, i) => i + 1)
  ).filter((pay) => ebob(pay, payda) === 1);
  return o(r.sec(adaylar), payda);
}

interface Celdirici {
  deger: Oran;
  hata: string;
}

/**
 * Doğru cevap + hata modellerinden gelen çeldiricilerden 4 şık kurar:
 * sıfır/negatif, cevaba eşit ya da birbirinin aynısı olan çeldiriciler
 * elenir; eksik kalırsa cevaba yakın değerlerle tamamlanır. Sıra karıştırılır.
 */
function secenekleriKur(r: Rastgele, cevap: Oran, celdiriciler: Celdirici[]): SenaryoSayilari["secenekler"] {
  const secilen: Celdirici[] = [];
  const ekle = (aday: Celdirici) => {
    if (aday.deger.pay <= 0 || esitMi(aday.deger, cevap)) return;
    if (secilen.some((var_) => esitMi(var_.deger, aday.deger))) return;
    if (secilen.length < 3) secilen.push(aday);
  };
  celdiriciler.forEach(ekle);
  const adim = tamSayiMi(cevap) ? o(1) : o(1, cevap.payda);
  for (let k = 1; secilen.length < 3; k += 1) {
    ekle({ deger: topla(cevap, carp(adim, o(k))), hata: "yakinDeger" });
    ekle({ deger: cikar(cevap, carp(adim, o(k))), hata: "yakinDeger" });
  }
  return r.karistir([{ deger: kesir(cevap) }, ...secilen.map((c) => ({ deger: kesir(c.deger), hata: c.hata }))]);
}

// ---------------------------------------------------------------------------
// Görevler
// ---------------------------------------------------------------------------

interface BolmeBaglami {
  baglam: string;
  ornekSoru: string;
  birim: string;
  toplamAdi: string;
  parcaAdi: string;
  /** Bir parçaya düşen miktarın gerçekçi aralığı. */
  parca: (r: Rastgele) => Oran;
  /**
   * Toplamın gösterimi. Varsayılan tam sayılı kesirdir ("11 1/2 kilogram
   * boya"); terzi referans sorusu bileşik kesir (34/5 m) kullanır.
   */
  toplamBicim?: "bilesik";
}

const EN_FAZLA_BAGLAMLARI: readonly BolmeBaglami[] = [
  {
    baglam: "Bir terzi, belirli uzunluktaki bir kumaştan aynı modelde gömlekler dikecek; her gömleğe aynı uzunlukta kumaş gider.",
    ornekSoru: "Buna göre terzi bu kumaşla en fazla kaç gömlek dikebilir?",
    birim: "metre",
    toplamAdi: "kumaşın uzunluğu (metre)",
    parcaAdi: "bir gömleğe giden kumaş (metre)",
    parca: (r) => sadeKesir(r, [4, 5], true),
    toplamBicim: "bilesik",
  },
  {
    baglam: "Bir kırtasiyeci, bir top kurdeleyi kesip hediye paketlerini süsleyecek; her pakete aynı uzunlukta kurdele kullanılır.",
    ornekSoru: "Buna göre bu kurdeleyle en fazla kaç paket süslenebilir?",
    birim: "metre",
    toplamAdi: "kurdelenin uzunluğu (metre)",
    parcaAdi: "bir pakete giden kurdele (metre)",
    parca: (r) => sadeKesir(r, [3, 4, 5, 6], false),
  },
  {
    baglam: "Bir kafede sürahideki süt, eşit miktarda olacak şekilde bardaklara dökülecek.",
    ornekSoru: "Buna göre sürahideki sütle en fazla kaç bardak doldurulabilir?",
    birim: "litre",
    toplamAdi: "sürahideki süt (litre)",
    parcaAdi: "bir bardağa konan süt (litre)",
    parca: (r) => r.sec([o(1, 4), o(1, 5), o(1, 3), o(2, 5)]),
  },
];

const EN_AZ_BAGLAMLARI: readonly BolmeBaglami[] = [
  {
    baglam: "Bir sınıfın pikniği için belirli miktarda ayran gerekiyor; ayran eşit hacimli büyük şişelerde satılıyor.",
    ornekSoru: "Buna göre ihtiyacı karşılamak için en az kaç şişe ayran alınmalıdır?",
    birim: "litre",
    toplamAdi: "gereken ayran (litre)",
    parcaAdi: "bir şişedeki ayran (litre)",
    // Gerçek çıktıda "sınıf pikniği için 5/4 litre ayran" çıktı: bir sınıf
    // için gerçekçi olmayan bir miktar. Büyük şişelerle toplam 4-17 litre olur.
    parca: (r) => r.sec([o(3, 2), o(5, 2), o(9, 4)]),
  },
  {
    baglam: "Bir usta, bir duvarı boyamak için belirli miktarda boya kullanacak; boya eşit miktarlı kutularda satılıyor.",
    ornekSoru: "Buna göre usta en az kaç kutu boya almalıdır?",
    birim: "kilogram",
    toplamAdi: "gereken boya (kilogram)",
    parcaAdi: "bir kutudaki boya (kilogram)",
    parca: (r) => r.sec([o(3, 2), o(5, 2), o(7, 4), o(5, 4)]),
  },
];

function bolmeEnFazla(r: Rastgele): SenaryoSayilari {
  const enAz = r.aralik(0, 4) < 2;
  const b = r.sec(enAz ? EN_AZ_BAGLAMLARI : EN_FAZLA_BAGLAMLARI);
  const parca = b.parca(r);
  const n = r.aralik(3, 7);
  // Artık sıfırdan büyük ve bir parçadan küçüktür, bu yüzden bölüm hiçbir
  // zaman tam çıkmaz. Mümkünse parçayla aynı paydayı kullanır (referans
  // soru gibi temiz kesirler: 34/5 ve 8/5); payı 1 olan parçalarda yarım parça.
  const artik = parca.pay > 1 ? o(r.aralik(1, parca.pay - 1), parca.payda) : o(1, parca.payda * 2);
  const toplam = topla(carp(o(enAz ? n - 1 : n), parca), artik);
  const bolum = bol(toplam, parca);
  const cevap = o(enAz ? Math.ceil(bolum.pay / bolum.payda) : Math.floor(bolum.pay / bolum.payda));
  const celdiriciler: Celdirici[] = enAz
    ? [
        { deger: o(Math.floor(bolum.pay / bolum.payda)), hata: "yuvarlama" }, // aşağı yuvarlamak: ihtiyaç karşılanmaz
        { deger: bolum, hata: "yuvarlama" }, // bölümü yuvarlamadan yazmak
        { deger: topla(cevap, o(1)), hata: "birFazla" },
      ]
    : [
        { deger: topla(cevap, o(1)), hata: "yuvarlama" }, // yukarı yuvarlamak: son parça yetmez
        { deger: bolum, hata: "yuvarlama" },
        { deger: cikar(cevap, o(1)), hata: "birEksik" },
      ];
  return {
    baglam: b.baglam,
    ornekSoru: b.ornekSoru,
    veriler: [
      { ad: b.toplamAdi, deger: kesir(toplam, b.toplamBicim) },
      { ad: b.parcaAdi, deger: kesir(parca) },
    ],
    cevap: kesir(cevap),
    ipucu:
      `${metin(toplam)} ÷ ${metin(parca)} = ${metin(bolum)} → ` +
      (enAz ? `ihtiyacın tamamı için yukarı yuvarlanır: en az ${metin(cevap)}` : `artan bir parçaya yetmez: en fazla ${metin(cevap)}`),
    secenekler: secenekleriKur(r, cevap, celdiriciler),
  };
}

interface OlceklemeBaglami {
  baglam: (k1: number) => string;
  ornekSoru: (k2: number) => string;
  birim: string;
  anahtarIfadeler?: string[][];
  verilenAdi: (k1: number) => string;
  k1Adi: string;
  k2Adi: string;
  birimDeger: (r: Rastgele) => Oran;
}

const OLCEKLEME_BAGLAMLARI: readonly OlceklemeBaglami[] = [
  {
    baglam: () =>
      "Bir krokide okul, kütüphane ve kafe aynı yol üzerinde gösterilmiştir; krokideki her kare gerçekte aynı uzunluğu gösterir. Okul ile kütüphane arasının kaç kare, kütüphane ile kafe arasının kaç kare olduğu verilir.",
    ornekSoru: () => "Buna göre kütüphane ile kafe arası kaç kilometredir?",
    birim: "km",
    // Gerçek çıktıda bu cümle atlandı; o olmadan kareler arası ölçek belirsizdir.
    anahtarIfadeler: [["her kare", "her bir kare", "kareler eşit", "karelerin her biri"]],
    verilenAdi: (k1) => `okul ile kütüphane arasındaki gerçek uzaklık (${k1} kare, km)`,
    k1Adi: "okul ile kütüphane arasındaki kare sayısı",
    k2Adi: "kütüphane ile kafe arasındaki kare sayısı",
    birimDeger: (r) => sadeKesir(r, [4, 5], true),
  },
  {
    baglam: (k1) => `Bir markette aynı ağırlıktaki pirinç paketleri satılıyor; ${k1} paketin toplam ağırlığı verilir.`,
    // Gerçek çıktıda "3 paket 3/5 kg" çıktı; pirinç paketi 1 kg’dan hafif olmaz.
    ornekSoru: (k2) => `Buna göre ${k2} paket pirinç kaç kilogramdır?`,
    birim: "kg",
    verilenAdi: (k1) => `${k1} paketin toplam ağırlığı (kg)`,
    k1Adi: "ağırlığı verilen paket sayısı",
    k2Adi: "ağırlığı sorulan paket sayısı",
    birimDeger: (r) => sadeKesir(r, [2, 4], true),
  },
  {
    baglam: (k1) => `Bir musluktan her dakika eşit miktarda su akıyor; ${k1} dakikada akan su miktarı verilir.`,
    ornekSoru: (k2) => `Buna göre musluktan ${k2} dakikada kaç litre su akar?`,
    birim: "litre",
    verilenAdi: (k1) => `${k1} dakikada akan su (litre)`,
    k1Adi: "verilen süre (dakika)",
    k2Adi: "sorulan süre (dakika)",
    birimDeger: (r) => sadeKesir(r, [3, 4], true),
  },
];

function birimOlcekleme(r: Rastgele): SenaryoSayilari {
  const b = r.sec(OLCEKLEME_BAGLAMLARI);
  const birim = b.birimDeger(r);
  const k1 = r.sec([2, 3, 4].filter((k) => ebob(k, birim.payda) === 1));
  const k2 = r.aralik(k1 + 1, k1 + 3);
  const verilen = carp(birim, o(k1));
  const cevap = carp(birim, o(k2));
  return {
    baglam: b.baglam(k1),
    ornekSoru: b.ornekSoru(k2),
    birim: b.birim,
    anahtarIfadeler: b.anahtarIfadeler,
    veriler: [
      { ad: b.verilenAdi(k1), deger: kesir(verilen) },
      { ad: b.k1Adi, deger: kesir(o(k1)) },
      { ad: b.k2Adi, deger: kesir(o(k2)) },
    ],
    cevap: kesir(cevap),
    ipucu: `bir birim = ${metin(verilen)} ÷ ${k1} = ${metin(birim)}; ${k2} birim = ${metin(cevap)}`,
    secenekler: secenekleriKur(r, cevap, [
      { deger: birim, hata: "adimAtlama" }, // yalnızca bir birimin değerini bulmak
      { deger: carp(verilen, o(k2)), hata: "adimAtlama" }, // birim bulmadan çarpmak
      { deger: topla(verilen, o(k2 - k1)), hata: "yanlisIslem" }, // toplamsal düşünme
    ]),
  };
}

interface CoklukBaglami {
  baglam: string;
  ornekSoru: string;
  birim?: string;
  butunAdi: string;
  birinciAdi: string;
  ikinciAdi: string;
  /** Bütünün gerçekçi aralığı. */
  aralik: [number, number];
  /** İkinci kesrin hangi bütüne ait olduğunu belli eden ifadeler (sorunun asıl inceliği). */
  anahtarIfadeler: string[][];
}

// "Tümün kesri" ile "kalanın kesri" ayrımı açıkça yazılmazsa soru iki anlamlı olur.
const TUMUN_KESRI = [["tüm", "bütün", "yine"]];

const KALAN_BAGLAMLARI: readonly CoklukBaglami[] = [
  {
    baglam: "Bir manav sabah belirli miktarda elma aldı; öğleden önce elmaların bir kısmını, öğleden sonra yine TÜM elmaların bir kısmını sattı.",
    ornekSoru: "Buna göre akşam manavda kaç kilogram elma kalmıştır?",
    birim: "kg",
    butunAdi: "sabah alınan elma (kg)",
    birinciAdi: "öğleden önce satılan, tüm elmaların kesri",
    ikinciAdi: "öğleden sonra satılan, tüm elmaların kesri",
    aralik: [12, 72],
    anahtarIfadeler: TUMUN_KESRI,
  },
  {
    // "Eylem 200 sayfalık bir kitabın pazartesi günü tüm kitabın 1/4’ünü okudu" gibi bozuk cümleler çıktı:
    // kitap önce kendi cümlesinde tanıtılmalı.
    baglam:
      "Bir öğrenci bir kitap okuyor (kitap ve sayfa sayısı ayrı bir cümlede tanıtılır: \"Eylem 200 sayfalık bir kitap okuyor.\"); pazartesi kitabın bir kısmını, salı yine TÜM kitabın bir kısmını okudu.",
    ornekSoru: "Buna göre kitabın okunmamış kaç sayfası kalmıştır?",
    birim: "sayfa",
    butunAdi: "kitabın sayfa sayısı",
    birinciAdi: "pazartesi okunan, tüm kitabın kesri",
    ikinciAdi: "salı okunan, tüm kitabın kesri",
    aralik: [60, 240],
    anahtarIfadeler: TUMUN_KESRI,
  },
  {
    baglam: "Bir öğrenci harçlığının bir kısmını kitaba, yine TÜM harçlığının bir kısmını kırtasiye malzemesine harcadı.",
    ornekSoru: "Buna göre öğrencinin harçlığından kaç lira kalmıştır?",
    birim: "TL",
    butunAdi: "harçlık (TL)",
    birinciAdi: "kitaba harcanan, tüm harçlığın kesri",
    ikinciAdi: "kırtasiyeye harcanan, tüm harçlığın kesri",
    aralik: [30, 240],
    anahtarIfadeler: TUMUN_KESRI,
  },
];

const ARDISIK_BAGLAMLARI: readonly CoklukBaglami[] = [
  {
    baglam: "Bir sınıftaki öğrencilerin bir kısmı okula servisle geliyor; servisle GELMEYENLERİN bir kısmı bisikletle, geri kalanı yürüyerek geliyor.",
    ornekSoru: "Buna göre bu sınıfta okula yürüyerek gelen kaç öğrenci vardır?",
    butunAdi: "sınıftaki öğrenci sayısı",
    birinciAdi: "servisle gelenler, tüm öğrencilerin kesri",
    ikinciAdi: "bisikletle gelenler, servisle gelmeyenlerin kesri",
    aralik: [12, 40],
    anahtarIfadeler: [["gelmeyen", "geriye kalan", "kalanların"]],
  },
  {
    baglam: "Bir fidanlıktaki fidanların bir kısmı çamdır; çam OLMAYANLARIN bir kısmı ıhlamur, geri kalanı meşedir.",
    ornekSoru: "Buna göre fidanlıkta kaç meşe fidanı vardır?",
    butunAdi: "fidan sayısı",
    birinciAdi: "çam fidanları, tüm fidanların kesri",
    ikinciAdi: "ıhlamur fidanları, çam olmayanların kesri",
    aralik: [24, 120],
    anahtarIfadeler: [["olmayan", "geriye kalan", "kalanların"]],
  },
  {
    baglam: "Bir okul kütüphanesine gelen kitapların bir kısmı romandır; roman OLMAYANLARIN bir kısmı hikâye, geri kalanı şiir kitabıdır.",
    ornekSoru: "Buna göre kütüphaneye kaç şiir kitabı gelmiştir?",
    butunAdi: "gelen kitap sayısı",
    birinciAdi: "romanlar, tüm kitapların kesri",
    ikinciAdi: "hikâyeler, roman olmayanların kesri",
    aralik: [24, 120],
    anahtarIfadeler: [["olmayan", "geriye kalan", "kalanların"]],
  },
];

/** `aralik` içinde kalan, `kat`ın katı bir bütün; sığmazsa en küçük kat. */
function katSec(r: Rastgele, kat: number, [min, max]: [number, number]): number {
  const adaylar = Array.from({ length: Math.floor(max / kat) }, (_, i) => (i + 1) * kat).filter((n) => n >= min);
  return adaylar.length > 0 ? r.sec(adaylar) : kat;
}

function kalaniBulma(r: Rastgele): SenaryoSayilari {
  for (;;) {
    const b = r.sec(KALAN_BAGLAMLARI);
    const f1 = sadeKesir(r, [3, 4, 5, 6, 8], false);
    const f2 = sadeKesir(r, [2, 3, 4, 5, 6, 8], false);
    if (f1.payda === f2.payda) continue;
    const kullanilanKesir = topla(f1, f2);
    if (kullanilanKesir.pay >= kullanilanKesir.payda) continue;
    // Bütün, iki paydanın çarpımının katı: "kalanın kesri" çeldiricisi de tam sayı çıkar.
    const w = o(katSec(r, f1.payda * f2.payda, b.aralik));
    const birinci = carp(w, f1);
    const ikinci = carp(w, f2);
    const cevap = cikar(w, topla(birinci, ikinci));
    const ilkKalan = cikar(w, birinci);
    return {
      baglam: b.baglam,
      ornekSoru: b.ornekSoru,
      birim: b.birim,
      anahtarIfadeler: b.anahtarIfadeler,
      veriler: [
        { ad: b.butunAdi, deger: kesir(w) },
        { ad: b.birinciAdi, deger: kesir(f1) },
        { ad: b.ikinciAdi, deger: kesir(f2) },
      ],
      cevap: kesir(cevap),
      ipucu: `${metin(w)} × ${metin(f1)} = ${metin(birinci)}; ${metin(w)} × ${metin(f2)} = ${metin(ikinci)}; kalan ${metin(cevap)}`,
      secenekler: secenekleriKur(r, cevap, [
        { deger: topla(birinci, ikinci), hata: "adimAtlama" }, // kullanılanı cevap sanmak
        { deger: cikar(ilkKalan, carp(ilkKalan, f2)), hata: "yanlisIslem" }, // ikinci kesri tümün değil kalanın kesri sanmak
        { deger: cikar(w, birinci), hata: "adimAtlama" }, // ikinci kısmı unutmak
      ]),
    };
  }
}

function coklugunKesri(r: Rastgele): SenaryoSayilari {
  for (;;) {
    const b = r.sec(ARDISIK_BAGLAMLARI);
    const f1 = sadeKesir(r, [3, 4, 5, 7], false);
    const f2 = sadeKesir(r, [2, 3, 4], false);
    const n = o(katSec(r, f1.payda * f2.payda, b.aralik));
    const birinci = carp(n, f1);
    const kalan = cikar(n, birinci);
    const ikinci = carp(kalan, f2);
    const cevap = cikar(kalan, ikinci);
    if (cevap.pay <= 0) continue;
    return {
      baglam: b.baglam,
      ornekSoru: b.ornekSoru,
      birim: b.birim,
      anahtarIfadeler: b.anahtarIfadeler,
      veriler: [
        { ad: b.butunAdi, deger: kesir(n) },
        { ad: b.birinciAdi, deger: kesir(f1) },
        { ad: b.ikinciAdi, deger: kesir(f2) },
      ],
      cevap: kesir(cevap),
      ipucu: `${metin(n)} × ${metin(f1)} = ${metin(birinci)}; kalan ${metin(kalan)}; ${metin(kalan)} × ${metin(f2)} = ${metin(ikinci)}; geriye ${metin(cevap)}`,
      secenekler: secenekleriKur(r, cevap, [
        { deger: cikar(kalan, carp(n, f2)), hata: "yanlisIslem" }, // ikinci kesri tüm çokluğa uygulamak
        { deger: ikinci, hata: "adimAtlama" }, // ikinci grubu cevap sanmak
        { deger: kalan, hata: "adimAtlama" }, // ikinci grubu çıkarmayı unutmak
      ]),
    };
  }
}

interface KarsilastirmaBaglami {
  baglam: string;
  ornekSoru: string;
  birim: string;
  adlar: [string, string, string, string];
  aralik: [number, number];
}

const KARSILASTIRMA_BAGLAMLARI: readonly KarsilastirmaBaglami[] = [
  {
    baglam: "Elif ve Can, sayfa sayıları farklı iki kitap okuyor; her biri kendi kitabının bir kısmını okudu.",
    ornekSoru: "Buna göre Elif, Can'dan kaç sayfa fazla okumuştur?",
    birim: "sayfa",
    adlar: ["Elif'in kitabının sayfa sayısı", "Elif'in okuduğu kısım (kendi kitabının kesri)", "Can'ın kitabının sayfa sayısı", "Can'ın okuduğu kısım (kendi kitabının kesri)"],
    aralik: [60, 240],
  },
  {
    baglam: "Ayşe ve Mert, harçlıklarının bir kısmını biriktiriyor; harçlıkları farklıdır.",
    ornekSoru: "Buna göre Ayşe, Mert'ten kaç lira fazla biriktirmiştir?",
    birim: "TL",
    adlar: ["Ayşe'nin harçlığı (TL)", "Ayşe'nin biriktirdiği kısım (harçlığının kesri)", "Mert'in harçlığı (TL)", "Mert'in biriktirdiği kısım (harçlığının kesri)"],
    aralik: [40, 200],
  },
  {
    baglam: "İki çiftçi, büyüklükleri farklı tarlalarının bir kısmına buğday ekti.",
    ornekSoru: "Buna göre birinci çiftçi, ikinci çiftçiden kaç dönüm fazla buğday ekmiştir?",
    birim: "dönüm",
    adlar: ["birinci tarlanın büyüklüğü (dönüm)", "birinci tarlaya ekilen kısım (kesir)", "ikinci tarlanın büyüklüğü (dönüm)", "ikinci tarlaya ekilen kısım (kesir)"],
    aralik: [12, 60],
  },
];

function karsilastirma(r: Rastgele): SenaryoSayilari {
  for (;;) {
    const b = r.sec(KARSILASTIRMA_BAGLAMLARI);
    const f1 = sadeKesir(r, [3, 4, 5, 6], false);
    const f2 = sadeKesir(r, [3, 4, 5, 8], false);
    const n1 = o(katSec(r, f1.payda, b.aralik));
    const n2 = o(katSec(r, f2.payda, b.aralik));
    if (esitMi(n1, n2) || esitMi(f1, f2)) continue;
    const a = carp(n1, f1);
    const c = carp(n2, f2);
    const cevap = cikar(a, c);
    // Soru kökü "birinci, ikinciden kaç fazla" diye sorar: fark pozitif olmalı.
    if (cevap.pay <= 0) continue;
    return {
      baglam: b.baglam,
      ornekSoru: b.ornekSoru,
      birim: b.birim,
      veriler: [
        { ad: b.adlar[0], deger: kesir(n1) },
        { ad: b.adlar[1], deger: kesir(f1) },
        { ad: b.adlar[2], deger: kesir(n2) },
        { ad: b.adlar[3], deger: kesir(f2) },
      ],
      cevap: kesir(cevap),
      ipucu: `${metin(n1)} × ${metin(f1)} = ${metin(a)}; ${metin(n2)} × ${metin(f2)} = ${metin(c)}; fark ${metin(cevap)}`,
      secenekler: secenekleriKur(r, cevap, [
        { deger: o(Math.abs(n1.pay - n2.pay)), hata: "yanlisIslem" }, // kesirleri yok sayıp bütünleri karşılaştırmak
        { deger: a, hata: "adimAtlama" }, // yalnızca birinci miktarı bulmak
        { deger: topla(a, c), hata: "yanlisIslem" }, // fark yerine toplam almak
      ]),
    };
  }
}

/** Aralık görevi plana alınmaz (bkz. görev tanımı); tutarlılık için üretici duruyor. */
function araliklar(r: Rastgele): SenaryoSayilari {
  const adim = sadeKesir(r, [2, 3, 4, 5], true);
  const aralikSayisi = r.aralik(8, 15);
  const uzunluk = carp(adim, o(aralikSayisi));
  const cevap = o(aralikSayisi - 1);
  return {
    baglam:
      "Bir koşu pistine engeller dizilecek; ilk engelin başlangıç çizgisine, son engelin bitiş çizgisine uzaklığı ve ardışık iki engel arasındaki uzaklık eşittir.",
    ornekSoru: "Buna göre piste toplam kaç engel yerleştirilmiştir?",
    veriler: [
      { ad: "pistin uzunluğu (metre)", deger: kesir(uzunluk, "bilesik") },
      { ad: "iki engel arası uzaklık (metre)", deger: kesir(adim) },
    ],
    cevap: kesir(cevap),
    ipucu: `${aralikSayisi} aralık; uçlarda engel yok → ${aralikSayisi} − 1 = ${metin(cevap)}`,
    secenekler: secenekleriKur(r, cevap, [
      { deger: o(aralikSayisi), hata: "birFazla" },
      { deger: o(aralikSayisi + 1), hata: "yanlisIslem" },
      { deger: o(aralikSayisi - 2), hata: "birEksik" },
    ]),
  };
}

const URETICILER: Record<SayisalGorev, (r: Rastgele) => SenaryoSayilari> = {
  bolmeEnFazla,
  birimOlcekleme,
  araliklar,
  kalaniBulma,
  coklugunKesri,
  karsilastirma,
};

export function senaryoSayilariUret(gorev: SayisalGorev, tohum: number): SenaryoSayilari {
  // Cevap, senaryoya yazılacak bir sayıya eşit çıkarsa (ör. sonuç 3 ve
  // verilerden biri "3 paket") cevap metinde verilmiş olur: o tohum atlanır.
  for (let deneme = 0; ; deneme += 1) {
    const plan = URETICILER[gorev](rastgeleOlustur(tohum + deneme * 1013));
    const cevap = oranYap(plan.cevap);
    if (!plan.veriler.some((veri) => esitMi(oranYap(veri.deger), cevap))) return plan;
  }
}
