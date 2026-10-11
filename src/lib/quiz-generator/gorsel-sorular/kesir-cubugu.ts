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
  KESIR_CUBUGU_GOREVLERI,
  type CubukCizimi,
  type KesirCubuguGorevi,
  type KesirCubuguVerisi,
} from "@/types/gorsel-soru";

/**
 * kesir_cubugu — şerit (bar) modeli; references/gorsel-tip-haritasi.md, Tip 2.
 * Desen daire_kesir ile aynıdır: şeritleri ve doğru cevabı KOD kurar, parça
 * ve taralı parça sayıları metne yazılmaz (öğrenci şekilden okur), soru
 * bunun üstüne dönüşüm, payda eşitleme ve toplama/çıkarma ister.
 */

type Uretim = GenelUretim<CizimPlaniOf<"kesir_cubugu">>;

const o = (pay: number, payda = 1): Oran => oranYap({ pay, payda });
const yaz = (oran: Oran) => oranMetni(oran);

/** Paydalardan biri diğerinin katı (5. sınıfta paydaları eşitleme). */
const KAT_PAYDALAR: readonly [number, number][] = [[2, 4], [3, 6], [4, 8], [2, 6], [5, 10], [3, 9], [4, 12], [2, 8]];

function okek(a: number, b: number): number {
  return (a * b) / ebob(a, b);
}

const SAYI_YAZMA = "Şerit, parça ve taralı parça sayılarını ve kesirleri metne YAZMA: öğrenci şekilden okur.";

interface GosterimBaglami {
  konu: string;
  giris: string;
  anahtar: string[];
  soru: string;
  /** Bir şeridin karşılığı ("kek", "top kumaş", "panel sırası"). */
  birim: string;
}

const GOSTERIM_BAGLAMLARI: readonly GosterimBaglami[] = [
  {
    konu: "pastane",
    giris:
      "Bir pastanede eş uzunluktaki baton keklerin her biri şekildeki gibi eş dilimlere ayrılmıştır; taralı dilimler " +
      "satılmıştır. Dört çalışan satılan kek miktarını farklı biçimlerde yazmıştır.",
    anahtar: ["kek"],
    soru: "Buna göre aşağıdakilerden hangisi satılan kek miktarına eşit değildir?",
    birim: "kek",
  },
  {
    konu: "tekstil",
    giris:
      "Bir terzide eş uzunluktaki kumaş toplarının her biri şekildeki gibi eş parçalara ayrılmıştır; taralı parçalar " +
      "kesilmiştir. Çıraklar kesilen kumaş miktarını top cinsinden farklı biçimlerde yazmıştır.",
    anahtar: ["kumaş"],
    soru: "Buna göre aşağıdakilerden hangisi kesilen kumaş miktarına eşit değildir?",
    birim: "top kumaş",
  },
  {
    konu: "enerji",
    giris:
      "Bir binanın çatısındaki eş uzunluktaki güneş paneli sıraları şekildeki gibi eş modüllere ayrılmıştır; taralı " +
      "modüller temizlenmiştir. Görevliler temizlenen kısmı sıra cinsinden farklı biçimlerde yazmıştır.",
    anahtar: ["panel"],
    soru: "Buna göre aşağıdakilerden hangisi temizlenen kısma eşit değildir?",
    birim: "panel sırası",
  },
];

/** Bağlam: aynı miktarı farklı biçimlerde yazan kişilerden yanlış olanı bulmak (dönüşüm + eleme). */
function esitOlmayanGosterim(r: Rastgele): Uretim {
  const b = r.sec(GOSTERIM_BAGLAMLARI);
  const parca = r.sec([2, 3, 4, 5, 6, 8]);
  const tam = r.aralik(1, 3);
  const kalan = r.aralik(1, parca - 1);
  const pay = tam * parca + kalan;
  const deger = o(pay, parca);
  const esitler = [`${tam} ${kalan}/${parca}`, ham(pay, parca), ham(pay * 2, parca * 2)];
  // Doğru cevap (eşit OLMAYAN), yaygın bir dönüşüm hatasının sonucudur.
  const hatalar = r.karistir([
    { metin: `${tam + 1} ${kalan}/${parca}`, deger: o((tam + 1) * parca + kalan, parca) }, // şerit sayısını tam sanmak
    { metin: ham(tam + kalan, parca), deger: o(tam + kalan, parca) }, // tamı paya eklemek
    ...(tam < parca && tam !== kalan ? [{ metin: `${kalan} ${tam}/${parca}`, deger: o(kalan * parca + tam, parca) }] : []), // tam ile payı karıştırmak
  ]);
  const yanlis = hatalar.find((hata) => !esitMi(hata.deger, deger) && !esitler.includes(hata.metin));
  if (!yanlis || new Set(esitler).size !== 3) return undefined;
  const cubuklar: CubukCizimi[] = [
    ...Array.from({ length: tam }, () => ({ parca, tarali: parca })),
    { parca, tarali: kalan },
  ];
  return {
    cizim: { tip: "kesir_cubugu", cubuklar },
    cikarim: metinPlani({
      baglam: `${b.giris} ${SAYI_YAZMA}`,
      konu: b.konu,
      ornekSoru: b.soru,
      anahtarIfadeler: [b.anahtar, ["tara"]],
      kokIfadeleri: [["eşit olmayan", "eşit değil"]],
      ipucu: `${tam} tam + ${ham(kalan, parca)} = ${esitler.join(" = ")}; ${yanlis.metin} eşit değil`,
      cozum:
        `Taralı bölge ${tam} tam ${b.birim} ve ${ham(kalan, parca)} ${b.birim} eder: ${esitler.join(" = ")}. ` +
        `${yanlis.metin} bu miktara eşit değildir.`,
      secenekler: r.karistir([{ metin: yanlis.metin }, ...esitler.map((metin) => ({ metin, hata: "esitGosterim" }))]),
    }),
  };
}

function ikiSerit(r: Rastgele): { a: CubukCizimi; b: CubukCizimi; f1: Oran; f2: Oran; ortak: number } | undefined {
  const [p1, p2] = r.karistir([...r.sec(KAT_PAYDALAR)]);
  const t1 = r.aralik(1, p1 - 1);
  const t2 = r.aralik(1, p2 - 1);
  const f1 = o(t1, p1);
  const f2 = o(t2, p2);
  if (esitMi(f1, f2)) return undefined;
  const [ad1, ad2] = r.karistir(ISIMLER);
  return {
    a: { parca: p1, tarali: t1, ad: ad1 },
    b: { parca: p2, tarali: t2, ad: ad2 },
    f1,
    f2,
    ortak: okek(p1, p2),
  };
}

interface IkiSeritBaglami {
  konu: string;
  giris: (ad1: string, ad2: string) => string;
  anahtar: string[];
  farkSorusu: string;
  toplamSorusu: string;
  /** Bir şeridin karşılığı ("dosya", "parkur", "depo", "kitap"). */
  butun: string;
}

const IKI_SERIT_BAGLAMLARI: readonly IkiSeritBaglami[] = [
  {
    konu: "teknoloji",
    giris: (a, b) =>
      `${a} ve ${b} aynı büyüklükteki iki dosyayı indiriyor; şekildeki ilerleme çubukları eş parçalıdır ve taralı ` +
      "parçalar dosyanın inen kısmını gösterir.",
    anahtar: ["indir", "ilerleme"],
    farkSorusu: "Buna göre iki dosyanın inen kısımları arasındaki fark, bir dosyanın kaçta kaçıdır?",
    toplamSorusu: "Buna göre iki dosyanın inen kısımlarının toplamı kaç dosyaya eşittir?",
    butun: "dosya",
  },
  {
    konu: "spor",
    giris: (a, b) =>
      `${a} ve ${b} aynı uzunluktaki bir koşu parkurunda antrenman yapıyor; şekildeki çubuklar parkuru eş parçalara ` +
      "ayırır ve taralı parçalar koşulan kısmı gösterir.",
    anahtar: ["parkur"],
    farkSorusu: "Buna göre ikisinin koştuğu mesafeler arasındaki fark, parkurun kaçta kaçıdır?",
    toplamSorusu: "Buna göre ikisinin koştuğu mesafelerin toplamı kaç parkur eder?",
    butun: "parkur",
  },
  {
    konu: "su",
    giris: (a, b) =>
      `${a} ve ${b} aynı büyüklükteki iki su deposunu dolduruyor; şekildeki eş bölmeli göstergelerde taralı bölmeler ` +
      "depodaki suyu gösterir.",
    anahtar: ["depo"],
    farkSorusu: "Buna göre iki depodaki su arasındaki fark, bir deponun kaçta kaçıdır?",
    toplamSorusu: "Buna göre iki depodaki suyun toplamı kaç depoya eşittir?",
    butun: "depo",
  },
  {
    konu: "kitap",
    giris: (a, b) =>
      `${a} ve ${b} aynı kitabı okuyor; şekildeki ilerleme çubukları kitabı eş bölümlere ayırır ve taralı bölümler ` +
      "okunan kısmı gösterir.",
    anahtar: ["kitab"],
    farkSorusu: "Buna göre ikisinin okuduğu kısımlar arasındaki fark, kitabın kaçta kaçıdır?",
    toplamSorusu: "Buna göre ikisinin okuduğu kısımların toplamı kaç kitaba eşittir?",
    butun: "kitap",
  },
];

function seritFarki(r: Rastgele): Uretim {
  const bg = r.sec(IKI_SERIT_BAGLAMLARI);
  const iki = ikiSerit(r);
  if (!iki) return undefined;
  const { a, b, f1, f2, ortak } = iki;
  const fark = o(Math.abs(f1.pay * f2.payda - f2.pay * f1.payda), f1.payda * f2.payda);
  const paylarFarki = Math.abs(a.tarali - b.tarali);
  const paydalarFarki = Math.abs(a.parca - b.parca);
  const secenekler = siklar(r, yaz(fark), [
    ...(paylarFarki > 0 && paylarFarki < paydalarFarki
      ? [{ metin: ham(paylarFarki, paydalarFarki), hata: "payVePaydaAyriCikarma" }]
      : []),
    ...(paylarFarki > 0 ? [{ metin: yaz(o(paylarFarki, Math.max(a.parca, b.parca))), hata: "paydaEsitlemeden" }] : []),
    { metin: yaz(o(f1.pay * f2.payda + f2.pay * f1.payda, f1.payda * f2.payda)), hata: "toplama" },
    { metin: yaz(o(fark.pay * (ortak / fark.payda) + 1, ortak)), hata: "birParcaFazla" },
  ]);
  if (!secenekler) return undefined;
  const isim1 = a.ad ?? "";
  const isim2 = b.ad ?? "";
  return {
    cizim: { tip: "kesir_cubugu", cubuklar: [a, b] },
    cikarim: metinPlani({
      baglam: `${bg.giris(isim1, isim2)} ${SAYI_YAZMA}`,
      konu: bg.konu,
      ornekSoru: bg.farkSorusu,
      adlar: [isim1, isim2],
      anahtarIfadeler: [bg.anahtar],
      kokIfadeleri: [["fark"], ["kaçta kaçı"]],
      ipucu: `${isim1} ${ham(a.tarali, a.parca)}, ${isim2} ${ham(b.tarali, b.parca)}; paydalar ${ortak}'de eşitlenir; fark ${yaz(fark)}`,
      cozum:
        `${isim1} için ${ham(a.tarali, a.parca)}, ${isim2} için ${ham(b.tarali, b.parca)} ${bg.butun}. ` +
        `Paydalar eşitlenip çıkarılınca fark ${yaz(fark)} ${bg.butun} olur.`,
      secenekler,
    }),
  };
}

function seritToplami(r: Rastgele): Uretim {
  const bg = r.sec(IKI_SERIT_BAGLAMLARI);
  const iki = ikiSerit(r);
  if (!iki) return undefined;
  const { a, b, f1, f2, ortak } = iki;
  const toplam = o(f1.pay * f2.payda + f2.pay * f1.payda, f1.payda * f2.payda);
  const secenekler = siklar(r, yaz(toplam), [
    { metin: yaz(o(a.tarali + b.tarali, a.parca + b.parca)), hata: "paydalariToplama" }, // pay ve paydaları ayrı ayrı toplamak
    { metin: yaz(o(a.tarali + b.tarali, Math.max(a.parca, b.parca))), hata: "paydaEsitlemeden" },
    { metin: yaz(o(Math.abs(f1.pay * f2.payda - f2.pay * f1.payda), f1.payda * f2.payda)), hata: "farkAlma" },
    { metin: yaz(o(toplam.pay * (ortak / toplam.payda) - 1, ortak)), hata: "birParcaEksik" },
  ]);
  if (!secenekler) return undefined;
  const isim1 = a.ad ?? "";
  const isim2 = b.ad ?? "";
  return {
    cizim: { tip: "kesir_cubugu", cubuklar: [a, b] },
    cikarim: metinPlani({
      baglam: `${bg.giris(isim1, isim2)} ${SAYI_YAZMA}`,
      konu: bg.konu,
      ornekSoru: bg.toplamSorusu,
      adlar: [isim1, isim2],
      anahtarIfadeler: [bg.anahtar],
      kokIfadeleri: [["toplam"]],
      ipucu: `${ham(a.tarali, a.parca)} + ${ham(b.tarali, b.parca)}; paydalar ${ortak}'de eşitlenir; toplam ${yaz(toplam)}`,
      cozum:
        `${isim1} için ${ham(a.tarali, a.parca)}, ${isim2} için ${ham(b.tarali, b.parca)} ${bg.butun}. ` +
        `Paydalar eşitlenip toplanınca ${yaz(toplam)} ${bg.butun} eder.`,
      secenekler,
    }),
  };
}

const IKI_SERIT_BAGLAMI = (ad1: string, ad2: string) =>
  `Aynı uzunluktaki iki şeritten ${ad1} ve ${ad2}, kendi şeritlerinin şekilde taralı gösterilen parçalarını boyamıştır. ${SAYI_YAZMA}`;

const URETICILER: Record<KesirCubuguGorevi, (r: Rastgele) => Uretim> = {
  esitOlmayanGosterim,
  seritFarki,
  seritToplami,
};

/** Deterministik: aynı tohum aynı planı verir; koşulları sağlamayan tohumlar atlanır. */
export function kesirCubuguPlaniUret(gorev: KesirCubuguGorevi, tohum: number): PlanliGorselPlan<CizimPlaniOf<"kesir_cubugu">> {
  for (let deneme = 0; ; deneme += 1) {
    const plan = URETICILER[gorev](rastgeleOlustur(tohum + deneme * 1013));
    if (plan) return plan;
  }
}

// ---------------------------------------------------------------------------
// Tanım
// ---------------------------------------------------------------------------

function gorevTanimi(
  gorev: KesirCubuguGorevi,
  tanim: Pick<GorselSoruGorevTanimi<"kesir_cubugu">, "etiket" | "aciklama" | "kurallar" | "ornekCikarim" | "ornekCizim"> & {
    ornek: { senaryo: string; soru: string };
  }
): GorselSoruGorevTanimi<"kesir_cubugu"> {
  return {
    ...tanim,
    gorev,
    kesirKonusuGerekir: true,
    semaAciklamasi: PLANLI_GORSEL_SEMA_ACIKLAMASI,
    ornek: { tip: "kesir_cubugu", veri: { gorev, ...tanim.ornek } },
    jsonSemasi: planliGorselSema(gorev),
  };
}

const gorevler: GorselSoruTanimi<"kesir_cubugu">["gorevler"] = {
  esitOlmayanGosterim: gorevTanimi("esitOlmayanGosterim", {
    etiket: "Taralı bölgeye eşit OLMAYAN gösterim",
    aciklama:
      "Birkaç tam taralı şerit ve bir kısmı taralı bir şerit gösterilir; öğrenci taralı bölgeyi tam sayılı ve bileşik " +
      "kesir olarak yazar, şıklardan eşit OLMAYANI bulur. Şerit sayısını tam sanmak tipik hatadır.",
    kurallar: ["Metinde hiçbir sayı yazma; tüm bilgi şekilden okunur."],
    ornek: {
      senaryo: "Şekildeki eş şeritlerin her biri eş parçalara bölünmüş ve bazı parçalar taranmıştır.",
      soru: "Buna göre taralı bölgenin gösterdiği sayıya eşit olmayan hangisidir?",
    },
    ornekCizim: {
      tip: "kesir_cubugu",
      cubuklar: [
        { parca: 2, tarali: 2 },
        { parca: 2, tarali: 2 },
        { parca: 2, tarali: 2 },
        { parca: 2, tarali: 1 },
      ],
    },
    ornekCikarim: metinPlani({
      baglam:
        "Şekildeki eş şeritlerin her biri eş parçalara bölünmüş ve bazı parçalar taranmıştır. Şerit, parça ve taralı " +
        "parça sayılarını metne YAZMA: öğrenci şekilden okur.",
      konu: "şerit",
      ornekSoru: "Buna göre taralı bölgenin gösterdiği sayıya eşit olmayan hangisidir?",
      anahtarIfadeler: [["şerit"], ["tara"]],
      kokIfadeleri: [["eşit olmayan", "eşit değil"]],
      ipucu: "3 tam şerit + 1/2 = 3 1/2 = 7/2 = 14/4; 4 1/2 eşit değil",
      cozum: "Taralı bölge 3 tam şerit ve 1/2 şerittir: 3 1/2 = 7/2 = 14/4. 4 1/2 bu sayıya eşit değildir.",
      secenekler: [
        { metin: "3 1/2", hata: "esitGosterim" },
        { metin: "4 1/2" },
        { metin: "7/2", hata: "esitGosterim" },
        { metin: "14/4", hata: "esitGosterim" },
      ],
    }),
  }),
  seritFarki: gorevTanimi("seritFarki", {
    etiket: "İki şeridin farkı (paydaları eşitleme)",
    aciklama:
      "Aynı uzunluktaki, farklı sayıda parçaya bölünmüş iki şeritte boyanan kısımlar şekilden okunur; öğrenci paydaları " +
      "eşitleyip farkı bulur. Pay ve paydaları ayrı ayrı çıkarmak tipik hatadır.",
    kurallar: ["Kesirleri ve parça sayılarını metne yazma; kişi adlarını planda verildiği gibi kullan."],
    ornek: {
      senaryo: "Aynı uzunluktaki iki şeritten Ece ve Can, kendi şeritlerinin şekilde taralı gösterilen parçalarını boyamıştır.",
      soru: "Buna göre iki şeritte boyanan kısımlar arasındaki fark, bir şeridin kaçta kaçıdır?",
    },
    ornekCizim: {
      tip: "kesir_cubugu",
      cubuklar: [
        { parca: 4, tarali: 3, ad: "Ece" },
        { parca: 8, tarali: 5, ad: "Can" },
      ],
    },
    ornekCikarim: metinPlani({
      baglam: IKI_SERIT_BAGLAMI("Ece", "Can"),
      konu: "şerit",
      ornekSoru: "Buna göre iki şeritte boyanan kısımlar arasındaki fark, bir şeridin kaçta kaçıdır?",
      adlar: ["Ece", "Can"],
      anahtarIfadeler: [["aynı uzunlukta", "eş uzunlukta", "eşit uzunlukta"]],
      kokIfadeleri: [["fark"], ["kaçta kaçı"]],
      ipucu: "Ece 3/4, Can 5/8; paydalar 8'de eşitlenir; fark 1/8",
      cozum: "Ece şeridinin 3/4, Can 5/8 kadarını boyamıştır. Paydalar eşitlenip çıkarılınca fark 1/8 şerit olur.",
      secenekler: [
        { metin: "2/4", hata: "payVePaydaAyriCikarma" },
        { metin: "1/8" },
        { metin: "1/4", hata: "paydaEsitlemeden" },
        { metin: "1 3/8", hata: "toplama" },
      ],
    }),
  }),
  seritToplami: gorevTanimi("seritToplami", {
    etiket: "İki şeridin toplamı (paydaları eşitleme)",
    aciklama:
      "Aynı uzunluktaki iki şeritte boyanan kısımlar şekilden okunur; öğrenci paydaları eşitleyip toplar (sonuç bir " +
      "şeritten büyükse tam sayılı kesir). Paydaları da toplamak tipik hatadır.",
    kurallar: ["Kesirleri ve parça sayılarını metne yazma; kişi adlarını planda verildiği gibi kullan."],
    ornek: {
      senaryo: "Aynı uzunluktaki iki şeritten Elif ve Mert, kendi şeritlerinin şekilde taralı gösterilen parçalarını boyamıştır.",
      soru: "Buna göre iki şeritte boyanan kısımların toplamı kaç şerit eder?",
    },
    ornekCizim: {
      tip: "kesir_cubugu",
      cubuklar: [
        { parca: 3, tarali: 2, ad: "Elif" },
        { parca: 6, tarali: 5, ad: "Mert" },
      ],
    },
    ornekCikarim: metinPlani({
      baglam: IKI_SERIT_BAGLAMI("Elif", "Mert"),
      konu: "şerit",
      ornekSoru: "Buna göre iki şeritte boyanan kısımların toplamı kaç şerit eder?",
      adlar: ["Elif", "Mert"],
      anahtarIfadeler: [["aynı uzunlukta", "eş uzunlukta", "eşit uzunlukta"]],
      kokIfadeleri: [["toplam"]],
      ipucu: "2/3 + 5/6; paydalar 6'da eşitlenir; toplam 1 1/2",
      cozum: "Elif 2/3, Mert 5/6 şerit boyamıştır. Paydalar eşitlenip toplanınca 1 1/2 şerit eder.",
      secenekler: [
        { metin: "7/9", hata: "paydalariToplama" },
        { metin: "1 1/2" },
        { metin: "1 1/6", hata: "paydaEsitlemeden" },
        { metin: "1/6", hata: "farkAlma" },
      ],
    }),
  }),
};

export const kesirCubuguTanimi: GorselSoruTanimi<"kesir_cubugu"> = {
  tip: "kesir_cubugu",
  etiket: "Kesir şeridi (bar) modeli",
  aciklama:
    "Aynı uzunlukta, eş parçalara bölünmüş şeritler. Sistem şeritleri plandaki parça/taralı parça sayılarından çizer ve " +
    "doğru cevabı kendisi hesaplar; öğrenci bilgiyi şekilden okuyup dönüşüm, karşılaştırma ya da toplama yapar.",
  gorselKategorisi: "fonksiyonel",
  gorselStratejisi: "svg",
  kesirKonusuGerekir: true,
  kurallar: [
    "Bağlam bir bütünün (şerit, kurdele, çikolata) eş parçalarıdır. Parça ve taralı parça sayıları ŞEKİLDE görünür; " +
      "bunları metne yazma (sistem metindeki plan dışı sayıları reddeder).",
    "Metin 1-3 kısa cümle olsun.",
  ],
  ortakSemaAciklamasi: [],
  gorevler,
  dogrula: (raw, path, sorunlar, plan) =>
    planliGorselDogrula(
      raw,
      path,
      sorunlar,
      plan,
      { gorevler: KESIR_CUBUGU_GOREVLERI, cizimTipi: "kesir_cubugu", serbestSayilar: (cizim) => [cizim.cubuklar.length] },
      (ortak, cizim): KesirCubuguVerisi => ({ ...ortak, cubuklar: cizim.cubuklar })
    ),
  dogruCevapMetni: planliDogruCevapMetni,
};
