import { oranMetni, oranYap, type Oran } from "@/lib/quiz-generator/gorsel-sorular/kesir-aritmetigi";
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
import { rastgeleOlustur, type Rastgele } from "@/lib/quiz-generator/gorsel-sorular/senaryo-sayilari";
import { CETVEL_OLCUM_GOREVLERI, type CetvelOlcumGorevi, type CetvelOlcumVerisi, type Kesir } from "@/types/gorsel-soru";

/**
 * cetvel_olcum — cetvel / ölçüm modeli; references/gorsel-tip-haritasi.md, Tip 5.
 * Desen daire_kesir ile aynıdır: cetveli, nesnelerin konumlarını ve doğru cevabı
 * KOD kurar; konumlar her zaman bir bölme çizgisine denk gelir. Nesneler 0'dan
 * başlamaz: öğrenci başlangıcı ve bitişi okuyup çıkarmak zorundadır (bitişi
 * uzunluk sanmak tipik hatadır).
 */

type Uretim = GenelUretim<CizimPlaniOf<"cetvel_olcum">>;

const o = (pay: number, payda = 1): Oran => oranYap({ pay, payda });
const yaz = (oran: Oran) => oranMetni(oran);
const UZUNLUK = 10;

/** Çıtanın [baslangic, bitis] konumu bölme sayısı olarak (cm × bolme); çıta 0'dan başlamaz. */
function citaKonumu(r: Rastgele, bolme: number, enAzCm: number): [number, number] | undefined {
  const toplam = UZUNLUK * bolme;
  const baslangic = r.aralik(1, Math.floor(toplam / 2));
  const bitis = r.aralik(baslangic + enAzCm * bolme, toplam - 1);
  return bitis > baslangic ? [baslangic, bitis] : undefined;
}

/**
 * Ölçülen nesnenin bağlamı. Birden çok bağlam (farklı konu) vardır: bağlam havuzu kısıtı
 * aynı quizde aynı konunun (ör. iki "atölye" sorusu) tekrarını önleyebilsin. Ekli biçimler
 * elle yazılır (çıtadan, kurdeleden, kablodan).
 */
interface OlcumBaglami {
  konu: string;
  nesne: string;
  nesneBuyuk: string;
  tanitim: string;
  bolmeCumlesi: string;
  parcaAdi: string;
  kamaSorusu: string;
  kesmeCumlesi: string;
  kalanSorusu: string;
}

const OLCUM_BAGLAMLARI: readonly OlcumBaglami[] = [
  {
    konu: "atölye",
    nesne: "çıta",
    nesneBuyuk: "Çıta",
    tanitim: "Bir marangoz çırağının çıtası şekildeki cetvelin üzerine konmuştur",
    bolmeCumlesi: "Çırak çıtayı, her biri verilen uzunlukta olan eşit kamalara bölmek istiyor; kesme payı ihmal edilir.",
    parcaAdi: "kama",
    kamaSorusu: "Buna göre bu çıtadan en fazla kaç tam kama elde edilir?",
    kesmeCumlesi: "Marangoz bu çıtadan verilen uzunlukta bir parça kesmiştir.",
    kalanSorusu: "Buna göre çıtanın kalan parçası kaç santimetredir?",
  },
  {
    konu: "hediye",
    nesne: "kurdele",
    nesneBuyuk: "Kurdele",
    tanitim: "Bir kırtasiyecinin kurdelesi şekildeki cetvelin üzerine konmuştur",
    bolmeCumlesi:
      "Kırtasiyeci kurdeleyi, her biri verilen uzunlukta olan eşit parçalara kesip fiyonk yapmak istiyor; kesme payı ihmal edilir.",
    parcaAdi: "fiyonk",
    kamaSorusu: "Buna göre bu kurdeleden en fazla kaç tam fiyonk yapılabilir?",
    kesmeCumlesi: "Kırtasiyeci bu kurdeleden verilen uzunlukta bir parça kesmiştir.",
    kalanSorusu: "Buna göre kurdelenin kalan parçası kaç santimetredir?",
  },
  {
    konu: "tesisat",
    nesne: "kablo",
    nesneBuyuk: "Kablo",
    tanitim: "Bir elektrik teknisyeninin kablosu şekildeki cetvelin üzerine konmuştur",
    bolmeCumlesi:
      "Teknisyen kabloyu, her biri verilen uzunlukta olan eşit bağlantı kablolarına bölmek istiyor; kesme payı ihmal edilir.",
    parcaAdi: "bağlantı kablosu",
    kamaSorusu: "Buna göre bu kablodan en fazla kaç tam bağlantı kablosu elde edilir?",
    kesmeCumlesi: "Teknisyen bu kablodan verilen uzunlukta bir parça kesmiştir.",
    kalanSorusu: "Buna göre kablonun kalan parçası kaç santimetredir?",
  },
];

function olcumBaglami(b: OlcumBaglami): string {
  return (
    `${b.tanitim}; cetvelin her santimetresi eş parçalara bölünmüştür ve ${b.nesne} 0'dan başlamamaktadır. ` +
    "Konumları ve uzunluğu metne YAZMA: öğrenci cetvelden okur."
  );
}

function nesneCizimi(nesne: string, bolme: number, [b, e]: [number, number]) {
  return {
    tip: "cetvel_olcum" as const,
    cetvel: { uzunluk: UZUNLUK, bolme, nesneler: [{ ad: nesne, baslangic: { pay: b, payda: bolme }, bitis: { pay: e, payda: bolme } }] },
  };
}

/** Kesirli bir uzunluğun (bölme sayısı / bolme) bir parçaya bölümünün tam kısmı. */
function kacTane(bolmeSayisi: number, bolme: number, parca: Kesir): number {
  return Math.floor((bolmeSayisi * parca.payda) / (bolme * parca.pay));
}

/** references/senaryo-kalite-referans-v2.md — cetvel_olcum HEDEF MODEL: okunan uzunluk ÷ kama (6. sınıf). */
function kamaBolme(r: Rastgele): Uretim {
  const bg = r.sec(OLCUM_BAGLAMLARI);
  const bolme = r.sec([2, 4]);
  const konum = citaKonumu(r, bolme, 2);
  if (!konum) return undefined;
  const [b, e] = konum;
  const kama: Kesir = r.sec([{ pay: 7, payda: 8 }, { pay: 3, payda: 4 }, { pay: 5, payda: 8 }, { pay: 1, payda: 2 }, { pay: 3, payda: 8 }]);
  const tam = kacTane(e - b, bolme, kama);
  if (tam < 2 || tam > 12) return undefined;
  const adet = (x: number) => `${x} ${bg.parcaAdi}`;
  const secenekler = siklar(r, adet(tam), [
    { metin: adet(kacTane(e, bolme, kama)), hata: "bitisiUzunlukSanma" }, // 0'dan başlıyormuş gibi bitişi okumak
    { metin: adet(tam + 1), hata: "yukariYuvarlama" },
    { metin: adet(kacTane(e - b + 1, bolme, kama)), hata: "cizgiSayma" }, // aralık yerine çizgi saymak
    { metin: adet(tam - 1), hata: "birEksik" },
  ]);
  if (!secenekler) return undefined;
  const uzunluk = o(e - b, bolme);
  return {
    cizim: nesneCizimi(bg.nesne, bolme, konum),
    cikarim: metinPlani({
      baglam: `${olcumBaglami(bg)} ${bg.bolmeCumlesi}`,
      konu: bg.konu,
      ornekSoru: bg.kamaSorusu,
      veriler: [{ ad: `bir ${bg.parcaAdi} için gereken uzunluk (cm)`, deger: kama }],
      anahtarIfadeler: [["cetvel"], [bg.parcaAdi.split(" ")[0]]],
      kokIfadeleri: [["en fazla"]],
      ipucu: `${bg.nesne} ${yaz(o(b, bolme))} → ${yaz(o(e, bolme))}: ${yaz(uzunluk)} cm; ${yaz(uzunluk)} ÷ ${ham(kama.pay, kama.payda)} → en fazla ${tam}`,
      cozum:
        `${bg.nesneBuyuk} ${yaz(o(b, bolme))} cm çizgisinden ${yaz(o(e, bolme))} cm çizgisine uzanır: ${yaz(o(e, bolme))} − ` +
        `${yaz(o(b, bolme))} = ${yaz(uzunluk)} cm. ${yaz(uzunluk)} ÷ ${ham(kama.pay, kama.payda)} işleminin tam kısmı ${tam} ` +
        `olduğundan en fazla ${tam} tam ${bg.parcaAdi} elde edilir.`,
      secenekler,
    }),
  };
}

/** 5. sınıf karşılığı: okunan uzunluktan kesirli bir parça kesildikten sonra kalan. */
function kalanParca(r: Rastgele): Uretim {
  const bg = r.sec(OLCUM_BAGLAMLARI);
  const bolme = r.sec([2, 4]);
  const konum = citaKonumu(r, bolme, 3);
  if (!konum) return undefined;
  const [b, e] = konum;
  const k = r.aralik(bolme + 1, e - b - 2);
  if (k % bolme === 0 || e - b - k < 2) return undefined;
  const kesilen: Kesir = { tam: Math.floor(k / bolme), pay: k % bolme, payda: bolme };
  const cm = (bolmeSayisi: number) => `${yaz(o(bolmeSayisi, bolme))} cm`;
  const kalan = e - b - k;
  const secenekler = siklar(r, cm(kalan), [
    { metin: cm(e - k), hata: "bitisiUzunlukSanma" },
    { metin: cm(kalan + 1), hata: "cizgiSayma" }, // aralık yerine çizgi saymak
    { metin: cm(e - b + k), hata: "toplama" },
    { metin: cm(kalan - 1), hata: "birBolmeEksik" },
    { metin: cm(e - b), hata: "kesmeyiUnutma" },
  ]);
  if (!secenekler) return undefined;
  return {
    cizim: nesneCizimi(bg.nesne, bolme, konum),
    cikarim: metinPlani({
      baglam: `${olcumBaglami(bg)} ${bg.kesmeCumlesi}`,
      konu: bg.konu,
      ornekSoru: bg.kalanSorusu,
      veriler: [{ ad: "kesilen parçanın uzunluğu (cm)", deger: kesilen }],
      anahtarIfadeler: [["cetvel"]],
      kokIfadeleri: [["kaç santimetre", "kaç cm"], ["kal"]],
      ipucu: `${bg.nesne} ${yaz(o(b, bolme))} → ${yaz(o(e, bolme))}: ${yaz(o(e - b, bolme))} cm; ${yaz(o(e - b, bolme))} − ${yaz(o(k, bolme))} = ${cm(kalan)}`,
      cozum:
        `${bg.nesneBuyuk} ${yaz(o(b, bolme))} cm çizgisinden ${yaz(o(e, bolme))} cm çizgisine uzanır: ${yaz(o(e - b, bolme))} cm. ` +
        `Kesilen parça çıkarılınca ${yaz(o(e - b, bolme))} − ${yaz(o(k, bolme))} = ${cm(kalan)} kalır.`,
      secenekler,
    }),
  };
}

const URETICILER: Record<CetvelOlcumGorevi, (r: Rastgele) => Uretim> = { kamaBolme, kalanParca };

/** Deterministik: aynı tohum aynı planı verir; koşulları sağlamayan tohumlar atlanır. */
export function cetvelOlcumPlaniUret(gorev: CetvelOlcumGorevi, tohum: number): PlanliGorselPlan<CizimPlaniOf<"cetvel_olcum">> {
  for (let deneme = 0; ; deneme += 1) {
    const plan = URETICILER[gorev](rastgeleOlustur(tohum + deneme * 1013));
    if (plan) return plan;
  }
}

// ---------------------------------------------------------------------------
// Tanım
// ---------------------------------------------------------------------------

function gorevTanimi(
  gorev: CetvelOlcumGorevi,
  tanim: Pick<GorselSoruGorevTanimi<"cetvel_olcum">, "etiket" | "aciklama" | "kurallar" | "ornekCikarim" | "ornekCizim" | "enAzSinif"> & {
    ornek: { senaryo: string; soru: string };
  }
): GorselSoruGorevTanimi<"cetvel_olcum"> {
  return {
    ...tanim,
    gorev,
    kesirKonusuGerekir: true,
    semaAciklamasi: PLANLI_GORSEL_SEMA_ACIKLAMASI,
    ornek: { tip: "cetvel_olcum", veri: { gorev, ...tanim.ornek } },
    jsonSemasi: planliGorselSema(gorev),
  };
}

const gorevler: GorselSoruTanimi<"cetvel_olcum">["gorevler"] = {
  kamaBolme: gorevTanimi("kamaBolme", {
    etiket: "Okunan uzunluğu kesirli parçalara bölme (en fazla kaç tane)",
    aciklama:
      "Öğrenci çıtanın başlangıç ve bitişini cetvelden kesirle okuyup uzunluğunu bulur, sonra bu uzunluğu verilen kesirli " +
      "kama uzunluğuna böler ve en fazla kaç tam kama çıktığını bulur. Bitişi uzunluk sanmak ve aralık yerine çizgi " +
      "saymak tipik hatalardır.",
    enAzSinif: 6,
    kurallar: ["Çıtanın konumlarını ve uzunluğunu metne yazma; yalnızca kama uzunluğunu yaz."],
    ornek: {
      senaryo:
        "Bir marangoz çırağı, uzunluğu şekildeki cetvelde gösterilen çıtayı, her biri 7/8 cm olan eşit kamalara bölmek " +
        "istiyor. Kesme payı ihmal edilmektedir.",
      soru: "Buna göre bu çıtadan en fazla kaç tam kama elde edilir?",
    },
    ornekCizim: {
      tip: "cetvel_olcum",
      cetvel: { uzunluk: 10, bolme: 4, nesneler: [{ ad: "çıta", baslangic: { pay: 13, payda: 4 }, bitis: { pay: 27, payda: 4 } }] },
    },
    ornekCikarim: metinPlani({
      baglam: "Çırak, cetvelden okunan çıtayı verilen uzunlukta eşit kamalara bölecektir; kesme payı ihmal edilir.",
      konu: "atölye",
      ornekSoru: "Buna göre bu çıtadan en fazla kaç tam kama elde edilir?",
      veriler: [{ ad: "bir kama için gereken uzunluk (cm)", deger: { pay: 7, payda: 8 } }],
      anahtarIfadeler: [["cetvel"], ["kama"]],
      kokIfadeleri: [["en fazla"]],
      ipucu: "çıta 3 1/4 → 6 3/4: 3 1/2 cm; 3 1/2 ÷ 7/8 = 4",
      cozum:
        "Çıta 3 1/4 cm çizgisinden 6 3/4 cm çizgisine uzanır: 6 3/4 − 3 1/4 = 3 1/2 cm. 3 1/2 ÷ 7/8 = 7/2 × 8/7 = 4 " +
        "olduğundan en fazla 4 tam kama elde edilir.",
      secenekler: [
        { metin: "3 kama", hata: "birEksik" },
        { metin: "4 kama" },
        { metin: "5 kama", hata: "yukariYuvarlama" },
        { metin: "7 kama", hata: "bitisiUzunlukSanma" },
      ],
    }),
  }),
  kalanParca: gorevTanimi("kalanParca", {
    etiket: "Okunan uzunluktan parça kesme (kalan)",
    aciklama:
      "Öğrenci çıtanın başlangıç ve bitişini cetvelden kesirle okuyup uzunluğunu bulur, sonra verilen kesirli parçayı " +
      "çıkararak kalan uzunluğu bulur. Bitişi uzunluk sanmak ve aralık yerine çizgi saymak tipik hatalardır.",
    kurallar: ["Çıtanın konumlarını ve uzunluğunu metne yazma; yalnızca kesilen parçanın uzunluğunu yaz."],
    ornek: {
      senaryo: "Bir çıta şekildeki cetvelin üzerine konmuştur. Bir marangoz bu çıtadan 1 3/4 cm uzunluğunda bir parça kesmiştir.",
      soru: "Buna göre çıtanın kalan parçası kaç santimetredir?",
    },
    ornekCizim: {
      tip: "cetvel_olcum",
      cetvel: { uzunluk: 10, bolme: 4, nesneler: [{ ad: "çıta", baslangic: { pay: 6, payda: 4 }, bitis: { pay: 29, payda: 4 } }] },
    },
    ornekCikarim: metinPlani({
      baglam: "Marangoz, cetvelden okunan çıtadan verilen uzunlukta bir parça keser.",
      konu: "atölye",
      ornekSoru: "Buna göre çıtanın kalan parçası kaç santimetredir?",
      veriler: [{ ad: "kesilen parçanın uzunluğu (cm)", deger: { tam: 1, pay: 3, payda: 4 } }],
      anahtarIfadeler: [["cetvel"]],
      kokIfadeleri: [["kaç santimetre", "kaç cm"], ["kal"]],
      ipucu: "çıta 1 1/2 → 7 1/4: 5 3/4 cm; 5 3/4 − 1 3/4 = 4 cm",
      cozum: "Çıta 1 1/2 cm çizgisinden 7 1/4 cm çizgisine uzanır: 5 3/4 cm. Kesilen parça çıkarılınca 5 3/4 − 1 3/4 = 4 cm kalır.",
      secenekler: [
        { metin: "4 cm" },
        { metin: "5 1/2 cm", hata: "bitisiUzunlukSanma" },
        { metin: "4 1/4 cm", hata: "cizgiSayma" },
        { metin: "7 1/2 cm", hata: "toplama" },
      ],
    }),
  }),
};

export const cetvelOlcumTanimi: GorselSoruTanimi<"cetvel_olcum"> = {
  tip: "cetvel_olcum",
  etiket: "Cetvel / ölçüm modeli",
  aciklama:
    "Her santimetresi eş parçalara bölünmüş bir cetvel ve üstünde ölçülen nesneler. Sistem cetveli ve nesnelerin " +
    "konumlarını plandan çizer, doğru cevabı kendisi hesaplar; öğrenci konumları kesirle okuyup uzunluk bulur.",
  gorselKategorisi: "fonksiyonel",
  gorselStratejisi: "svg",
  kesirKonusuGerekir: true,
  kurallar: [
    "Bağlam bir ölçümdür (kalem, silgi, ataş). Konumlar CETVELDE görünür; bunları ve uzunlukları metne yazma (sistem " +
      "metindeki plan dışı sayıları reddeder).",
    "Metin 1-2 kısa cümle olsun.",
  ],
  // references/senaryo-kalite-referans-v2.md — TYMM HEDEF / RET modelleri.
  hedefSeviyeOrnekleri: [
    "HEDEF: \"Bir marangoz çırağı, uzunluğu görseldeki cetvel üzerinde gösterilen çıtayı her biri 7/8 cm olan kamalara " +
      "bölmek istiyor. Kesme payı ihmal edildiğinde en fazla kaç tam kama elde edilir?\" → 6 3/4 − 3 1/4 = 7/2; " +
      "7/2 ÷ 7/8 = 4 (cetvelden kesirli uzunluk okuma + kesirle bölme).",
    "RET (yazma): \"Silgi tebeşirden kaç cm uzundur?\" — iki boyu okuyup çıkarmaktan ibaret, kesir ölçümün odağında değil.",
  ],
  ortakSemaAciklamasi: [],
  gorevler,
  dogrula: (raw, path, sorunlar, plan) =>
    planliGorselDogrula(
      raw,
      path,
      sorunlar,
      plan,
      // "0'dan başlamamaktadır" ifadesindeki 0 serbesttir.
      { gorevler: CETVEL_OLCUM_GOREVLERI, cizimTipi: "cetvel_olcum", serbestSayilar: (cizim) => [0, cizim.cetvel.nesneler.length] },
      (ortak, cizim): CetvelOlcumVerisi => ({ ...ortak, cetvel: cizim.cetvel })
    ),
  dogruCevapMetni: planliDogruCevapMetni,
};
