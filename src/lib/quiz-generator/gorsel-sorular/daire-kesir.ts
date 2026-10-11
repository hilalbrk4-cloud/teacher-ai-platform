import { esitMi, oranMetni, oranYap, type Oran } from "@/lib/quiz-generator/gorsel-sorular/kesir-aritmetigi";
import type { GorselSoruGorevTanimi, GorselSoruTanimi } from "@/lib/quiz-generator/gorsel-sorular/ortak";
import {
  ISIMLER,
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
import {
  DAIRE_KESIR_GOREVLERI,
  DAIRE_RENKLERI,
  type DaireCizimi,
  type DaireKesirGorevi,
  type DaireKesirVerisi,
} from "@/types/gorsel-soru";

/**
 * daire_kesir — pizza/pasta (daire) modeli. Desen: references/daire-kesir-demo.html.
 *
 * Daireyi ve doğru cevabı KOD kurar: dilim ve dolu dilim sayıları metne
 * YAZILMAZ, öğrenci şekilden okur; soru bunun üstüne en az bir işlem daha
 * ister (çarpma, çıkarma + sadeleştirme, karşılaştırma, toplama, denklik).
 * Böylece görsel işlevseldir ve soru tek adımlı "resmi oku" olmaz.
 */

type Uretim = GenelUretim<CizimPlaniOf<"daire_kesir">>;

const o = (pay: number, payda = 1): Oran => oranYap({ pay, payda });
const yaz = (oran: Oran) => oranMetni(oran);

const SAYI_YAZMA = "Bölme/dilim sayılarını ve kesirleri metne YAZMA: öğrenci şekilden okur.";

// ---------------------------------------------------------------------------
// Karışım oranı (references/senaryo-kalite-referans-v2.md, Aile 1 şablonu → farklı sektörler)
// ---------------------------------------------------------------------------

interface KarisimBaglami {
  konu: string;
  giris: string;
  /** Karışımda kesri verilen bileşen ("kum"); metinde geçmesi zorunlu. */
  bilesen: string;
  birim: string;
  soru: string;
}

const KARISIM_BAGLAMLARI: readonly KarisimBaglami[] = [
  {
    konu: "boya",
    giris: "Bir boyacı açık renkli bir duvar boyası hazırlıyor.",
    bilesen: "beyaz boya",
    birim: "litre",
    soru: "Buna göre karışımda kaç litre beyaz boya kullanılmıştır?",
  },
  {
    konu: "inşaat",
    giris: "Bir inşaat ustası duvar örmek için harç hazırlıyor.",
    bilesen: "kum",
    birim: "kova",
    soru: "Buna göre harçta kaç kova kum kullanılmıştır?",
  },
  {
    konu: "tarım",
    giris: "Bir sera çalışanı fideler için toprak karışımı hazırlıyor.",
    bilesen: "kompost",
    birim: "kilogram",
    soru: "Buna göre toprak karışımında kaç kilogram kompost vardır?",
  },
  {
    konu: "laboratuvar",
    giris: "Bir laboratuvar teknisyeni bitkiler için besin çözeltisi hazırlıyor.",
    bilesen: "saf su",
    birim: "litre",
    soru: "Buna göre çözeltide kaç litre saf su kullanılmıştır?",
  },
];

/**
 * Karışım oranı (TYMM: gerçek hayat problemi). Daire, eş bölmelere ayrılmış bir karışım
 * diyagramıdır: bölme sayısı şekilden sayılır, karışımın kesri bileşeni, bir bölmenin
 * miktarı birimi verir. Üç adım: bölmeleri saymak, kesri bölmeye çevirmek, birime çevirmek.
 */
function boyaKarisimi(r: Rastgele): Uretim {
  const b = r.sec(KARISIM_BAGLAMLARI);
  const [p, q] = r.sec([[2, 3], [3, 4], [1, 2], [5, 6], [2, 5], [3, 5], [3, 8], [5, 8]] as const);
  const m = r.sec([2, 3]);
  const bolme = q * m;
  if (bolme > 16) return undefined;
  const bilesenBolme = p * m;
  const miktar = r.sec([2, 3, 4]);
  const olcu = (x: number) => `${x} ${b.birim}`;
  const secenekler = siklar(r, olcu(bilesenBolme * miktar), [
    { metin: olcu((bolme - bilesenBolme) * miktar), hata: "digerBileseniBulma" }, // kalan bileşeni bulmak
    { metin: olcu(bolme * miktar), hata: "tumKarisim" }, // bütün karışımı hesaplamak
    { metin: olcu(bilesenBolme), hata: "birimeCevirmemek" }, // bölme sayısını miktar sanmak
    { metin: olcu(p * miktar), hata: "payiBolmeSanma" }, // kesrin payını bölme sayısı sanmak
    { metin: olcu((bilesenBolme + 1) * miktar), hata: "birBolmeFazla" },
  ]);
  if (!secenekler) return undefined;
  return {
    cizim: { tip: "daire_kesir", daireler: [{ dilim: bolme, boyali: 0, renk: r.sec(DAIRE_RENKLERI) }] },
    cikarim: metinPlani({
      baglam:
        `${b.giris} Karışım kabı (diyagramı) şekildeki gibi eş bölmelere ayrılmıştır ve her bölmeye aynı miktarda ` +
        `malzeme konulmaktadır. Karışımın verilen kesri ${b.bilesen} olacaktır; bir bölmenin kaç ${b.birim} olduğu ` +
        `verilir. ${SAYI_YAZMA}`,
      konu: b.konu,
      ornekSoru: b.soru,
      veriler: [
        { ad: `karışımdaki ${b.bilesen} kesri`, deger: { pay: p, payda: q } },
        { ad: `bir bölmedeki malzeme (${b.birim})`, deger: { pay: miktar, payda: 1 } },
      ],
      anahtarIfadeler: [["eş bölme"], [b.bilesen.split(" ")[0]]],
      kokIfadeleri: [[`kaç ${b.birim}`]],
      ipucu: `şekilde ${bolme} bölme; ${bolme} × ${ham(p, q)} = ${bilesenBolme} bölme ${b.bilesen}; ${bilesenBolme} × ${miktar} = ${olcu(bilesenBolme * miktar)}`,
      cozum:
        `Karışım kabı ${bolme} eş bölmedir. ${bolme} × ${ham(p, q)} = ${bilesenBolme} bölme ${b.bilesen} içindir. Her ` +
        `bölmede ${olcu(miktar)} olduğundan ${bilesenBolme} × ${miktar} = ${olcu(bilesenBolme * miktar)} ${b.bilesen} kullanılmıştır.`,
      secenekler,
    }),
  };
}

// ---------------------------------------------------------------------------
// Kalanı paylaştırma
// ---------------------------------------------------------------------------

interface PaylasimBaglami {
  konu: string;
  /** "dolu gösterilen dilimler …" cümlesiyle biten tanıtım. */
  giris: string;
  paylasim: string;
  alici: string;
  soru: string;
  butun: string;
}

const PAYLASIM_BAGLAMLARI: readonly PaylasimBaglami[] = [
  {
    konu: "kutlama",
    giris: "Bir pasta şekildeki gibi eş dilimlere bölünmüştür; şekilde dolu gösterilen dilimler yenmiştir.",
    paylasim: "Kalan pasta, verilen sayıda misafire eşit olarak paylaştırılacaktır.",
    alici: "misafir",
    soru: "Buna göre misafirlerden her birine bütün pastanın kaçta kaçı düşer?",
    butun: "pasta",
  },
  {
    konu: "şarküteri",
    giris: "Bir şarküteride tekerlek peynir şekildeki gibi eş dilimlere ayrılmıştır; şekilde dolu gösterilen dilimler satılmıştır.",
    paylasim: "Kalan peynir, verilen sayıda pakete eşit olarak bölünecektir.",
    alici: "paket",
    soru: "Buna göre her pakete bütün peynirin kaçta kaçı konur?",
    butun: "peynir",
  },
  {
    konu: "tarım",
    giris: "Dairesel bir sulama alanı şekildeki gibi eş dilimlere ayrılmıştır; şekilde dolu gösterilen dilimler hasat edilmiştir.",
    paylasim: "Hasat edilmeyen kısım, verilen sayıda işçiye eşit olarak paylaştırılacaktır.",
    alici: "işçi",
    soru: "Buna göre her işçiye bütün alanın kaçta kaçı düşer?",
    butun: "alan",
  },
];

/** TYMM: "kalan kısım kaçta kaçı" tek adımlıdır; kalan, alıcılara paylaştırılır (kesir ÷ doğal sayı, 6. sınıf). */
function kalanPaylasim(r: Rastgele): Uretim {
  const b = r.sec(PAYLASIM_BAGLAMLARI);
  const dilim = r.sec([6, 8, 10, 12]);
  const dolu = r.aralik(2, dilim - 2);
  const kalan = dilim - dolu;
  const kisi = r.sec([2, 3, 4]);
  if (kalan % kisi === 0 && kalan / kisi === 1) return undefined;
  const cevap = o(kalan, dilim * kisi);
  const kesirSik = (oran: Oran) => (oran.pay > 0 && oran.pay < oran.payda ? [yaz(oran)] : []);
  const secenekler = siklar(r, yaz(cevap), [
    ...kesirSik(o(kalan, dilim)).map((metin) => ({ metin, hata: "bolmeyiUnutma" })), // kalanı paylaştırmayı unutmak
    ...kesirSik(o(kalan, dilim + kisi)).map((metin) => ({ metin, hata: "paydayaEkleme" })), // pay ve paydaya ekleme yanılgısı
    ...kesirSik(o(dolu, dilim * kisi)).map((metin) => ({ metin, hata: "doluyuPaylastirma" })),
    ...kesirSik(o(kalan * kisi, dilim)).map((metin) => ({ metin, hata: "carpma" })),
    ...kesirSik(o(kalan, kisi * dolu)).map((metin) => ({ metin, hata: "kalanaOran" })), // parçanın kalana oranı
  ]);
  if (!secenekler) return undefined;
  return {
    cizim: { tip: "daire_kesir", daireler: [{ dilim, boyali: dolu, renk: r.sec(DAIRE_RENKLERI) }] },
    cikarim: metinPlani({
      baglam: `${b.giris} ${b.paylasim} ${SAYI_YAZMA}`,
      konu: b.konu,
      ornekSoru: b.soru,
      veriler: [{ ad: `${b.alici} sayısı`, deger: { pay: kisi, payda: 1 } }],
      anahtarIfadeler: [["eş dilim"], ["dolu", "boyalı"], [b.alici]],
      kokIfadeleri: [["kaçta kaçı"]],
      ipucu: `şekilde ${dilim} dilim, ${dolu} dolu; kalan ${ham(kalan, dilim)}; ${ham(kalan, dilim)} ÷ ${kisi} = ${yaz(cevap)}`,
      cozum:
        `Bütün ${dilim} eş dilimdir ve ${dolu} dilimi doludur; kalan ${ham(kalan, dilim)}. Bu kısım ${kisi} ${b.alici} için ` +
        `eşit bölününce her birine ${ham(kalan, dilim)} ÷ ${kisi} = ${ham(kalan, dilim * kisi)}` +
        `${cevap.payda === dilim * kisi ? "" : ` = ${yaz(cevap)}`} ${b.butun} düşer.`,
      secenekler,
    }),
  };
}

// ---------------------------------------------------------------------------
// İki daireyi karşılaştırma / toplama
// ---------------------------------------------------------------------------

interface IkiDaireBaglami {
  konu: string;
  giris: (ad1: string, ad2: string) => string;
  anahtar: string[];
  farkSorusu: string;
  toplamSorusu: string;
  esit: string;
  /** Çözümde birim: "pizza", "depo", "tam şarj". */
  butun: string;
}

const IKI_DAIRE_BAGLAMLARI: readonly IkiDaireBaglami[] = [
  {
    konu: "pizza",
    giris: (a, b) => `Aynı büyüklükteki iki pizzadan ${a} ve ${b}, kendi pizzalarının şekilde dolu gösterilen dilimlerini yemiştir.`,
    anahtar: ["pizza"],
    farkSorusu: "Buna göre kim, diğerinden bir bütün pizzanın kaçta kaçı kadar fazla pizza yemiştir?",
    toplamSorusu: "Buna göre ikisinin yediği pizza, bir bütün pizzanın kaçta kaçıdır?",
    esit: "İkisi eşit miktarda yemiştir.",
    butun: "pizza",
  },
  {
    konu: "ulaşım",
    giris: (a, b) =>
      `${a} ve ${b}, aynı model araçlarının yakıt deposunu dairesel göstergelerden takip ediyor; göstergeler eş bölmelidir ` +
      "ve dolu bölmeler depodaki yakıtı gösterir.",
    anahtar: ["yakıt"],
    farkSorusu: "Buna göre kimin deposunda, diğerininkinden bir deponun kaçta kaçı kadar fazla yakıt vardır?",
    toplamSorusu: "Buna göre iki depodaki yakıtın toplamı, bir deponun kaçta kaçıdır?",
    esit: "İki depodaki yakıt eşittir.",
    butun: "depo",
  },
  {
    konu: "teknoloji",
    giris: (a, b) =>
      `${a} ve ${b}, aynı model telefonlarının şarj durumunu dairesel ve eş bölmeli göstergelerden izliyor; dolu bölmeler ` +
      "kalan şarjı gösterir.",
    anahtar: ["şarj"],
    farkSorusu: "Buna göre kimin telefonunda, diğerininkinden tam şarjın kaçta kaçı kadar fazla şarj vardır?",
    toplamSorusu: "Buna göre iki telefondaki şarjın toplamı, tam şarjın kaçta kaçıdır?",
    esit: "İki telefonun şarjı eşittir.",
    butun: "tam şarj",
  },
];

/** Paydalardan biri diğerinin katı (5. sınıfta paydaları eşitleme). */
const KAT_PAYDALAR: readonly [number, number][] = [[3, 6], [4, 8], [2, 6], [4, 12], [3, 12], [5, 10], [2, 8], [6, 12]];

function ikiPizzaKarsilastir(r: Rastgele): Uretim {
  const b = r.sec(IKI_DAIRE_BAGLAMLARI);
  const [d1, d2] = r.karistir([...r.sec(KAT_PAYDALAR)]);
  const a1 = r.aralik(1, d1 - 1);
  const a2 = r.aralik(1, d2 - 1);
  const f1 = o(a1, d1);
  const f2 = o(a2, d2);
  if (esitMi(f1, f2)) return undefined;
  const [ad1, ad2] = r.karistir(ISIMLER);
  const capraz = f1.pay * f2.payda - f2.pay * f1.payda;
  const [buyuk, kucuk] = capraz > 0 ? [ad1, ad2] : [ad2, ad1];
  const fark = oranYap({ pay: Math.abs(capraz), payda: f1.payda * f2.payda });
  // Çok bölmeli dairedeki dolu bölme sayısı fazla ise "daha çok bölme = daha çok" yanılgısı ters kişiyi seçtirir.
  const bolmeYanilgisi = a1 === a2 ? undefined : a1 > a2 ? ad1 : ad2;
  if (bolmeYanilgisi !== kucuk) return undefined;
  const paylarFarki = Math.abs(a1 - a2);
  const paydalarFarki = Math.abs(d1 - d2);
  const secenekler = siklar(r, `${buyuk}, ${yaz(fark)} fazla`, [
    { metin: `${kucuk}, ${yaz(fark)} fazla`, hata: "bolmeSayisiYanilgisi" }, // daha çok dolu bölmeyi daha çok sanmak
    ...(paylarFarki > 0 && paydalarFarki > 0
      ? [{ metin: `${buyuk}, ${ham(paylarFarki, paydalarFarki)} fazla`, hata: "payVePaydaAyriCikarma" }]
      : []),
    { metin: `${buyuk}, ${yaz(o(paylarFarki || 1, Math.max(d1, d2)))} fazla`, hata: "paydaEsitlemeden" },
    { metin: b.esit, hata: "esitSanma" },
  ]);
  if (!secenekler) return undefined;
  const daireler: DaireCizimi[] = [
    { dilim: d1, boyali: a1, renk: "turuncu", ad: ad1 },
    { dilim: d2, boyali: a2, renk: "mavi", ad: ad2 },
  ];
  return {
    cizim: { tip: "daire_kesir", daireler },
    cikarim: metinPlani({
      baglam: `${b.giris(ad1, ad2)} ${SAYI_YAZMA}`,
      konu: b.konu,
      ornekSoru: b.farkSorusu,
      adlar: [ad1, ad2],
      anahtarIfadeler: [b.anahtar],
      kokIfadeleri: [["fazla"]],
      ipucu: `${ad1} ${ham(a1, d1)}, ${ad2} ${ham(a2, d2)}; paydalar eşitlenir; ${buyuk} ${yaz(fark)} fazla`,
      cozum:
        `${ad1} için ${ham(a1, d1)}, ${ad2} için ${ham(a2, d2)} ${b.butun}. Paydalar eşitlenince ${buyuk} için ` +
        `${yaz(fark)} ${b.butun} fazla olduğu görülür.`,
      secenekler,
    }),
  };
}

function toplamIkiPizza(r: Rastgele): Uretim {
  const b = r.sec(IKI_DAIRE_BAGLAMLARI);
  const d = r.sec([6, 8, 10, 12]);
  const x = r.aralik(1, d - 2);
  const y = r.aralik(1, d - x - 1);
  if (x === y || ebob(x + y, d) === 1) return undefined;
  const cevap = o(x + y, d);
  const [ad1, ad2] = r.karistir(ISIMLER);
  const secenekler = siklar(r, yaz(cevap), [
    { metin: yaz(o(x + y, 2 * d)), hata: "paydalariToplama" }, // pay ve paydaları ayrı ayrı toplamak
    { metin: yaz(o(d - x - y, d)), hata: "kalaniBulma" },
    { metin: yaz(o(Math.abs(x - y), d)), hata: "farkAlma" },
    { metin: yaz(o(x + y - 1, d)), hata: "birEksik" },
  ]);
  if (!secenekler) return undefined;
  return {
    cizim: {
      tip: "daire_kesir",
      daireler: [
        { dilim: d, boyali: x, renk: "yesil", ad: ad1 },
        { dilim: d, boyali: y, renk: "mor", ad: ad2 },
      ],
    },
    cikarim: metinPlani({
      baglam: `${b.giris(ad1, ad2)} ${SAYI_YAZMA}`,
      konu: b.konu,
      ornekSoru: b.toplamSorusu,
      adlar: [ad1, ad2],
      anahtarIfadeler: [b.anahtar],
      kokIfadeleri: [["kaçta kaçı"]],
      ipucu: `${ham(x, d)} + ${ham(y, d)} = ${ham(x + y, d)} = ${yaz(cevap)}`,
      cozum:
        `${ad1} için ${ham(x, d)}, ${ad2} için ${ham(y, d)} ${b.butun}. ${ham(x, d)} + ${ham(y, d)} = ${ham(x + y, d)} = ` +
        `${yaz(cevap)} ${b.butun}.`,
      secenekler,
    }),
  };
}

// ---------------------------------------------------------------------------
// Denk olmayan kesir (bağlam: bir oranı farklı kesirlerle ifade eden kişiler)
// ---------------------------------------------------------------------------

interface DenklikBaglami {
  konu: string;
  giris: string;
  anahtar: string[];
  soru: string;
  /** Çözümde dolu kısmın adı: "yenen kısım", "spor kulübünü seçenler". */
  dolu: string;
}

const DENKLIK_DAIRE_BAGLAMLARI: readonly DenklikBaglami[] = [
  {
    konu: "eğitim",
    giris:
      "Bir okulda yapılan anketin sonuçları şekildeki eş dilimli daire grafiğinde gösterilmiştir; dolu dilimler spor " +
      "kulübünü seçen öğrencileri gösterir. Dört öğrenci bu oranı farklı kesirlerle ifade etmiştir.",
    anahtar: ["anket"],
    soru: "Buna göre aşağıdaki kesirlerden hangisi spor kulübünü seçenlerin oranına denk değildir?",
    dolu: "Spor kulübünü seçenlerin oranı",
  },
  {
    konu: "teknoloji",
    giris:
      "Bir drone'un batarya göstergesi şekildeki gibi eş dilimli bir dairedir; dolu dilimler kalan şarjı gösterir. Dört " +
      "teknisyen kalan şarjı farklı kesirlerle not almıştır.",
    anahtar: ["batarya", "şarj"],
    soru: "Buna göre aşağıdaki kesirlerden hangisi kalan şarja denk değildir?",
    dolu: "Kalan şarj",
  },
  {
    konu: "pizza",
    giris:
      "Bir pizza şekildeki gibi eş dilimlere bölünmüştür; şekilde dolu gösterilen dilimler yenmiştir. Dört arkadaş yenen " +
      "kısmı farklı kesirlerle ifade etmiştir.",
    anahtar: ["pizza"],
    soru: "Buna göre aşağıdaki kesirlerden hangisi yenen kısma denk değildir?",
    dolu: "Yenen kısım",
  },
];

function denklikDegil(r: Rastgele): Uretim {
  const b = r.sec(DENKLIK_DAIRE_BAGLAMLARI);
  const dilim = r.sec([6, 8, 10, 12]);
  const boyali = r.aralik(2, dilim - 1);
  const sade = o(boyali, dilim);
  // Dolu kesir sadeleşebilmeli; denkler: sade hâl ve iki genişletme.
  if (sade.payda === dilim) return undefined;
  const denkler = [ham(sade.pay, sade.payda), ham(sade.pay * 3, sade.payda * 3), ham(boyali * 2, dilim * 2)];
  if (new Set([...denkler, ham(boyali, dilim)]).size !== 4) return undefined;
  // Doğru cevap yanılgı sonucudur: pay ve paydaya aynı sayıyı eklemek ya da yalnızca paydayı değiştirmek.
  const yanlis = [ham(boyali + 1, dilim + 1), ham(boyali, dilim + 2), ham(boyali + 2, dilim)].find((metin) => {
    const [p, q] = metin.split("/").map(Number);
    return p < q && !esitMi(o(p, q), sade);
  });
  if (!yanlis) return undefined;
  const secenekler = r.karistir([{ metin: yanlis }, ...denkler.map((metin) => ({ metin, hata: "denkKesir" }))]);
  return {
    cizim: { tip: "daire_kesir", daireler: [{ dilim, boyali, renk: r.sec(DAIRE_RENKLERI) }] },
    cikarim: metinPlani({
      baglam: `${b.giris} ${SAYI_YAZMA}`,
      konu: b.konu,
      ornekSoru: b.soru,
      anahtarIfadeler: [["eş dilim"], b.anahtar],
      kokIfadeleri: [["denk olmayan", "denk değil"]],
      ipucu: `dolu ${ham(boyali, dilim)} = ${yaz(sade)}; ${denkler.join(", ")} denk; ${yanlis} denk değil`,
      cozum:
        `${b.dolu}: ${ham(boyali, dilim)} = ${yaz(sade)}. ${denkler.join(", ")} bu kesre denktir; ` +
        `${yanlis} denk değildir (pay ve paydaya aynı sayıyı eklemek ya da yalnızca birini değiştirmek denk kesir vermez).`,
      secenekler,
    }),
  };
}

const URETICILER: Record<DaireKesirGorevi, (r: Rastgele) => Uretim> = {
  boyaKarisimi,
  kalanPaylasim,
  ikiPizzaKarsilastir,
  toplamIkiPizza,
  denklikDegil,
};

/** Deterministik: aynı tohum aynı planı verir; koşulları sağlamayan tohumlar atlanır. */
export function daireKesirPlaniUret(gorev: DaireKesirGorevi, tohum: number): PlanliGorselPlan<CizimPlaniOf<"daire_kesir">> {
  for (let deneme = 0; ; deneme += 1) {
    const plan = URETICILER[gorev](rastgeleOlustur(tohum + deneme * 1013));
    if (plan) return plan;
  }
}

// ---------------------------------------------------------------------------
// Tanım
// ---------------------------------------------------------------------------

function gorevTanimi(
  gorev: DaireKesirGorevi,
  tanim: Pick<GorselSoruGorevTanimi<"daire_kesir">, "etiket" | "aciklama" | "kurallar" | "ornekCikarim" | "ornekCizim" | "enAzSinif"> & {
    ornek: { senaryo: string; soru: string };
  }
): GorselSoruGorevTanimi<"daire_kesir"> {
  return {
    ...tanim,
    gorev,
    kesirKonusuGerekir: true,
    semaAciklamasi: PLANLI_GORSEL_SEMA_ACIKLAMASI,
    ornek: { tip: "daire_kesir", veri: { gorev, ...tanim.ornek } },
    jsonSemasi: planliGorselSema(gorev),
  };
}

const PIZZA_BAGLAMI = "Dilim sayılarını ve kesirleri metne YAZMA: öğrenci şekilden okur.";

const gorevler: GorselSoruTanimi<"daire_kesir">["gorevler"] = {
  boyaKarisimi: gorevTanimi("boyaKarisimi", {
    etiket: "Karışım oranı: kaç litre?",
    aciklama:
      "Daire eş bölmelere ayrılmış bir karışım diyagramıdır. Öğrenci bölme sayısını şekilden sayar, verilen kesirle " +
      "beyaz boyanın kaç bölme olduğunu bulur ve bölme başına düşen miktarla litreye çevirir. Diğer boyayı ya da bütün " +
      "karışımı hesaplamak ve litreye çevirmeyi unutmak tipik hatalardır.",
    kurallar: ["Bölme sayısını metne yazma; yalnızca beyaz boyanın kesrini ve bir bölmedeki litreyi yaz."],
    ornek: {
      senaryo:
        "Bir boyacı açık mavi boya elde etmek için karışım hazırlıyor. Karışım kabı şekildeki gibi eş bölmelere " +
        "ayrılmıştır ve her bölmeye 2 litre boya konulmaktadır. Karışımın 3/4'ü beyaz boyadır.",
      soru: "Buna göre karışımda kaç litre beyaz boya kullanılmıştır?",
    },
    ornekCizim: { tip: "daire_kesir", daireler: [{ dilim: 12, boyali: 0, renk: "mavi" }] },
    ornekCikarim: metinPlani({
      baglam: "Boyacı, eş bölmelere ayrılmış karışım kabının verilen kesri kadarını beyaz boyayla doldurur.",
      konu: "boya",
      ornekSoru: "Buna göre karışımda kaç litre beyaz boya kullanılmıştır?",
      veriler: [
        { ad: "karışımdaki beyaz boyanın kesri", deger: { pay: 3, payda: 4 } },
        { ad: "bir bölmedeki boya (litre)", deger: { pay: 2, payda: 1 } },
      ],
      anahtarIfadeler: [["eş bölme"], ["beyaz"]],
      kokIfadeleri: [["kaç litre"]],
      ipucu: "şekilde 12 bölme; 12 × 3/4 = 9 bölme beyaz; 9 × 2 = 18 litre",
      cozum: "Karışım kabı 12 eş bölmedir. 12 × 3/4 = 9 bölme beyaz boyadır. Her bölmede 2 litre olduğundan 9 × 2 = 18 litre beyaz boya kullanılmıştır.",
      secenekler: [
        { metin: "6 litre", hata: "digerBoyayiBulma" },
        { metin: "18 litre" },
        { metin: "24 litre", hata: "tumKarisim" },
        { metin: "9 litre", hata: "litreyeCevirmemek" },
      ],
    }),
  }),
  kalanPaylasim: gorevTanimi("kalanPaylasim", {
    etiket: "Kalan pastayı paylaştırma (kesir ÷ doğal sayı)",
    aciklama:
      "Öğrenci şekilden toplam ve dolu dilimleri sayıp kalan kısmı kesirle yazar, sonra bunu misafir sayısına bölerek " +
      "her misafire bütün pastanın kaçta kaçının düştüğünü bulur. Kalanı paylaştırmayı unutmak ya da kişi sayısını " +
      "paydaya eklemek tipik hatalardır.",
    enAzSinif: 6,
    kurallar: ["Dilim sayılarını metne yazma; yalnızca misafir sayısını yaz."],
    ornek: {
      senaryo:
        "Bir pasta şekildeki gibi eş dilimlere bölünmüştür ve dolu gösterilen dilimler yenmiştir. Kalan pasta 3 misafire " +
        "eşit olarak paylaştırılacaktır.",
      soru: "Buna göre misafirlerden her birine bütün pastanın kaçta kaçı düşer?",
    },
    ornekCizim: { tip: "daire_kesir", daireler: [{ dilim: 8, boyali: 2, renk: "pembe" }] },
    ornekCikarim: metinPlani({
      baglam: "Pasta eş dilimlere bölünmüş, dolu dilimler yenmiştir; kalan pasta misafirlere paylaştırılır.",
      konu: "pasta",
      ornekSoru: "Buna göre misafirlerden her birine bütün pastanın kaçta kaçı düşer?",
      veriler: [{ ad: "misafir sayısı", deger: { pay: 3, payda: 1 } }],
      anahtarIfadeler: [["eş dilim"], ["dolu", "boyalı"], ["misafir"]],
      kokIfadeleri: [["kaçta kaçı"]],
      ipucu: "şekilde 8 dilim, 2 dolu; kalan 6/8; 6/8 ÷ 3 = 1/4",
      cozum:
        "Pasta 8 eş dilimdir ve 2 dilimi yenmiştir; kalan 6/8. Bu kısım 3 misafire eşit paylaştırılınca her birine " +
        "6/8 ÷ 3 = 6/24 = 1/4 pasta düşer.",
      secenekler: [
        { metin: "3/4", hata: "bolmeyiUnutma" },
        { metin: "1/4" },
        { metin: "6/11", hata: "paydayaEkleme" },
        { metin: "1/12", hata: "yeneniPaylastirma" },
      ],
    }),
  }),
  ikiPizzaKarsilastir: gorevTanimi("ikiPizzaKarsilastir", {
    etiket: "İki pizzayı karşılaştırma (paydaları eşitleme)",
    aciklama:
      "Farklı sayıda dilime bölünmüş aynı büyüklükteki iki pizzadan yenen kısımlar şekilden okunur; öğrenci paydaları " +
      "eşitleyerek kimin ne kadar fazla yediğini bulur. Daha çok dolu dilimi daha çok pizza sanmak tipik hatadır.",
    kurallar: ["Kesirleri ve dilim sayılarını metne yazma; kişi adlarını planda verildiği gibi kullan."],
    ornek: {
      senaryo: "Aynı büyüklükteki iki pizzadan Ali ve Ece, kendi pizzalarının şekilde dolu gösterilen dilimlerini yemiştir.",
      soru: "Buna göre kim, diğerinden ne kadar fazla pizza yemiştir?",
    },
    ornekCizim: {
      tip: "daire_kesir",
      daireler: [
        { dilim: 4, boyali: 3, renk: "turuncu", ad: "Ali" },
        { dilim: 8, boyali: 5, renk: "mavi", ad: "Ece" },
      ],
    },
    ornekCikarim: metinPlani({
      baglam: `Aynı büyüklükteki iki pizzadan Ali ve Ece, kendi pizzalarının şekilde dolu gösterilen dilimlerini yemiştir. ${PIZZA_BAGLAMI}`,
      konu: "pizza",
      ornekSoru: "Buna göre kim, diğerinden ne kadar fazla pizza yemiştir?",
      adlar: ["Ali", "Ece"],
      anahtarIfadeler: [["aynı büyüklükte", "eşit büyüklükte", "eş büyüklükte"]],
      kokIfadeleri: [["fazla"]],
      ipucu: "Ali 3/4, Ece 5/8; paydalar eşitlenir; Ali 1/8 fazla",
      cozum: "Ali 3/4, Ece 5/8 pizza yemiştir. Paydalar eşitlenince Ali, Ece'den 1/8 pizza fazla yemiştir.",
      secenekler: [
        { metin: "Ece, 1/8 fazla", hata: "dilimSayisiYanilgisi" },
        { metin: "Ali, 1/8 fazla" },
        { metin: "Ali, 2/4 fazla", hata: "payVePaydaAyriCikarma" },
        { metin: "İkisi eşit miktarda yemiştir.", hata: "esitSanma" },
      ],
    }),
  }),
  toplamIkiPizza: gorevTanimi("toplamIkiPizza", {
    etiket: "İki pizzayı toplama (sadeleştirme)",
    aciklama: "Aynı sayıda dilime bölünmüş iki pizzadan yenen kısımlar şekilden okunur, toplanır ve sadeleştirilir.",
    kurallar: ["Kesirleri ve dilim sayılarını metne yazma; kişi adlarını planda verildiği gibi kullan."],
    ornek: {
      senaryo:
        "Aynı büyüklükteki iki pizzadan Can ve Zeynep, kendi pizzalarının şekilde dolu gösterilen dilimlerini yemiştir.",
      soru: "Buna göre ikisinin yediği pizza, bir bütün pizzanın kaçta kaçıdır?",
    },
    ornekCizim: {
      tip: "daire_kesir",
      daireler: [
        { dilim: 8, boyali: 5, renk: "yesil", ad: "Can" },
        { dilim: 8, boyali: 1, renk: "mor", ad: "Zeynep" },
      ],
    },
    ornekCikarim: metinPlani({
      baglam: `Aynı büyüklükteki iki pizzadan Can ve Zeynep, kendi pizzalarının şekilde dolu gösterilen dilimlerini yemiştir. ${PIZZA_BAGLAMI}`,
      konu: "pizza",
      ornekSoru: "Buna göre ikisinin yediği pizza, bir bütün pizzanın kaçta kaçıdır?",
      adlar: ["Can", "Zeynep"],
      anahtarIfadeler: [["aynı büyüklükte", "eşit büyüklükte", "eş büyüklükte"]],
      kokIfadeleri: [["kaçta kaçı"]],
      ipucu: "5/8 + 1/8 = 6/8 = 3/4",
      cozum: "Can 5/8, Zeynep 1/8 pizza yemiştir. 5/8 + 1/8 = 6/8 = 3/4.",
      secenekler: [
        { metin: "3/8", hata: "paydalariToplama" },
        { metin: "3/4" },
        { metin: "1/4", hata: "kalaniBulma" },
        { metin: "1/2", hata: "farkAlma" },
      ],
    }),
  }),
  denklikDegil: gorevTanimi("denklikDegil", {
    etiket: "Denk olmayan kesir",
    aciklama:
      "Yenen kısım şekilden okunur; öğrenci bu kesri sadeleştirip genişleterek şıklardan denk OLMAYANI bulur. Pay ve " +
      "paydaya aynı sayıyı eklemenin denk kesir verdiğini sanmak tipik hatadır.",
    kurallar: ["Kesri ve dilim sayılarını metne yazma."],
    ornek: {
      senaryo: "Bir pizza şekildeki gibi eş dilimlere bölünmüştür. Şekilde dolu gösterilen dilimler yenmiştir.",
      soru: "Buna göre yenen kısmı gösteren kesre denk olmayan kesir hangisidir?",
    },
    ornekCizim: { tip: "daire_kesir", daireler: [{ dilim: 8, boyali: 6, renk: "turuncu" }] },
    ornekCikarim: metinPlani({
      baglam: `Bir pizza şekildeki gibi eş dilimlere bölünmüştür; şekilde dolu gösterilen dilimler yenmiştir. ${PIZZA_BAGLAMI}`,
      konu: "pizza",
      ornekSoru: "Buna göre yenen kısmı gösteren kesre denk olmayan kesir hangisidir?",
      anahtarIfadeler: [["eş dilim"], ["dolu", "boyalı"]],
      kokIfadeleri: [["denk olmayan", "denk değil"]],
      ipucu: "yenen 6/8 = 3/4; 3/4, 9/12, 12/16 denk; 7/9 denk değil",
      cozum: "Yenen kısım 6/8 = 3/4 pizzadır. 3/4, 9/12, 12/16 bu kesre denktir; 7/9 denk değildir.",
      secenekler: [
        { metin: "3/4", hata: "denkKesir" },
        { metin: "9/12", hata: "denkKesir" },
        { metin: "7/9" },
        { metin: "12/16", hata: "denkKesir" },
      ],
    }),
  }),
};

export const daireKesirTanimi: GorselSoruTanimi<"daire_kesir"> = {
  tip: "daire_kesir",
  etiket: "Daire (pizza) modeli",
  aciklama:
    "Eş dilimlere bölünmüş daireler (pizza, pasta). Sistem daireleri plandaki dilim/dolu dilim sayılarından çizer ve " +
    "doğru cevabı kendisi hesaplar; öğrenci bilgiyi şekilden okuyup çok adımlı bir işlem yapar.",
  gorselKategorisi: "fonksiyonel",
  gorselStratejisi: "svg",
  kesirKonusuGerekir: true,
  kurallar: [
    "Bağlam paylaşma / bir bütünün parçaları üzerinedir (pizza, pasta). Dilim ve dolu dilim sayıları ŞEKİLDE görünür; " +
      "bunları metne yazma (sistem metindeki plan dışı sayıları reddeder).",
    "Metin 1-3 kısa cümle olsun: kimin, hangi pizzadan/pastadan yediği ve \"şekilde dolu gösterilen dilimler\" bilgisi.",
  ],
  ortakSemaAciklamasi: [],
  gorevler,
  dogrula: (raw, path, sorunlar, plan) =>
    planliGorselDogrula(
      raw,
      path,
      sorunlar,
      plan,
      { gorevler: DAIRE_KESIR_GOREVLERI, cizimTipi: "daire_kesir", serbestSayilar: (cizim) => [cizim.daireler.length] },
      (ortak, cizim): DaireKesirVerisi => ({ ...ortak, daireler: cizim.daireler })
    ),
  dogruCevapMetni: planliDogruCevapMetni,
};
