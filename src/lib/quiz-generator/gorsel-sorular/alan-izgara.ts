import { oranMetni, oranYap, type Oran } from "@/lib/quiz-generator/gorsel-sorular/kesir-aritmetigi";
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
import { ALAN_IZGARA_GOREVLERI, type AlanIzgaraGorevi, type AlanIzgaraVerisi } from "@/types/gorsel-soru";

/**
 * alan_izgara — alan / ızgara modeli; references/gorsel-tip-haritasi.md, Tip 3.
 * Desen daire_kesir ile aynıdır: ızgarayı ve doğru cevabı KOD kurar; kare
 * sayıları metne yazılmaz (öğrenci şekilden sayar), soru bunun üstüne denk
 * kesri kareye çevirme, çıkarma ve sadeleştirme ister.
 */

type Uretim = GenelUretim<CizimPlaniOf<"alan_izgara">>;

const o = (pay: number, payda = 1): Oran => oranYap({ pay, payda });
const yaz = (oran: Oran) => oranMetni(oran);

/** Izgara boyutları: kare sayısının çok böleni olsun (denk kesirler kareye çevrilebilsin). */
const BOYUTLAR: readonly [number, number][] = [[3, 4], [3, 5], [4, 5], [4, 6], [3, 6], [5, 6]];

/** n kareli ızgarada kareye çevrilebilen sade, 1'den küçük kesirler (payda n'yi böler). */
function kareyeCevrilebilenKesirler(n: number): Oran[] {
  const sonuc: Oran[] = [];
  for (let payda = 2; payda <= n; payda += 1) {
    if (n % payda !== 0) continue;
    for (let pay = 1; pay < payda; pay += 1) if (ebob(pay, payda) === 1) sonuc.push(o(pay, payda));
  }
  return sonuc;
}

const SAYI_YAZMA = "Kare/parsel sayılarını metne YAZMA ('12 parsele ayrılmış' değil 'eş parsellere ayrılmış'): öğrenci şekilden sayar.";

// ---------------------------------------------------------------------------
// Sonradan doldurulan kareler (Pınar/Umut şablonu → farklı sektörler)
// ---------------------------------------------------------------------------

interface DoldurmaBaglami {
  konu: string;
  giris: (ad1: string, ad2: string) => string;
  soru: (ad2: string) => string;
  birim: string;
  anahtar: string[];
  kisili: boolean;
}

const DOLDURMA_BAGLAMLARI: readonly DoldurmaBaglami[] = [
  {
    konu: "alan",
    giris: (a, b) =>
      `${a} şekildeki eş kareli ızgaranın mavi karelerini boyamıştır. ${b}, boyalı alan tüm ızgaranın verilen kesrine ` +
      "denk olacak şekilde boyamaya devam etmiştir.",
    soru: (b) => `Buna göre ${b} kaç kare boyamıştır?`,
    birim: "kare",
    anahtar: ["boya"],
    kisili: true,
  },
  {
    konu: "inşaat",
    giris: (a, b) =>
      `${a} şekildeki eş karelere ayrılmış duvarın mavi karelerine fayans döşemiştir. ${b}, fayanslı alan tüm duvarın ` +
      "verilen kesrine denk olacak şekilde döşemeye devam etmiştir.",
    soru: (b) => `Buna göre ${b} kaç kareye fayans döşemiştir?`,
    birim: "kare",
    anahtar: ["fayans"],
    kisili: true,
  },
  {
    konu: "sinema",
    giris: () =>
      "Bir sinema salonunun koltuk planı şekildeki gibi eş karelere ayrılmıştır; mavi kareler öğleden önce satılan " +
      "koltukları gösterir. Akşama kadar satılan koltuklar tüm salonun verilen kesrine denk olmuştur.",
    soru: () => "Buna göre öğleden sonra kaç koltuk daha satılmıştır?",
    birim: "koltuk",
    anahtar: ["koltuk"],
    kisili: false,
  },
  {
    konu: "otopark",
    giris: () =>
      "Bir otoparkın planı şekildeki gibi eş karelere ayrılmıştır; mavi kareler sabah dolu olan park yerlerini gösterir. " +
      "Öğlene kadar dolu yerler tüm otoparkın verilen kesrine denk olmuştur.",
    soru: () => "Buna göre öğlene kadar kaç araç daha park etmiştir?",
    birim: "araç",
    anahtar: ["park"],
    kisili: false,
  },
];

function sonradanBoyanan(r: Rastgele): Uretim {
  const bg = r.sec(DOLDURMA_BAGLAMLARI);
  const [satir, sutun] = r.sec(BOYUTLAR);
  const n = satir * sutun;
  const adaylar = kareyeCevrilebilenKesirler(n).filter((kesir) => kesir.payda < n);
  const ilk = r.sec(adaylar);
  const son = r.sec(adaylar);
  const ilkKare = (ilk.pay * n) / ilk.payda;
  const sonKare = (son.pay * n) / son.payda;
  const fark = sonKare - ilkKare;
  if (fark < 2 || ilkKare < 2) return undefined;
  // İkinci aşama genişletilmiş yazımla verilir (28/35 gibi): öğrenci önce sadeleştirir.
  const k = r.aralik(2, 5);
  const verilen = { pay: son.pay * k, payda: son.payda * k };
  // Payda kare sayısına eşitse pay doğrudan kare sayısıdır; sadeleştirme/çevirme adımı kaybolur.
  if (verilen.payda === n) return undefined;
  const [ad1, ad2] = r.karistir(ISIMLER);
  const adet = (x: number) => `${x} ${bg.birim}`;
  const secenekler = siklar(r, adet(fark), [
    { metin: adet(sonKare), hata: "toplamiBulma" }, // sonradan doldurulanı değil toplamı bulmak
    ...(verilen.pay - ilkKare > 0 ? [{ metin: adet(verilen.pay - ilkKare), hata: "payiKareSanma" }] : []), // genişletilmiş payı kare sayısı sanmak
    { metin: adet(n - sonKare), hata: "bosKalan" },
    { metin: adet(fark + 1), hata: "birFazla" },
    { metin: adet(fark - 1), hata: "birEksik" },
  ]);
  if (!secenekler) return undefined;
  return {
    cizim: { tip: "alan_izgara", izgara: { satir, sutun, boyalar: [{ renk: "mavi", sayi: ilkKare }] } },
    cikarim: metinPlani({
      baglam: `${bg.giris(ad1, ad2)} ${SAYI_YAZMA}`,
      konu: bg.konu,
      ornekSoru: bg.soru(ad2),
      veriler: [{ ad: "son durumda dolu alanın tümüne oranı (genişletilmiş yazım)", deger: verilen }],
      adlar: bg.kisili ? [ad1, ad2] : [],
      anahtarIfadeler: [["denk"], bg.anahtar],
      kokIfadeleri: [[`kaç ${bg.birim}`]],
      ipucu: `${n} kare, ${ilkKare} mavi; ${ham(verilen.pay, verilen.payda)} = ${yaz(son)} → ${sonKare}; ${sonKare} − ${ilkKare} = ${fark}`,
      cozum:
        `Plan ${satir} × ${sutun} = ${n} karedir ve ${ilkKare} karesi mavidir. ${ham(verilen.pay, verilen.payda)} = ` +
        `${yaz(son)} olduğundan son durumda ${n} × ${yaz(son)} = ${sonKare} kare dolu olmalıdır. Sonradan ` +
        `${sonKare} − ${ilkKare} = ${adet(fark)} eklenmiştir.`,
      secenekler,
    }),
  };
}

/** İki renkli ızgara: mavi + turuncu + boş; boş sayısı ile dolu sayısı farklı (yoksa "dolu için hesaplama" tuzağı kaybolur). */
function ikiRenkliIzgara(r: Rastgele): { satir: number; sutun: number; n: number; mavi: number; turuncu: number; bos: number } | undefined {
  const [satir, sutun] = r.sec(BOYUTLAR);
  const n = satir * sutun;
  const mavi = r.aralik(2, Math.floor(n / 2));
  const turuncu = r.aralik(2, Math.floor(n / 2));
  const bos = n - mavi - turuncu;
  if (bos < 2 || mavi === turuncu || bos === mavi + turuncu) return undefined;
  return { satir, sutun, n, mavi, turuncu, bos };
}

// ---------------------------------------------------------------------------
// Boş alan ÷ birim kesir (HEDEF: damlama ucu → farklı sektörler, 6. sınıf)
// ---------------------------------------------------------------------------

interface BirimBaglami {
  konu: string;
  giris: string;
  yerlesim: (birim: number) => string;
  nesne: string;
  soru: string;
  anahtar: string[];
  butun: string;
}

const BIRIM_BAGLAMLARI: readonly BirimBaglami[] = [
  {
    konu: "bahçe",
    giris:
      "Bir peyzaj mimarı şekildeki eş parsellere ayrılmış hobi bahçesinde mavi parsellere süs bitkisi, turuncu " +
      "parsellere sebze fidesi dikmiştir; beyaz parseller boş kalmıştır.",
    yerlesim: (m) => `Mimar boş parsellerin tamamına, tüm bahçe alanının her 1/${m}'lik kısmına bir damlama ucu gelecek şekilde sulama tesisatı kuracaktır.`,
    nesne: "damlama ucu",
    soru: "Buna göre boş bırakılan alan için toplam kaç damlama ucuna ihtiyaç vardır?",
    anahtar: ["damlama"],
    butun: "bahçe",
  },
  {
    konu: "enerji",
    giris:
      "Bir fabrikanın çatısı şekildeki gibi eş parsellere ayrılmıştır; mavi parsellerde havalandırma, turuncu " +
      "parsellerde su deposu vardır, beyaz parseller boştur.",
    yerlesim: (m) => `Boş parsellerin tamamına, tüm çatı alanının her 1/${m}'lik kısmına bir güneş paneli yerleştirilecektir.`,
    nesne: "güneş paneli",
    soru: "Buna göre boş alana toplam kaç güneş paneli yerleştirilir?",
    anahtar: ["panel"],
    butun: "çatı",
  },
  {
    konu: "fuar",
    giris:
      "Bir fuar alanının planı şekildeki gibi eş parsellere ayrılmıştır; mavi parseller yemek alanı, turuncu parseller " +
      "sahne alanıdır, beyaz parseller boştur.",
    yerlesim: (m) => `Boş parsellerin tamamına, tüm fuar alanının her 1/${m}'lik kısmına bir stand kurulacaktır.`,
    nesne: "stand",
    soru: "Buna göre boş alana toplam kaç stand kurulur?",
    anahtar: ["stand"],
    butun: "fuar alanı",
  },
];

/** references/senaryo-kalite-referans-v2.md — alan_izgara HEDEF MODEL: boş oran ÷ birim kesir (6. sınıf). */
function damlamaUcu(r: Rastgele): Uretim {
  const bg = r.sec(BIRIM_BAGLAMLARI);
  const izgara = ikiRenkliIzgara(r);
  if (!izgara) return undefined;
  const { satir, sutun, n, mavi, turuncu, bos } = izgara;
  const k = r.sec([2, 3]);
  const birim = n * k;
  const cevap = bos * k;
  const adet = (x: number) => `${x} ${bg.nesne}`;
  const secenekler = siklar(r, adet(cevap), [
    { metin: adet(bos), hata: "yalnizcaSayma" }, // boş parselleri sayıp işlem yapmamak
    { metin: adet(birim), hata: "tumAlan" }, // tüm alan için hesaplamak
    { metin: adet((mavi + turuncu) * k), hata: "doluIcinHesaplama" }, // yanlış bölge
    { metin: adet(birim - bos), hata: "yanlisEksiltme" },
    { metin: adet(cevap + k), hata: "birParselFazla" },
  ]);
  if (!secenekler) return undefined;
  return {
    cizim: { tip: "alan_izgara", izgara: { satir, sutun, boyalar: [{ renk: "mavi", sayi: mavi }, { renk: "turuncu", sayi: turuncu }] } },
    cikarim: metinPlani({
      baglam: `${bg.giris} ${bg.yerlesim(birim)} ${SAYI_YAZMA}`,
      konu: bg.konu,
      ornekSoru: bg.soru,
      veriler: [{ ad: `bir ${bg.nesne} için ayrılan alan (tüm ${bg.butun} alanının kesri)`, deger: { pay: 1, payda: birim } }],
      anahtarIfadeler: [bg.anahtar, ["boş"]],
      kokIfadeleri: [["kaç"]],
      ipucu: `${n} parsel, ${bos} boş → ${ham(bos, n)}; ${ham(bos, n)} ÷ 1/${birim} = ${ham(bos, n)} × ${birim} = ${cevap}`,
      cozum:
        `Plan ${satir} × ${sutun} = ${n} parseldir; ${bos} parsel boştur, yani boş alan ${ham(bos, n)}. ` +
        `${ham(bos, n)} ÷ 1/${birim} = ${ham(bos, n)} × ${birim} = ${adet(cevap)} gerekir.`,
      secenekler,
    }),
  };
}

// ---------------------------------------------------------------------------
// Boş alanın ölçüsü (bir çokluğun kesri, 5. sınıf)
// ---------------------------------------------------------------------------

interface OlcuBaglami {
  konu: string;
  giris: string;
  soru: string;
  anahtar: string[];
}

const OLCU_BAGLAMLARI: readonly OlcuBaglami[] = [
  {
    konu: "bahçe",
    giris:
      "Bir hobi bahçesi şekildeki gibi eş parsellere ayrılmıştır; mavi parsellere süs bitkisi, turuncu parsellere sebze " +
      "fidesi dikilmiş, beyaz parseller boş bırakılmıştır. Bahçenin toplam alanı metrekare olarak verilir.",
    soru: "Buna göre bahçede boş bırakılan alan kaç metrekaredir?",
    anahtar: ["bahçe"],
  },
  {
    konu: "depo",
    giris:
      "Bir deponun zemini şekildeki gibi eş parsellere ayrılmıştır; mavi parsellerde raflar, turuncu parsellerde koliler " +
      "vardır, beyaz parseller boştur. Deponun toplam alanı metrekare olarak verilir.",
    soru: "Buna göre depodaki boş alan kaç metrekaredir?",
    anahtar: ["depo"],
  },
  {
    konu: "okul",
    giris:
      "Bir okul bahçesinin planı şekildeki gibi eş parsellere ayrılmıştır; mavi parseller basketbol sahası, turuncu " +
      "parseller oyun alanıdır, beyaz parseller henüz düzenlenmemiştir. Okul bahçesinin toplam alanı metrekare olarak verilir.",
    soru: "Buna göre okul bahçesinde düzenlenmemiş alan kaç metrekaredir?",
    anahtar: ["okul"],
  },
];

/** 5. sınıf karşılığı: boş oranı bir çokluğa (toplam alan) uygulamak. */
function bosAlanOlcusu(r: Rastgele): Uretim {
  const bg = r.sec(OLCU_BAGLAMLARI);
  const izgara = ikiRenkliIzgara(r);
  if (!izgara) return undefined;
  const { satir, sutun, n, mavi, turuncu, bos } = izgara;
  const t = r.aralik(2, 6);
  const toplam = n * t;
  const cevap = bos * t;
  const m2 = (x: number) => `${x} m²`;
  const kalanaOran = (toplam * bos) % (mavi + turuncu) === 0 ? (toplam * bos) / (mavi + turuncu) : undefined;
  const secenekler = siklar(r, m2(cevap), [
    { metin: m2((mavi + turuncu) * t), hata: "doluIcinHesaplama" },
    ...(kalanaOran ? [{ metin: m2(kalanaOran), hata: "kalanaOran" }] : []), // boşun doluya oranını almak
    { metin: m2(bos), hata: "yalnizcaSayma" },
    { metin: m2(toplam - bos), hata: "yanlisIslem" },
    { metin: m2(cevap + t), hata: "birParselFazla" },
  ]);
  if (!secenekler) return undefined;
  return {
    cizim: { tip: "alan_izgara", izgara: { satir, sutun, boyalar: [{ renk: "mavi", sayi: mavi }, { renk: "turuncu", sayi: turuncu }] } },
    cikarim: metinPlani({
      baglam: `${bg.giris} ${SAYI_YAZMA}`,
      konu: bg.konu,
      ornekSoru: bg.soru,
      veriler: [{ ad: "toplam alan (m²)", deger: { pay: toplam, payda: 1 } }],
      anahtarIfadeler: [bg.anahtar],
      kokIfadeleri: [["kaç metrekare", "kaç m²", "kaç m2"]],
      ipucu: `${n} parsel, ${bos} boş → ${ham(bos, n)}; ${toplam} × ${ham(bos, n)} = ${cevap} m²`,
      cozum:
        `Plan ${satir} × ${sutun} = ${n} parseldir; ${bos} parsel boştur, yani boş alan oranı ${ham(bos, n)}. ` +
        `${toplam} × ${ham(bos, n)} = ${cevap} m².`,
      secenekler,
    }),
  };
}

const URETICILER: Record<AlanIzgaraGorevi, (r: Rastgele) => Uretim> = { sonradanBoyanan, damlamaUcu, bosAlanOlcusu };

/** Deterministik: aynı tohum aynı planı verir; koşulları sağlamayan tohumlar atlanır. */
export function alanIzgaraPlaniUret(gorev: AlanIzgaraGorevi, tohum: number): PlanliGorselPlan<CizimPlaniOf<"alan_izgara">> {
  for (let deneme = 0; ; deneme += 1) {
    const plan = URETICILER[gorev](rastgeleOlustur(tohum + deneme * 1013));
    if (plan) return plan;
  }
}

// ---------------------------------------------------------------------------
// Tanım
// ---------------------------------------------------------------------------

function gorevTanimi(
  gorev: AlanIzgaraGorevi,
  tanim: Pick<GorselSoruGorevTanimi<"alan_izgara">, "etiket" | "aciklama" | "kurallar" | "ornekCikarim" | "ornekCizim" | "enAzSinif"> & {
    ornek: { senaryo: string; soru: string };
  }
): GorselSoruGorevTanimi<"alan_izgara"> {
  return {
    ...tanim,
    gorev,
    kesirKonusuGerekir: true,
    semaAciklamasi: PLANLI_GORSEL_SEMA_ACIKLAMASI,
    ornek: { tip: "alan_izgara", veri: { gorev, ...tanim.ornek } },
    jsonSemasi: planliGorselSema(gorev),
  };
}

const gorevler: GorselSoruTanimi<"alan_izgara">["gorevler"] = {
  sonradanBoyanan: gorevTanimi("sonradanBoyanan", {
    etiket: "Sonradan boyanan kareler (denk kesir → kare)",
    aciklama:
      "Izgaranın bir kısmı boyalıdır; metin, boyamanın sonunda boyalı alanın denk olduğu kesri genişletilmiş yazımla " +
      "verir. Öğrenci kare sayısını bulur, kesri sadeleştirip kareye çevirir ve sonradan boyanan kare sayısını bulur.",
    kurallar: ["Yalnızca planın verdiği kesri yaz (genişletilmiş yazımıyla); kare sayılarını metne yazma."],
    ornek: {
      senaryo:
        "Pınar şekildeki eş kareli ızgaranın mavi karelerini boyamıştır. Umut, boyalı alan tüm ızgaranın 28/35'ine denk " +
        "olacak şekilde boyamaya devam etmiştir.",
      soru: "Buna göre Umut kaç kare boyamıştır?",
    },
    ornekCizim: { tip: "alan_izgara", izgara: { satir: 3, sutun: 5, boyalar: [{ renk: "mavi", sayi: 5 }] } },
    ornekCikarim: metinPlani({
      baglam:
        "Pınar şekildeki eş kareli ızgaranın mavi karelerini boyamıştır. Umut, boyalı alan tüm ızgaranın verilen " +
        "kesrine denk olacak şekilde boyamaya devam etmiştir. Kare sayılarını metne YAZMA: öğrenci şekilden sayar.",
      konu: "alan",
      ornekSoru: "Buna göre Umut kaç kare boyamıştır?",
      veriler: [{ ad: "boyamanın sonunda boyalı alanın ızgaraya oranı (genişletilmiş yazım)", deger: { pay: 28, payda: 35 } }],
      adlar: ["Pınar", "Umut"],
      anahtarIfadeler: [["denk"]],
      kokIfadeleri: [["kaç kare"]],
      ipucu: "ızgara 15 kare, 5 boyalı; 28/35 = 4/5 → 12 kare; 12 − 5 = 7",
      cozum:
        "Izgara 3 × 5 = 15 karedir ve 5 karesi boyalıdır. 28/35 = 4/5 olduğundan boyalı alan 15 × 4/5 = 12 kare " +
        "olmalıdır. Umut 12 − 5 = 7 kare boyamıştır.",
      secenekler: [
        { metin: "12 kare", hata: "toplamiBulma" },
        { metin: "7 kare" },
        { metin: "23 kare", hata: "payiKareSanma" },
        { metin: "3 kare", hata: "bosKalan" },
      ],
    }),
  }),
  damlamaUcu: gorevTanimi("damlamaUcu", {
    etiket: "Boş alana damlama ucu (oran ÷ birim kesir)",
    aciklama:
      "Öğrenci parselleri sayıp boş alanın tüm bahçeye oranını bulur, sonra bu oranı bir damlama ucunun düştüğü birim " +
      "kesre böler. Yalnızca boş parselleri saymak ya da tüm bahçe için hesaplamak tipik hatadır.",
    enAzSinif: 6,
    kurallar: ["Parsel sayılarını metne yazma; yalnızca birim kesri (her 1/24'lük alan gibi) yaz."],
    ornek: {
      senaryo:
        "Bir peyzaj mimarı şekildeki eş parsellere ayrılmış hobi bahçesinde mavi parsellere süs bitkisi, turuncu " +
        "parsellere sebze fidesi dikmiştir. Mimar, boş parsellerin tamamına tüm bahçe alanının her 1/24'lük kısmına bir " +
        "otomatik damlama ucu gelecek şekilde sulama tesisatı kuracaktır.",
      soru: "Buna göre boş bırakılan alan için toplam kaç damlama ucuna ihtiyaç vardır?",
    },
    ornekCizim: {
      tip: "alan_izgara",
      izgara: { satir: 3, sutun: 4, boyalar: [{ renk: "mavi", sayi: 4 }, { renk: "turuncu", sayi: 3 }] },
    },
    ornekCikarim: metinPlani({
      baglam: "Peyzaj mimarı, boş parsellere tüm bahçenin her 1/24'lük kısmına bir damlama ucu koyacaktır.",
      konu: "bahçe",
      ornekSoru: "Buna göre boş bırakılan alan için toplam kaç damlama ucuna ihtiyaç vardır?",
      veriler: [{ ad: "bir damlama ucunun düştüğü alan (tüm bahçenin kesri)", deger: { pay: 1, payda: 24 } }],
      anahtarIfadeler: [["damlama"], ["boş"]],
      kokIfadeleri: [["kaç"]],
      ipucu: "12 parsel, 5 boş → 5/12; 5/12 ÷ 1/24 = 5/12 × 24 = 10",
      cozum: "Bahçe 3 × 4 = 12 parseldir; 5 parsel boştur, yani boş alan 5/12. 5/12 ÷ 1/24 = 5/12 × 24 = 10 damlama ucu gerekir.",
      secenekler: [
        { metin: "10 damlama ucu" },
        { metin: "5 damlama ucu", hata: "yalnizcaSayma" },
        { metin: "24 damlama ucu", hata: "tumBahce" },
        { metin: "14 damlama ucu", hata: "boyaliIcinHesaplama" },
      ],
    }),
  }),
  bosAlanOlcusu: gorevTanimi("bosAlanOlcusu", {
    etiket: "Boş alanın ölçüsü (bir çokluğun kesri)",
    aciklama:
      "Öğrenci parselleri sayıp boş alanın tüm bahçeye oranını bulur, sonra bu kesri bahçenin toplam alanına uygular. " +
      "Boş alanı boyalı alana oranlamak ya da yalnızca kareleri saymak tipik hatadır.",
    kurallar: ["Parsel sayılarını metne yazma; yalnızca bahçenin toplam alanını (m²) yaz."],
    ornek: {
      senaryo:
        "Bir peyzaj mimarı şekildeki eş parsellere ayrılmış hobi bahçesinde mavi parsellere süs bitkisi, turuncu " +
        "parsellere sebze fidesi dikmiştir; beyaz parseller boş kalmıştır. Bahçenin toplam alanı 60 m²'dir.",
      soru: "Buna göre bahçede boş bırakılan alan kaç metrekaredir?",
    },
    ornekCizim: {
      tip: "alan_izgara",
      izgara: { satir: 3, sutun: 4, boyalar: [{ renk: "mavi", sayi: 4 }, { renk: "turuncu", sayi: 3 }] },
    },
    ornekCikarim: metinPlani({
      baglam: "Bahçenin toplam alanı metre kare olarak verilir; boş parseller şekilden sayılır.",
      konu: "bahçe",
      ornekSoru: "Buna göre bahçede boş bırakılan alan kaç metrekaredir?",
      veriler: [{ ad: "bahçenin toplam alanı (m²)", deger: { pay: 60, payda: 1 } }],
      anahtarIfadeler: [["boş"]],
      kokIfadeleri: [["kaç metrekare", "kaç m²", "kaç m2"]],
      ipucu: "12 parsel, 5 boş → 5/12; 60 × 5/12 = 25 m²",
      cozum: "Bahçe 3 × 4 = 12 parseldir; 5 parsel boştur, yani boş alan bahçenin 5/12'idir. 60 × 5/12 = 25 m².",
      secenekler: [
        { metin: "25 m²" },
        { metin: "35 m²", hata: "boyaliIcinHesaplama" },
        { metin: "5 m²", hata: "yalnizcaSayma" },
        { metin: "55 m²", hata: "yanlisIslem" },
      ],
    }),
  }),
};

export const alanIzgaraTanimi: GorselSoruTanimi<"alan_izgara"> = {
  tip: "alan_izgara",
  etiket: "Alan / ızgara modeli",
  aciklama:
    "Eş karelere ayrılmış dikdörtgen bir alan (bahçe, tarla, duvar). Sistem ızgarayı plandaki boyalı kare sayılarından " +
    "çizer ve doğru cevabı kendisi hesaplar; öğrenci kareleri sayıp denk kesir, çıkarma ve sadeleştirme yapar.",
  gorselKategorisi: "fonksiyonel",
  gorselStratejisi: "svg",
  kesirKonusuGerekir: true,
  kurallar: [
    "Bağlam bir alanın eş parçalarıdır (bahçe, tarla, ızgara boyama). Kare sayıları ŞEKİLDE görünür; bunları metne " +
      "yazma (sistem metindeki plan dışı sayıları reddeder).",
    "Metin 1-3 kısa cümle olsun; renklerin neyi gösterdiğini yaz.",
  ],
  // references/senaryo-kalite-referans-v2.md — TYMM HEDEF / RET modelleri.
  hedefSeviyeOrnekleri: [
    "HEDEF: \"Bir peyzaj mimarı yukarıdaki eş parsellere ayrılmış hobi bahçesinde mavi bölgelere süs bitkisi, turuncu " +
      "bölgelere sebze fidesi dikmiştir. Geriye kalan boş parsellerin tamamına her 1/24 birimlik alana bir damlama ucu " +
      "gelecek şekilde sulama tesisatı kuracaktır. Boş alan için kaç damlama ucu gerekir?\" → 5/12 ÷ 1/24 = 10 (görselden " +
      "oran okuma + kesirle bölme).",
    "RET (yazma): \"Bahçenin boş bırakılan kısmı tüm bahçenin kaçta kaçıdır?\" — yalnızca kare saydıran tek adımlı soru.",
  ],
  ortakSemaAciklamasi: [],
  gorevler,
  dogrula: (raw, path, sorunlar, plan) =>
    planliGorselDogrula(
      raw,
      path,
      sorunlar,
      plan,
      { gorevler: ALAN_IZGARA_GOREVLERI, cizimTipi: "alan_izgara" },
      (ortak, cizim): AlanIzgaraVerisi => ({ ...ortak, izgara: cizim.izgara })
    ),
  dogruCevapMetni: planliDogruCevapMetni,
};
