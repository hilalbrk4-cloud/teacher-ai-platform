import {
  ISLEM_SEMBOLLERI,
  esitMi,
  islemUygula,
  kesirGosterimi,
  oranMetni,
  oranYap,
  pozitifMi,
  tamSayiMi,
  type IslemTuru,
  type Oran,
} from "@/lib/quiz-generator/gorsel-sorular/kesir-aritmetigi";
import {
  JSON_BOS_OLABILIR_METIN,
  JSON_KESIR,
  JSON_METIN,
  dogruSecenegiDogrula,
  isRecord,
  jsonDizi,
  jsonGorev,
  jsonNesne,
  jsonSecim,
  metindekiKesirler,
  metniNormallestir,
  okuIstegeBagliMetin,
  okuKesir,
  okuKimlikliDizi,
  okuMetin,
  okuSecim,
  secenekHarfi,
  yokMu,
  type GorselSoruDogrulamaSonucu,
  type GorselSoruGorevTanimi,
  type GorselSoruSorunu,
  type GorselSoruTanimi,
  type JsonSemasi,
} from "@/lib/quiz-generator/gorsel-sorular/ortak";
import {
  CIKARIM_GOREVLERI,
  SENARYO_GOREVLERI,
  SENARYO_SAHNELERI,
  type CikarimGorevi,
  type GercekHayatSenaryoVerisi,
  type GorselSoruPlani,
  type Kesir,
  type MetinSecenegi,
  type SenaryoGorevi,
  type SayisalGorevi,
  type SenaryoCikarimPlani,
  type SenaryoSahnesi,
  type SenaryoSayilari,
} from "@/types/gorsel-soru";

type Sorunlar = GorselSoruSorunu[];
type Sonuc = GorselSoruDogrulamaSonucu<GercekHayatSenaryoVerisi> | undefined;

const SECENEK_SINIRI = { min: 3, max: 5 };
const HESAP_SINIRI = { min: 2, max: 8 };
const SENARYO_EN_KISA = 60;
const EN_FAZLA_CUMLE = 5;
const EN_AZ_ISLEM_ADIMI = 2;

const ISLEMLER: readonly IslemTuru[] = ["topla", "cikar", "carp", "bol", "asagiYuvarla", "yukariYuvarla"];

/** Çeldiricilerin temsil ettiği öğrenci hataları (kalite ölçütü 3). */
export const HATA_TURLERI = [
  "tersCevirme",
  "birFazla",
  "birEksik",
  "yanlisIslem",
  "adimAtlama",
  "yuvarlama",
  "birimHatasi",
  "yakinDeger",
] as const;

type SayisalGorev = SayisalGorevi;

function cikarimGoreviMi(gorev: SenaryoGorevi): gorev is CikarimGorevi {
  return (CIKARIM_GOREVLERI as readonly string[]).includes(gorev);
}

// ---------------------------------------------------------------------------
// Ortak yardımcılar
// ---------------------------------------------------------------------------

function sahneOku(value: unknown): SenaryoSahnesi {
  // Sahne yalnızca dekoratiftir: tanınmayan bir değer soruyu geçersiz
  // kılmaz, nötr "genel" sahneye düşer.
  return typeof value === "string" && (SENARYO_SAHNELERI as readonly string[]).includes(value)
    ? (value as SenaryoSahnesi)
    : "genel";
}

/** Metindeki kesir OLMAYAN tam sayılar ("28 öğrenci"); "2 2/5" ve "24,5" gibi yazımlar sayılmaz. */
function metindekiTamSayilar(metin: string): number[] {
  const kesirsiz = metin.replace(/(?:\d+\s+(?:tam\s+)?)?\d+\s*\/\s*\d+/g, " ");
  return Array.from(kesirsiz.matchAll(/\d+(?:[.,]\d+)?/g))
    .map((eslesme) => eslesme[0])
    .filter((sayi) => !/[.,]/.test(sayi))
    .map(Number);
}

const SAYI_SOZCUKLERI: Record<number, string> = {
  2: "iki",
  3: "üç",
  4: "dört",
  5: "beş",
  6: "altı",
  7: "yedi",
  8: "sekiz",
  9: "dokuz",
  10: "on",
  12: "on iki",
};

/** Bir değer senaryoda (rakamla, kesir olarak ya da "iki", "yarım", "çeyrek" gibi sözcükle) geçiyor mu? */
function senaryodaGeciyorMu(senaryo: string, deger: Oran): boolean {
  if (metindekiKesirler(senaryo).some((bulunan) => esitMi(oranYap(bulunan.kesir), deger))) return true;
  if (tamSayiMi(deger) && metindekiTamSayilar(senaryo).includes(deger.pay)) return true;
  const metin = metniNormallestir(senaryo);
  const sozcuk = tamSayiMi(deger) ? SAYI_SOZCUKLERI[deger.pay] : undefined;
  if (sozcuk && new RegExp(`(^|[^a-zçğıöşü])${sozcuk}([^a-zçğıöşü]|$)`).test(metin)) return true;
  if (esitMi(deger, { pay: 1, payda: 2 }) && /yarı/.test(metin)) return true;
  if (esitMi(deger, { pay: 1, payda: 4 }) && metin.includes("çeyrek")) return true;
  return false;
}

function cumleSayisi(metin: string): number {
  return metin.split(/[.!?]+(?:\s|$)/).filter((cumle) => cumle.trim().length > 0).length;
}

function ortakMetinDenetimi(senaryo: string, soru: string, path: string, sorunlar: Sorunlar): boolean {
  if (senaryo.length < SENARYO_EN_KISA) {
    sorunlar.push({ path: `${path}.senaryo`, message: `"senaryo" en az ${SENARYO_EN_KISA} karakter olmalıdır.` });
    return false;
  }
  if (cumleSayisi(senaryo) > EN_FAZLA_CUMLE) {
    sorunlar.push({
      path: `${path}.senaryo`,
      message: `Senaryo en fazla ${EN_FAZLA_CUMLE} cümle olmalı; çözüme katkısı olmayan cümleler çıkarılmalı.`,
    });
    return false;
  }
  // Kalite ölçütü 5: tek net soru — ve o soru yalnızca soru kökünde sorulur.
  if ((soru.match(/\?/g) ?? []).length > 1) {
    sorunlar.push({ path: `${path}.soru`, message: "Soru kökü tek bir soru sormalıdır." });
    return false;
  }
  if (senaryo.includes("?")) {
    sorunlar.push({ path: `${path}.senaryo`, message: "Senaryo soru cümlesi içermemeli; soru yalnızca \"soru\" alanında sorulur." });
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Sayısal görevler: cevabı kod hesaplar
// ---------------------------------------------------------------------------

interface HesapGirdisi {
  deger: Oran;
  /** Çözümde gösterilecek biçim: senaryodaki yazım (32/5) ya da önceki adımın sonucu. */
  gosterim: string;
  /** Senaryodan alınan bir sayı mı (önceki bir adımın sonucu değil)? */
  veridenMi: boolean;
}

interface HesapAdimi {
  id: string;
  aciklama: string;
  islem: IslemTuru;
  girdiler: HesapGirdisi[];
  sonuc: Oran;
}

const GIRDI_SAYISI: Record<IslemTuru, { min: number; max: number }> = {
  topla: { min: 2, max: 5 },
  carp: { min: 2, max: 5 },
  cikar: { min: 2, max: 2 },
  bol: { min: 2, max: 2 },
  asagiYuvarla: { min: 1, max: 1 },
  yukariYuvarla: { min: 1, max: 1 },
};

/**
 * Modelin yazdığı işlem adımlarını kesin kesir aritmetiğiyle yeniden
 * hesaplar. Model hiçbir sonucu "söylemekle" doğru yapamaz: her ara sonucu
 * ve cevabı kod bulur; modelin yazdığı sonuçlar hesaba hiç girmez.
 */
function hesabiDogrula(value: unknown, senaryo: string, path: string, sorunlar: Sorunlar): HesapAdimi[] | undefined {
  if (!Array.isArray(value) || value.length < HESAP_SINIRI.min || value.length > HESAP_SINIRI.max) {
    sorunlar.push({
      path,
      message: `"hesap" ${HESAP_SINIRI.min}-${HESAP_SINIRI.max} adımlı olmalı; cevap tek bir işlemle bulunmamalı.`,
    });
    return undefined;
  }

  const adimlar: HesapAdimi[] = [];
  for (const [index, ham] of value.entries()) {
    const adimPath = `${path}[${index}]`;
    if (!isRecord(ham)) {
      sorunlar.push({ path: adimPath, message: "Her adım bir JSON nesnesi olmalıdır." });
      return undefined;
    }
    const id = okuMetin(ham, "id", adimPath, sorunlar);
    const aciklama = okuMetin(ham, "aciklama", adimPath, sorunlar);
    const islem = okuSecim(ham, "islem", ISLEMLER, adimPath, sorunlar);
    // Modelin ara sonucu yalnızca biçim olarak denetlenir: sonraki adımlar
    // KODUN sonucunu kullanır, çözüm metni koddan üretilir. Reddetmeye karar
    // veren tek karşılaştırma, modelin işaretlediği şık ile kodun cevabıdır
    // (bkz. dogrulaSayisal) — referans: "modelin cevabı ≠ kodun hesabı".
    const sonucBicimiGecerli = okuKesir(ham.sonuc, `${adimPath}.sonuc`, sorunlar) !== undefined;
    if (!id || !aciklama || !islem || !sonucBicimiGecerli) return undefined;
    if (adimlar.some((adim) => adim.id === id)) {
      sorunlar.push({ path: `${adimPath}.id`, message: `Tekrarlanan adım id'si: ${id}` });
      return undefined;
    }

    const hamGirdiler = Array.isArray(ham.girdiler) ? ham.girdiler : [];
    const sinir = GIRDI_SAYISI[islem];
    if (hamGirdiler.length < sinir.min || hamGirdiler.length > sinir.max) {
      sorunlar.push({ path: `${adimPath}.girdiler`, message: `"${islem}" ${sinir.min}-${sinir.max} girdi alır.` });
      return undefined;
    }

    const girdiler: HesapGirdisi[] = [];
    for (const [girdiIndex, girdi] of hamGirdiler.entries()) {
      const girdiPath = `${adimPath}.girdiler[${girdiIndex}]`;
      if (!isRecord(girdi)) {
        sorunlar.push({ path: girdiPath, message: 'Her girdi {"adimId","deger"} nesnesi olmalıdır.' });
        return undefined;
      }
      if (typeof girdi.adimId === "string" && girdi.adimId.trim()) {
        const onceki = adimlar.find((adim) => adim.id === girdi.adimId);
        if (!onceki) {
          sorunlar.push({ path: `${girdiPath}.adimId`, message: `"${girdi.adimId}" daha önceki bir adımın id'si olmalıdır.` });
          return undefined;
        }
        girdiler.push({ deger: onceki.sonuc, gosterim: oranMetni(onceki.sonuc), veridenMi: false });
        continue;
      }
      const kesir = yokMu(girdi.deger) ? undefined : okuKesir(girdi.deger, `${girdiPath}.deger`, sorunlar);
      if (!kesir) {
        sorunlar.push({ path: girdiPath, message: "Girdi ya önceki bir adıma (adimId) ya da bir sayıya (deger) işaret etmelidir." });
        return undefined;
      }
      const deger = oranYap(kesir);
      // Kalite ölçütü 4: hesap yalnızca senaryodaki verileri kullanır (±1 için 1 serbesttir).
      if (!esitMi(deger, { pay: 1, payda: 1 }) && !senaryodaGeciyorMu(senaryo, deger)) {
        sorunlar.push({
          path: `${girdiPath}.deger`,
          message: `Hesaptaki ${kesirGosterimi(kesir)} senaryoda geçmiyor; tüm veriler senaryoda rakamla verilmelidir.`,
        });
        return undefined;
      }
      girdiler.push({ deger, gosterim: kesirGosterimi(kesir), veridenMi: true });
    }

    let sonuc = islemUygula(
      islem,
      girdiler.map((girdi) => girdi.deger)
    );
    // "Farkı" yazarken eksilen ile çıkanı ters sıraya koymak bir yazım
    // kaymasıdır; sonuç negatifse sıra düzeltilir. Cevabı yine kod hesaplar
    // ve modelin işaretlediği şıkla karşılaştırır.
    if (islem === "cikar" && sonuc && sonuc.pay < 0) {
      girdiler.reverse();
      sonuc = islemUygula(
        islem,
        girdiler.map((girdi) => girdi.deger)
      );
    }
    if (!sonuc) {
      sorunlar.push({ path: adimPath, message: "Sıfıra bölme." });
      return undefined;
    }
    if (!pozitifMi(sonuc)) {
      sorunlar.push({ path: adimPath, message: `Adım ${id} sıfır veya negatif bir sonuç veriyor (${oranMetni(sonuc)}).` });
      return undefined;
    }
    adimlar.push({ id, aciklama, islem, girdiler, sonuc });
  }

  // Kalite ölçütü 4 (bağlam işe dâhil): senaryodaki HER sayı hesapta
  // kullanılmalı. Kullanılmayan bir sayı ya alakasız veridir ya da metnin
  // anlattığı işlemle hesabın ayrıştığını gösterir (gerçek çıktı: "3 gün
  // boyunca günde 3/5" yazıp 3'ü hiç kullanmamak).
  const kullanilanlar = adimlar.flatMap((adim) => adim.girdiler.filter((girdi) => girdi.veridenMi).map((girdi) => girdi.deger));
  const senaryodakiSayilar = [
    ...metindekiKesirler(senaryo).map((bulunan) => ({ metin: bulunan.metin, deger: oranYap(bulunan.kesir) })),
    ...metindekiTamSayilar(senaryo).map((n) => ({ metin: String(n), deger: { pay: n, payda: 1 } })),
  ];
  const kullanilmayan = senaryodakiSayilar.find((sayi) => !kullanilanlar.some((deger) => esitMi(deger, sayi.deger)));
  if (kullanilmayan) {
    sorunlar.push({
      path: `${path}.senaryo`,
      message: `Senaryodaki ${kullanilmayan.metin} çözümde hiç kullanılmıyor; senaryoda yalnızca çözümde kullanılan sayılar olmalı.`,
    });
    return undefined;
  }

  // Kalite ölçütü 2: en az bir kesir işlemi.
  const kesirIslemiVar = adimlar.some(
    (adim) => !tamSayiMi(adim.sonuc) || adim.girdiler.some((girdi) => !tamSayiMi(girdi.deger))
  );
  if (!kesirIslemiVar) {
    sorunlar.push({ path, message: "Çözüm en az bir kesir işlemi içermelidir." });
    return undefined;
  }
  return adimlar;
}

function yuvarlamaMi(adim: HesapAdimi | undefined): boolean {
  return adim?.islem === "asagiYuvarla" || adim?.islem === "yukariYuvarla";
}

interface SayisalGorevKurali {
  /** Sonuç sayılan bir nesne mi (gömlek, engel, öğrenci)? */
  tamSayiSonuc: boolean;
  /** Her ara sonuç da tam sayı olmalı mı (ör. kişi sayıları)? */
  araSonuclarTamSayi?: boolean;
  /** Görevin gerektirdiği işlem yapısı; ihlal varsa hata mesajı döner. */
  yapi(soru: { hesap: HesapAdimi[]; soru: string; senaryo: string }): string | undefined;
}

const SAYISAL_KURALLAR: Record<SayisalGorev, SayisalGorevKurali> = {
  bolmeEnFazla: {
    tamSayiSonuc: true,
    yapi: ({ hesap, soru }) => {
      const son = hesap[hesap.length - 1];
      if (!hesap.some((adim) => adim.islem === "bol")) return "Bu görev bir kesir bölmesi gerektirir.";
      if (!yuvarlamaMi(son)) return "Son adım aşağı ya da yukarı yuvarlama olmalıdır.";
      const kok = metniNormallestir(soru);
      if (son.islem === "asagiYuvarla" && !kok.includes("en fazla")) return 'Aşağı yuvarlama "en fazla" sorusuyla sorulmalıdır.';
      if (son.islem === "yukariYuvarla" && !kok.includes("en az")) return 'Yukarı yuvarlama "en az" sorusuyla sorulmalıdır.';
      return undefined;
    },
  },
  birimOlcekleme: {
    tamSayiSonuc: false,
    yapi: ({ hesap }) =>
      hesap.some((adim) => adim.islem === "bol") && hesap.some((adim) => adim.islem === "carp")
        ? undefined
        : "Önce bölerek bir birimin değeri bulunmalı, sonra çarpılarak istenen değere ölçeklenmelidir.",
  },
  araliklar: {
    tamSayiSonuc: true,
    yapi: ({ hesap, senaryo }) => {
      // Kurgu sabittir: uçlarda nesne yok. Senaryo bunu açıkça söylemeli.
      const metin = metniNormallestir(senaryo);
      if (!metin.includes("başlangıç") || !metin.includes("bitiş")) {
        return "Senaryo, ilk nesnenin başlangıç çizgisine ve son nesnenin bitiş çizgisine uzaklığını açıkça belirtmelidir.";
      }
      if (!hesap.some((adim) => adim.islem === "bol")) return "Aralık sayısı bölmeyle bulunmalıdır.";
      const birDuzeltmesi = hesap.some(
        (adim) =>
          (adim.islem === "topla" || adim.islem === "cikar") &&
          adim.girdiler.some((girdi) => girdi.veridenMi && esitMi(girdi.deger, { pay: 1, payda: 1 }))
      );
      return birDuzeltmesi ? undefined : "Aralık sayısından nesne sayısına geçerken ±1 düzeltmesi yapılmalıdır.";
    },
  },
  kalaniBulma: {
    tamSayiSonuc: true,
    yapi: ({ hesap }) =>
      hesap.filter((adim) => adim.islem === "carp").length >= 2 && hesap.some((adim) => adim.islem === "cikar")
        ? undefined
        : "Her parça bütünle çarpılarak bulunmalı (iki çarpma), sonra bütünden çıkarılmalıdır.",
  },
  coklugunKesri: {
    tamSayiSonuc: true,
    araSonuclarTamSayi: true,
    yapi: ({ hesap }) =>
      hesap.some((adim) => adim.islem === "carp" && adim.girdiler.some((girdi) => !tamSayiMi(girdi.deger)))
        ? undefined
        : "Bir çokluğun kesri (çokluk × kesir) hesaplanmalıdır.",
  },
  parcaButun: {
    tamSayiSonuc: false,
    yapi: ({ hesap }) => {
      // Aile 1'in asıl inceliği: kişi sayısına kendisi de eklenir (… + 1).
      const kendisiEklendi = hesap.some(
        (adim) =>
          adim.islem === "topla" &&
          adim.girdiler.some((girdi) => girdi.veridenMi && esitMi(girdi.deger, { pay: 1, payda: 1 }))
      );
      if (!kendisiEklendi) return "Kişi sayısına kendisi de eklenmelidir (arkadaş sayısı + 1).";
      return hesap[hesap.length - 1].islem === "bol"
        ? undefined
        : "Son adım, kullanılan parça sayısının toplam parça sayısına bölünmesi olmalıdır.";
    },
  },
  karsilastirma: {
    tamSayiSonuc: true,
    yapi: ({ hesap }) =>
      hesap.filter((adim) => adim.islem === "carp").length >= 2 && hesap[hesap.length - 1].islem === "cikar"
        ? undefined
        : "Her miktar kendi bütünüyle çarpılarak bulunmalı (iki çarpma), sonuç bir fark (çıkarma) olmalıdır.",
  },
};

function hesaptanCozum(hesap: HesapAdimi[], birim: string | undefined): string {
  const adimlar = hesap.map((adim) => {
    if (adim.islem === "asagiYuvarla" || adim.islem === "yukariYuvarla") {
      return `${adim.aciklama}: ${adim.girdiler[0].gosterim} → ${oranMetni(adim.sonuc)}.`;
    }
    const sembol = ISLEM_SEMBOLLERI[adim.islem];
    return `${adim.aciklama}: ${adim.girdiler.map((girdi) => girdi.gosterim).join(` ${sembol} `)} = ${oranMetni(adim.sonuc)}.`;
  });
  const son = hesap[hesap.length - 1].sonuc;
  return `${adimlar.join(" ")} Cevap: ${oranMetni(son)}${birim ? ` ${birim}` : ""}.`;
}

/** Gerçek çıktılarda görülen ya da sık yapılan dil bilgisi hataları. */
const DIL_HATALARI: readonly [RegExp, string][] = [
  [/(^|[^a-zçğıöşü])kesiri([^a-zçğıöşü]|$)/, '"kesiri" değil "kesri" yazılmalı'],
  [/(^|[^a-zçğıöşü])kesirin([^a-zçğıöşü]|$)/, '"kesirin" değil "kesrin" yazılmalı'],
  [/(^|[^a-zçğıöşü])kesire([^a-zçğıöşü]|$)/, '"kesire" değil "kesre" yazılmalı'],
  [/\d\s*\/\s*\d+\s+(ü|u|ı|i|si|sı|sü|su|ini|ını|ünü|unu)([^a-zçğıöşü]|$)/, "kesirden sonraki ek kesme işaretiyle bitişik yazılmalı (ör. 3/4'ü)"],
  [/oranında/, '"... oranında" yerine "...\'ü kadar" gibi doğal bir ifade kullanılmalı'],
];

function dilHatasi(...metinler: string[]): string | undefined {
  const metin = metniNormallestir(metinler.join(" "));
  return DIL_HATALARI.find(([desen]) => desen.test(metin))?.[1];
}

function dogrulaSayisal(
  gorev: SayisalGorev,
  raw: Record<string, unknown>,
  ortak: { senaryo: string; soru: string },
  path: string,
  sorunlar: Sorunlar,
  plan?: SenaryoSayilari
): Sonuc {
  // Bağlamı, sayıları ve şıkları kod planlar; plansız bir sayısal senaryo
  // (ör. eski bir kayıttan) cevabı garanti edilemeyeceği için kabul edilmez.
  if (!plan) {
    sorunlar.push({ path, message: "Bu görevin bağlamı, sayıları ve şıkları sistem tarafından planlanmalıdır." });
    return undefined;
  }
  const kural = SAYISAL_KURALLAR[gorev];
  // Öğrencinin gördüğü metin = senaryo + soru kökü. Bazı veriler (ör. "6
  // dakikada kaç litre?") planın örnek soru kökü gereği kökte geçer; sayı
  // denetimleri bu yüzden ikisini birlikte tarar.
  const metin = `${ortak.senaryo} ${ortak.soru}`;
  const hesap = hesabiDogrula(raw.hesap, metin, `${path}.hesap`, sorunlar);
  if (!hesap) return undefined;
  const sonuc = hesap[hesap.length - 1].sonuc;

  // Senaryo planın sayılarını kullanmalı ve hesap, kodun önceden bildiği
  // cevaba ulaşmalı — senaryonun anlattığı işlem ile planlanan işlem ancak
  // böyle birebir örtüşür.
  const eksik = plan.veriler.find((veri) => !senaryodaGeciyorMu(metin, oranYap(veri.deger)));
  if (eksik) {
    sorunlar.push({
      path: `${path}.senaryo`,
      message: `Sistemin verdiği ${kesirGosterimi(eksik.deger)} (${eksik.ad}) senaryoda geçmiyor; verilen sayıları aynen kullan.`,
    });
    return undefined;
  }
  const beklenen = oranYap(plan.cevap);
  if (!esitMi(sonuc, beklenen)) {
    sorunlar.push({
      path: `${path}.hesap`,
      message:
        `Hesabın sonucu ${oranMetni(sonuc)}, ama bu sayılarla doğru cevap ${oranMetni(beklenen)} ` +
        `(${plan.ipucu}). Senaryoyu ve hesabı bu ilişkiye göre kur.`,
    });
    return undefined;
  }

  // Çok adımlılık: en az bir çarpma ya da bölme ve görevin ek mantık adımı.
  if (!hesap.some((adim) => adim.islem === "carp" || adim.islem === "bol")) {
    sorunlar.push({ path: `${path}.hesap`, message: "Çözüm en az bir çarpma veya bölme işlemi içermelidir." });
    return undefined;
  }
  const yapiHatasi = kural.yapi({ hesap, soru: ortak.soru, senaryo: ortak.senaryo });
  if (yapiHatasi) {
    sorunlar.push({ path: `${path}.hesap`, message: yapiHatasi });
    return undefined;
  }
  // Tam sayı çıkması gereken yerde (kişi, gömlek, kutu) kesirli sonuç kabul edilmez.
  if (kural.tamSayiSonuc && !tamSayiMi(sonuc)) {
    sorunlar.push({ path: `${path}.hesap`, message: `Sonuç tam sayı olmalı, ${oranMetni(sonuc)} çıktı.` });
    return undefined;
  }
  if (kural.araSonuclarTamSayi) {
    const kesirli = hesap.find((adim) => !tamSayiMi(adim.sonuc));
    if (kesirli) {
      sorunlar.push({
        path: `${path}.hesap`,
        message: `Adım ${kesirli.id} kesirli bir sayı veriyor (${oranMetni(kesirli.sonuc)}); bu görevde her ara sonuç tam sayı olmalı.`,
      });
      return undefined;
    }
  }
  // Kalite ölçütü 1: cevap metinde açıkça verilmez.
  if (senaryodaGeciyorMu(metin, sonuc)) {
    sorunlar.push({
      path: `${path}.senaryo`,
      message: `Cevap (${oranMetni(sonuc)}) senaryoda zaten geçiyor; öğrenci işlem yapmadan cevabı okuyabilir.`,
    });
    return undefined;
  }

  const dil = dilHatasi(ortak.senaryo, ortak.soru);
  if (dil) {
    sorunlar.push({ path: `${path}.senaryo`, message: `Dil hatası: ${dil}.` });
    return undefined;
  }

  // Bağlamın asıl inceliği (ör. krokide "her kare aynı uzunluk", "tüm
  // elmaların" / "gelmeyenlerin") yazılmazsa soru eksik ya da iki anlamlı kalır.
  const normal = metniNormallestir(metin);
  const eksikIfade = plan.anahtarIfadeler?.find((grup) => !grup.some((ifade) => normal.includes(ifade)));
  if (eksikIfade) {
    sorunlar.push({
      path: `${path}.senaryo`,
      message: `Senaryo şu bilgiyi açıkça içermeli: "${eksikIfade[0]}" (veya ${eksikIfade.slice(1).map((i) => `"${i}"`).join(", ")}). Bağlam cümlesini atlama.`,
    });
    return undefined;
  }

  // Şıkları ve doğru cevabı kod üretir: her çeldirici, adı konmuş bir
  // öğrenci hatasının hesaplanmış sonucudur (bkz. senaryo-sayilari.ts).
  const secenekler = plan.secenekler.map((secenek, index) => ({
    id: secenekHarfi(index),
    metin: `${kesirGosterimi(secenek.deger)}${plan.birim ? ` ${plan.birim}` : ""}`,
    dogru: secenek.hata === undefined,
  }));
  const dogru = secenekler.find((secenek) => secenek.dogru);
  if (!dogru) {
    sorunlar.push({ path, message: "Planın şıkları arasında doğru cevap yok." });
    return undefined;
  }

  const veri: GercekHayatSenaryoVerisi = {
    gorev,
    sahne: sahneOku(raw.sahne),
    senaryo: ortak.senaryo,
    secenekler: secenekler.map(({ id, metin }) => ({ id, metin })),
    dogruSecenekId: dogru.id,
  };
  // Çözüm metni modelden değil, doğrulanmış hesaptan üretilir.
  return { soru: ortak.soru, cozum: hesaptanCozum(hesap, plan.birim), veri };
}

// ---------------------------------------------------------------------------
// Çıkarım görevleri (sıralama, "olabilir", "olamaz"): cevabı ve şıkları kod kurar
// ---------------------------------------------------------------------------

function dogrulaCikarim(
  gorev: CikarimGorevi,
  raw: Record<string, unknown>,
  ortak: { senaryo: string; soru: string },
  path: string,
  sorunlar: Sorunlar,
  plan?: SenaryoCikarimPlani
): Sonuc {
  // references/senaryo-kalite-referans-v2.md, Bölüm 5: doğru cevabı ve
  // şıkları kod hesaplar; plansız bir çıkarım sorusu kabul edilmez.
  if (!plan) {
    sorunlar.push({ path, message: "Bu görevin verileri, cevabı ve şıkları sistem tarafından planlanmalıdır." });
    return undefined;
  }
  const metin = `${ortak.senaryo} ${ortak.soru}`;
  const normal = metniNormallestir(metin);

  const eksik = plan.veriler.find((veri) => !senaryodaGeciyorMu(metin, oranYap(veri.deger)));
  if (eksik) {
    sorunlar.push({
      path: `${path}.senaryo`,
      message: `Sistemin verdiği ${kesirGosterimi(eksik.deger)} (${eksik.ad}) senaryoda geçmiyor; verilen sayıları aynen kullan.`,
    });
    return undefined;
  }
  // Planda olmayan bir sayı, şıklarla ya da cevapla çelişebilir (öğe sayısı ve 1 serbesttir).
  const planDegerleri = plan.veriler.map((veri) => oranYap(veri.deger));
  const serbest = [1, plan.veriler.length];
  const fazla = [
    ...metindekiKesirler(metin).map((bulunan) => ({ metin: bulunan.metin, deger: oranYap(bulunan.kesir) })),
    ...metindekiTamSayilar(metin).map((n) => ({ metin: String(n), deger: { pay: n, payda: 1 } })),
  ].find(
    (sayi) =>
      !planDegerleri.some((deger) => esitMi(deger, sayi.deger)) &&
      !(tamSayiMi(sayi.deger) && serbest.includes(sayi.deger.pay))
  );
  if (fazla) {
    sorunlar.push({
      path: `${path}.senaryo`,
      message: `Metindeki ${fazla.metin} sistemin verdiği verilerden biri değil; yalnızca verilen sayıları yaz.`,
    });
    return undefined;
  }
  const eksikAd = plan.adlar.find((ad) => !normal.includes(metniNormallestir(ad)));
  if (eksikAd) {
    sorunlar.push({ path: `${path}.senaryo`, message: `Senaryoda "${eksikAd}" adı aynen geçmeli; şıklar bu adlarla yazılır.` });
    return undefined;
  }
  const eksikIfade = plan.anahtarIfadeler.find((grup) => !grup.some((ifade) => normal.includes(ifade)));
  if (eksikIfade) {
    sorunlar.push({
      path: `${path}.senaryo`,
      message: `Senaryo şu bilgiyi açıkça içermeli: "${eksikIfade[0]}". Bağlam cümlesini atlama.`,
    });
    return undefined;
  }
  const kok = metniNormallestir(ortak.soru);
  const eksikKok = plan.kokIfadeleri.find((grup) => !grup.some((ifade) => kok.includes(ifade)));
  if (eksikKok) {
    sorunlar.push({ path: `${path}.soru`, message: `Soru kökü "${eksikKok[0]}" ifadesini içermeli (örnek soru kökünü izle).` });
    return undefined;
  }
  // Cevabı metinde vermemek: sıralama işaretleri ya da kartların arka yüzleri yazılmaz.
  if (gorev === "kesirSiralama" && /[<>]/.test(ortak.senaryo)) {
    sorunlar.push({ path: `${path}.senaryo`, message: "Senaryo sıralamayı (<, >) vermemeli; sıralamayı öğrenci bulur." });
    return undefined;
  }
  if (gorev === "denklikOlamaz" && metindekiKesirler(ortak.senaryo).some((bulunan) => bulunan.kesir.tam !== undefined)) {
    sorunlar.push({
      path: `${path}.senaryo`,
      message: "Senaryoda tam sayılı kesir yazılmamalı; dönüşümü öğrenci yapar (yalnızca bileşik kesirler verilir).",
    });
    return undefined;
  }
  const dil = dilHatasi(ortak.senaryo, ortak.soru);
  if (dil) {
    sorunlar.push({ path: `${path}.senaryo`, message: `Dil hatası: ${dil}.` });
    return undefined;
  }

  const secenekler = plan.secenekler.map((secenek, index) => ({
    id: secenekHarfi(index),
    metin: secenek.metin,
    dogru: secenek.hata === undefined,
  }));
  const dogru = secenekler.find((secenek) => secenek.dogru);
  if (!dogru) {
    sorunlar.push({ path, message: "Planın şıkları arasında doğru cevap yok." });
    return undefined;
  }
  const veri: GercekHayatSenaryoVerisi = {
    gorev,
    sahne: sahneOku(raw.sahne),
    senaryo: ortak.senaryo,
    secenekler: secenekler.map(({ id, metin: secenekMetni }) => ({ id, metin: secenekMetni })),
    dogruSecenekId: dogru.id,
  };
  return { soru: ortak.soru, cozum: plan.cozum, veri };
}

// ---------------------------------------------------------------------------
// Metinsel görev (kesir dışı konular): cevap hesaplanamaz
// ---------------------------------------------------------------------------

function dogrulaMetinsel(
  raw: Record<string, unknown>,
  ortak: { senaryo: string; soru: string; dogruSecenekId: string },
  path: string,
  sorunlar: Sorunlar
): Sonuc {
  const secenekler = okuKimlikliDizi<MetinSecenegi>(raw.secenekler, `${path}.secenekler`, sorunlar, SECENEK_SINIRI, (oge, id, ogePath) => {
    const metin = okuMetin(oge, "metin", ogePath, sorunlar);
    return metin ? { id, metin } : undefined;
  });
  const islemAdimlari = Array.isArray(raw.islemAdimlari)
    ? raw.islemAdimlari.filter((adim): adim is string => typeof adim === "string" && adim.trim().length > 0)
    : [];
  if (islemAdimlari.length < EN_AZ_ISLEM_ADIMI) {
    sorunlar.push({
      path: `${path}.islemAdimlari`,
      message: `Çözüm en az ${EN_AZ_ISLEM_ADIMI} çıkarım adımı gerektirmelidir.`,
    });
    return undefined;
  }
  if (!secenekler) return undefined;
  if (new Set(secenekler.map((secenek) => metniNormallestir(secenek.metin))).size !== secenekler.length) {
    sorunlar.push({ path: `${path}.secenekler`, message: "İki şıkkın metni aynı olamaz." });
    return undefined;
  }
  const tutarli = dogruSecenegiDogrula(secenekler, ortak.dogruSecenekId, (secenek) => secenek.id === ortak.dogruSecenekId, path, sorunlar);
  if (!tutarli) return undefined;

  const veri: GercekHayatSenaryoVerisi = {
    gorev: "cokAdimliCikarim",
    sahne: sahneOku(raw.sahne),
    senaryo: ortak.senaryo,
    secenekler,
    dogruSecenekId: ortak.dogruSecenekId,
  };
  return { soru: ortak.soru, cozum: okuIstegeBagliMetin(raw, "cozum") ?? islemAdimlari.join(" "), veri };
}

function dogrula(raw: unknown, path: string, sorunlar: Sorunlar, plan?: GorselSoruPlani): Sonuc {
  if (!isRecord(raw)) {
    sorunlar.push({ path, message: '"veri" bir JSON nesnesi olmalıdır.' });
    return undefined;
  }
  const gorev = okuSecim(raw, "gorev", SENARYO_GOREVLERI, path, sorunlar);
  const senaryo = okuMetin(raw, "senaryo", path, sorunlar);
  const soru = okuMetin(raw, "soru", path, sorunlar);
  if (!gorev || !senaryo || !soru) return undefined;
  if (!ortakMetinDenetimi(senaryo, soru, path, sorunlar)) return undefined;

  if (cikarimGoreviMi(gorev)) {
    return dogrulaCikarim(gorev, raw, { senaryo, soru }, path, sorunlar, plan?.cikarim);
  }
  if (gorev !== "cokAdimliCikarim") {
    return dogrulaSayisal(gorev, raw, { senaryo, soru }, path, sorunlar, plan?.sayilar);
  }
  // Metinsel görevde şıkları model yazar; doğru şıkkı da o işaretler.
  const dogruSecenekId = okuMetin(raw, "dogruSecenekId", path, sorunlar);
  if (!dogruSecenekId) return undefined;
  return dogrulaMetinsel(raw, { senaryo, soru, dogruSecenekId }, path, sorunlar);
}

function dogruCevapMetni(veri: GercekHayatSenaryoVerisi): string {
  const index = veri.secenekler.findIndex((secenek) => secenek.id === veri.dogruSecenekId);
  const secenek = veri.secenekler[index];
  return secenek ? `${secenekHarfi(index)}) ${secenek.metin}` : "";
}

// ---------------------------------------------------------------------------
// Şemalar
// ---------------------------------------------------------------------------

const BOS_OLABILIR_KESIR: JsonSemasi = { anyOf: [JSON_KESIR, { type: "null" }] };

function sayisalSema(gorev: SayisalGorev): JsonSemasi {
  // Şık alanı yok: şıkları ve doğru cevabı kod üretir (bkz. senaryo-sayilari.ts).
  return jsonNesne({
    gorev: jsonGorev(gorev),
    sahne: jsonSecim(SENARYO_SAHNELERI),
    senaryo: JSON_METIN,
    soru: JSON_METIN,
    hesap: jsonDizi(
      jsonNesne({
        id: JSON_METIN,
        aciklama: JSON_METIN,
        islem: jsonSecim(ISLEMLER),
        girdiler: jsonDizi(jsonNesne({ adimId: JSON_BOS_OLABILIR_METIN, deger: BOS_OLABILIR_KESIR })),
        sonuc: JSON_KESIR,
      })
    ),
  });
}

const SAYISAL_SEMA_ACIKLAMASI = [
  '"senaryo": SORU PLANI\'ndaki "Bağlam"ı kullanarak, verilen sayıların HEPSİNİ ve yalnızca onları içeren 2-4 ' +
    "cümlelik, akıcı bir metin. Sayıları rakamla ve planda verilen yazımla yaz.",
  '"soru": "Örnek soru kökü"ne benzeyen tek ve net bir soru cümlesi (sonu "?" ile biter).',
  '"hesap": Çözümün 2-8 adımı; her adım {"id","aciklama","islem","girdiler","sonuc"}. ' +
    `"islem" şunlardan biri: ${ISLEMLER.join(", ")}. topla/carp en az 2, cikar/bol tam 2, yuvarlama 1 girdi alır. ` +
    '"aciklama" adımın ne bulduğunu söyleyen kısa, doğal bir Türkçe ifade (ör. "Bir gömleğe düşen kumaş").',
  '"girdiler": her girdi {"adimId","deger"}. Senaryodaki bir sayıysa "adimId": null ve "deger" o sayı ' +
    '({"tam","pay","payda"}; tam sayılar için payda 1, ör. 28 → {"tam":null,"pay":28,"payda":1}; 2 2/5 → ' +
    '{"tam":2,"pay":2,"payda":5}). Önceki bir adımın sonucuysa "adimId" o adımın id\'si ve "deger": null.',
  '"sonuc": o adımda bulduğun sonuç. SİSTEM HER ADIMI KESİN KESİR ARİTMETİĞİYLE KENDİSİ HESAPLAR; son adımın ' +
    'sonucu planda verilen "Doğru cevap"a eşit olmalı, aksi hâlde soru reddedilir.',
  'Girdilerin sırası önemlidir: "cikar" ve "bol" için birinci girdi eksilen/bölünendir.',
  "Hesaptaki her sayı senaryoda RAKAMLA yazılmış olmalı (yalnızca ±1 düzeltmesindeki 1 serbesttir) ve senaryodaki " +
    "her sayı hesapta kullanılmalı.",
  "ŞIKLARI SİSTEM ÜRETİR: çeldiriciler, yaygın öğrenci hatalarının hesaplanmış sonuçlarıdır. Sen şık yazmazsın.",
];

function cikarimSema(gorev: CikarimGorevi): JsonSemasi {
  // Şık ve hesap alanı yok: veriler, doğru cevap ve şıklar plandan gelir.
  return jsonNesne({
    gorev: jsonGorev(gorev),
    sahne: jsonSecim(SENARYO_SAHNELERI),
    senaryo: JSON_METIN,
    soru: JSON_METIN,
  });
}

const CIKARIM_SEMA_ACIKLAMASI = [
  '"senaryo": SORU PLANI\'ndaki "Bağlam"ı kullanarak, verilen sayıların HEPSİNİ (aynı yazımla, rakamla) ve yalnızca ' +
    'onları içeren 2-4 cümlelik akıcı bir metin. "Adlar" verildiyse bu adları aynen kullan.',
  '"soru": "Örnek soru kökü"ne benzeyen tek ve net bir soru cümlesi (sonu "?" ile biter); planda "Soru kökünde geçmeli" ' +
    "denen ifadeyi içermeli.",
  "ŞIKLARI VE DOĞRU CEVABI SİSTEM ÜRETİR: çeldiriciler, yaygın öğrenci hatalarının sonuçlarıdır. Sen şık, hesap ya da " +
    "cevap yazmazsın; cevabı (sıralamayı, dönüşümü) metinde VERMEZSİN.",
];

function metinselSema(gorev: SenaryoGorevi): JsonSemasi {
  return jsonNesne({
    gorev: jsonGorev(gorev),
    sahne: jsonSecim(SENARYO_SAHNELERI),
    senaryo: JSON_METIN,
    soru: JSON_METIN,
    islemAdimlari: jsonDizi(JSON_METIN),
    cozum: JSON_BOS_OLABILIR_METIN,
    secenekler: jsonDizi(jsonNesne({ id: JSON_METIN, metin: JSON_METIN })),
    dogruSecenekId: JSON_METIN,
  });
}

// ---------------------------------------------------------------------------
// Görev tanımları
// ---------------------------------------------------------------------------

/** Örneklerde sayıları kısa yazmak için: k(32, 5) → {tam:null, pay:32, payda:5}. */
function k(pay: number, payda = 1, tam: number | null = null) {
  return { tam, pay, payda };
}

const veriden = (deger: ReturnType<typeof k>) => ({ adimId: null, deger });
const adimdan = (adimId: string) => ({ adimId, deger: null });

function sayisalGorev(
  gorev: SayisalGorev,
  tanim: Omit<GorselSoruGorevTanimi<"gercek_hayat_senaryo">, "gorev" | "jsonSemasi" | "kesirKonusuGerekir" | "semaAciklamasi"> & {
    semaEki?: readonly string[];
  }
): GorselSoruGorevTanimi<"gercek_hayat_senaryo"> {
  const { semaEki, ...geri } = tanim;
  return {
    ...geri,
    gorev,
    kesirKonusuGerekir: true,
    semaAciklamasi: [...SAYISAL_SEMA_ACIKLAMASI, ...(semaEki ?? [])],
    jsonSemasi: sayisalSema(gorev),
  };
}

function cikarimGorev(
  gorev: CikarimGorevi,
  tanim: Omit<GorselSoruGorevTanimi<"gercek_hayat_senaryo">, "gorev" | "jsonSemasi" | "kesirKonusuGerekir" | "semaAciklamasi">
): GorselSoruGorevTanimi<"gercek_hayat_senaryo"> {
  return {
    ...tanim,
    gorev,
    kesirKonusuGerekir: true,
    semaAciklamasi: CIKARIM_SEMA_ACIKLAMASI,
    jsonSemasi: cikarimSema(gorev),
  };
}

/** Plan sayılarındaki kesirler için (null yerine eksik `tam`). */
function s(pay: number, payda = 1, tam?: number): Kesir {
  return tam !== undefined ? { tam, pay, payda } : { pay, payda };
}

const gorevler: GorselSoruTanimi<"gercek_hayat_senaryo">["gorevler"] = {
  bolmeEnFazla: sayisalGorev("bolmeEnFazla", {
    etiket: "Kesir bölmesi ve \"en fazla / en az\"",
    aciklama:
      "Bir miktar, kesirli eş parçalara bölünür (kumaştan gömlek, sürahiden bardak, şişelerle ihtiyaç…). Bölüm tam " +
      "çıkmaz: \"en fazla\" sorusunda artan parçaya yetmez (aşağı yuvarlanır), \"en az\" sorusunda ihtiyacın tamamı " +
      "karşılanmalıdır (yukarı yuvarlanır).",
    enAzSinif: 6,
    kurallar: [
      "Hesap: önce bol (toplam ÷ bir parça), sonra son adım yuvarlama: \"en fazla\" → asagiYuvarla, \"en az\" → " +
        "yukariYuvarla. Soru kökü planın örnek soru kökündeki \"en fazla\"/\"en az\" ifadesini korumalı.",
    ],
    ornek: {
      tip: "gercek_hayat_senaryo",
      veri: {
        gorev: "bolmeEnFazla",
        sahne: "genel",
        senaryo:
          "Bir terzi, 34/5 metrelik bir kumaştan aynı modelde gömlekler dikecektir. Gömleklerin her biri için 8/5 metre " +
          "kumaş kullanılmaktadır.",
        soru: "Buna göre terzi bu kumaşla en fazla kaç gömlek dikebilir?",
        hesap: [
          {
            id: "a1",
            aciklama: "Kumaşın kaç gömleğe yettiği",
            islem: "bol",
            girdiler: [veriden(k(34, 5)), veriden(k(8, 5))],
            sonuc: k(1, 4, 4),
          },
          {
            id: "a2",
            aciklama: "Artan kumaş bir gömleğe yetmediği için aşağı yuvarlanır",
            islem: "asagiYuvarla",
            girdiler: [adimdan("a1")],
            sonuc: k(4),
          },
        ],
      },
    },
    ornekSayilari: {
      baglam: "Bir terzi, belirli uzunluktaki bir kumaştan aynı modelde gömlekler dikecek; her gömleğe aynı uzunlukta kumaş gider.",
      ornekSoru: "Buna göre terzi bu kumaşla en fazla kaç gömlek dikebilir?",
      veriler: [
        { ad: "kumaşın uzunluğu (metre)", deger: s(34, 5) },
        { ad: "bir gömleğe giden kumaş (metre)", deger: s(8, 5) },
      ],
      cevap: s(4),
      ipucu: "34/5 ÷ 8/5 = 4 1/4 → artan bir parçaya yetmez: en fazla 4",
      secenekler: [
        { deger: s(3), hata: "birEksik" },
        { deger: s(4) },
        { deger: s(1, 4, 4), hata: "yuvarlama" },
        { deger: s(5), hata: "yuvarlama" },
      ],
    },
  }),
  birimOlcekleme: sayisalGorev("birimOlcekleme", {
    etiket: "Birim bulma ve ölçekleme",
    aciklama:
      "Verilen bir toplamdan bir birimin değeri bulunur (bölme), sonra başka bir birim sayısına uygulanır (çarpma): " +
      "kroki, eş paketler, musluktan akan su.",
    enAzSinif: 6,
    kurallar: [
      "İki adım zorunlu ve bu sırayla: önce bir birimin değeri = verilen miktar ÷ onun birim sayısı (bol), sonra " +
        "istenen miktar = bir birimin değeri × istenen birim sayısı (carp).",
    ],
    ornek: {
      tip: "gercek_hayat_senaryo",
      veri: {
        gorev: "birimOlcekleme",
        sahne: "yolculuk",
        senaryo:
          "Bir krokide okul, kütüphane ve kafe aynı yol üzerinde gösterilmiştir. Krokideki her kare gerçekte aynı " +
          "uzunluğu gösterir. Okul ile kütüphane arası 2 kare, kütüphane ile kafe arası 3 karedir. Okul ile kütüphane " +
          "arasındaki gerçek uzaklık 2 2/5 km'dir.",
        soru: "Buna göre kütüphane ile kafe arası kaç kilometredir?",
        hesap: [
          {
            id: "a1",
            aciklama: "Bir karenin gösterdiği uzaklık",
            islem: "bol",
            girdiler: [veriden(k(2, 5, 2)), veriden(k(2))],
            sonuc: k(1, 5, 1),
          },
          {
            id: "a2",
            aciklama: "Kütüphane ile kafe arasındaki 3 karenin uzaklığı",
            islem: "carp",
            girdiler: [adimdan("a1"), veriden(k(3))],
            sonuc: k(3, 5, 3),
          },
        ],
      },
    },
    ornekSayilari: {
      baglam:
        "Bir krokide okul, kütüphane ve kafe aynı yol üzerinde gösterilmiştir; krokideki her kare gerçekte aynı uzunluğu gösterir.",
      ornekSoru: "Buna göre kütüphane ile kafe arası kaç kilometredir?",
      birim: "km",
      veriler: [
        { ad: "okul ile kütüphane arasındaki gerçek uzaklık (2 kare, km)", deger: s(2, 5, 2) },
        { ad: "okul ile kütüphane arasındaki kare sayısı", deger: s(2) },
        { ad: "kütüphane ile kafe arasındaki kare sayısı", deger: s(3) },
      ],
      cevap: s(3, 5, 3),
      ipucu: "bir birim = 2 2/5 ÷ 2 = 1 1/5; 3 birim = 3 3/5",
      secenekler: [
        { deger: s(1, 5, 1), hata: "adimAtlama" },
        { deger: s(2, 5, 3), hata: "yanlisIslem" },
        { deger: s(3, 5, 3) },
        { deger: s(1, 5, 7), hata: "adimAtlama" },
      ],
    },
  }),
  araliklar: sayisalGorev("araliklar", {
    etiket: "Aralık sayma (±1 tuzağı)",
    // Gerçek üretimlerde (3/3) model, uçlardaki nesne durumunu hesapla
    // çelişecek biçimde anlattı (ör. "ilk kapı başlangıç çizgisine denk
    // gelir" yazıp −1 yapmak). Aritmetik doğru olsa da cevap metne göre
    // yanlış olur ve bu anlamsal çelişki kodla güvenilir biçimde
    // yakalanamıyor. Uç koşulu sistemin sabit bir cümleyle yazdırdığı bir
    // yapı kurulana kadar plana alınmaz.
    plandanCikarildi: true,
    aciklama:
      "Bir uzunluk eşit kesirli aralıklara bölünür; öğrenci aralık sayısından nesne (engel, direk, fidan) sayısına " +
      "geçerken başlangıç/bitiş durumuna göre 1 ekler ya da çıkarır.",
    enAzSinif: 6,
    kurallar: [
      "Kurgu SABİTTİR (referans soru gibi): ilk nesnenin BAŞLANGIÇ çizgisine, son nesnenin BİTİŞ çizgisine uzaklığı da " +
        "ardışık iki nesne arasındaki uzaklığa eşittir; bu, senaryoda \"başlangıç\" ve \"bitiş\" sözcükleriyle açıkça " +
        "yazılmalı.",
      "Hesap tam iki adımdır: aralık sayısı = uzunluk ÷ aralık (bol); nesne sayısı = aralık sayısı − 1 (cikar).",
    ],
    ornek: {
      tip: "gercek_hayat_senaryo",
      veri: {
        gorev: "araliklar",
        sahne: "park",
        senaryo:
          "49/2 metre uzunluğundaki bir koşu pistine engeller yerleştirilecektir. İlk engelin başlangıç çizgisine, son " +
          "engelin bitiş çizgisine uzaklığı ve ardışık iki engel arasındaki uzaklık 1 3/4 metredir.",
        soru: "Buna göre piste toplam kaç engel yerleştirilmiştir?",
        hesap: [
          {
            id: "a1",
            aciklama: "Pistteki eşit aralık sayısı",
            islem: "bol",
            girdiler: [veriden(k(49, 2)), veriden(k(3, 4, 1))],
            sonuc: k(14),
          },
          {
            id: "a2",
            aciklama: "Uçlarda engel olmadığından engel sayısı aralık sayısından 1 eksiktir",
            islem: "cikar",
            girdiler: [adimdan("a1"), veriden(k(1))],
            sonuc: k(13),
          },
        ],
      },
    },
    ornekSayilari: {
      baglam:
        "Bir koşu pistine engeller dizilecek; ilk engelin başlangıç çizgisine, son engelin bitiş çizgisine uzaklığı ve ardışık iki engel arasındaki uzaklık eşittir.",
      ornekSoru: "Buna göre piste toplam kaç engel yerleştirilmiştir?",
      veriler: [
        { ad: "pistin uzunluğu (metre)", deger: s(49, 2) },
        { ad: "iki engel arası uzaklık (metre)", deger: s(3, 4, 1) },
      ],
      cevap: s(13),
      ipucu: "14 aralık; uçlarda engel yok → 14 − 1 = 13",
      secenekler: [
        { deger: s(12), hata: "birEksik" },
        { deger: s(13) },
        { deger: s(14), hata: "birFazla" },
        { deger: s(15), hata: "yanlisIslem" },
      ],
    },
  }),
  kalaniBulma: sayisalGorev("kalaniBulma", {
    etiket: "Kalanı bulma (bir çokluğun kesirleri)",
    aciklama:
      "Bir çokluğun (kilogram, sayfa, lira) iki farklı kesri kullanılır; öğrenci her parçayı bulur (çarpma), " +
      "toplar ve bütünden çıkarır.",
    kurallar: [
      "İki kesrin de TÜM çokluğun kesri olduğu senaryoda açıkça anlaşılmalı (ör. \"yine tüm elmaların 3/8'ini\"); " +
        "\"kalanın\" ifadesi bu görevde KULLANILMAZ.",
    ],
    ornek: {
      tip: "gercek_hayat_senaryo",
      veri: {
        gorev: "kalaniBulma",
        sahne: "market",
        senaryo:
          "Bir manav sabah 32 kilogram elma aldı. Öğleden önce elmaların 1/4'ünü, öğleden sonra ise yine tüm elmaların " +
          "3/8'ini sattı.",
        soru: "Buna göre akşam manavda kaç kilogram elma kalmıştır?",
        hesap: [
          { id: "a1", aciklama: "Öğleden önce satılan elma", islem: "carp", girdiler: [veriden(k(32)), veriden(k(1, 4))], sonuc: k(8) },
          { id: "a2", aciklama: "Öğleden sonra satılan elma", islem: "carp", girdiler: [veriden(k(32)), veriden(k(3, 8))], sonuc: k(12) },
          { id: "a3", aciklama: "Gün içinde satılan elma", islem: "topla", girdiler: [adimdan("a1"), adimdan("a2")], sonuc: k(20) },
          { id: "a4", aciklama: "Akşam kalan elma", islem: "cikar", girdiler: [veriden(k(32)), adimdan("a3")], sonuc: k(12) },
        ],
      },
    },
    ornekSayilari: {
      baglam:
        "Bir manav sabah belirli miktarda elma aldı; öğleden önce elmaların bir kısmını, öğleden sonra yine TÜM elmaların bir kısmını sattı.",
      ornekSoru: "Buna göre akşam manavda kaç kilogram elma kalmıştır?",
      birim: "kg",
      veriler: [
        { ad: "sabah alınan elma (kg)", deger: s(32) },
        { ad: "öğleden önce satılan, tüm elmaların kesri", deger: s(1, 4) },
        { ad: "öğleden sonra satılan, tüm elmaların kesri", deger: s(3, 8) },
      ],
      cevap: s(12),
      ipucu: "32 × 1/4 = 8; 32 × 3/8 = 12; kalan 12",
      secenekler: [
        { deger: s(20), hata: "adimAtlama" },
        { deger: s(12) },
        { deger: s(15), hata: "yanlisIslem" }, // 32 − 8 = 24; 24 × 3/8 = 9; 24 − 9
        { deger: s(24), hata: "adimAtlama" },
      ],
    },
  }),
  coklugunKesri: sayisalGorev("coklugunKesri", {
    etiket: "Bir çokluğun kesrini art arda bulma",
    aciklama:
      "Önce bir çokluğun bir kesri alınır, sonra KALANIN bir kesri alınır; öğrenci geriye kalanı bulur.",
    kurallar: [
      "İkinci kesrin TÜM çokluğun değil, KALANIN kesri olduğu senaryoda açıkça yazılmalı (ör. \"servisle gelmeyenlerin " +
        "1/4'ü\"); bu ayrım sorunun asıl inceliğidir.",
    ],
    ornek: {
      tip: "gercek_hayat_senaryo",
      veri: {
        gorev: "coklugunKesri",
        sahne: "sinif",
        senaryo:
          "Bir sınıfta 28 öğrenci vardır. Öğrencilerin 3/7'si okula servisle gelir. Servisle gelmeyenlerin 1/4'ü " +
          "bisikletle, geri kalanı yürüyerek gelir.",
        soru: "Buna göre bu sınıfta okula yürüyerek gelen kaç öğrenci vardır?",
        hesap: [
          { id: "a1", aciklama: "Servisle gelenler", islem: "carp", girdiler: [veriden(k(28)), veriden(k(3, 7))], sonuc: k(12) },
          { id: "a2", aciklama: "Servisle gelmeyenler", islem: "cikar", girdiler: [veriden(k(28)), adimdan("a1")], sonuc: k(16) },
          { id: "a3", aciklama: "Bisikletle gelenler", islem: "carp", girdiler: [adimdan("a2"), veriden(k(1, 4))], sonuc: k(4) },
          { id: "a4", aciklama: "Yürüyerek gelenler", islem: "cikar", girdiler: [adimdan("a2"), adimdan("a3")], sonuc: k(12) },
        ],
      },
    },
    ornekSayilari: {
      baglam:
        "Bir sınıftaki öğrencilerin bir kısmı okula servisle geliyor; servisle GELMEYENLERİN bir kısmı bisikletle, geri kalanı yürüyerek geliyor.",
      ornekSoru: "Buna göre bu sınıfta okula yürüyerek gelen kaç öğrenci vardır?",
      veriler: [
        { ad: "sınıftaki öğrenci sayısı", deger: s(28) },
        { ad: "servisle gelenler, tüm öğrencilerin kesri", deger: s(3, 7) },
        { ad: "bisikletle gelenler, servisle gelmeyenlerin kesri", deger: s(1, 4) },
      ],
      cevap: s(12),
      ipucu: "28 × 3/7 = 12; kalan 16; 16 × 1/4 = 4; geriye 12",
      secenekler: [
        { deger: s(4), hata: "adimAtlama" },
        { deger: s(9), hata: "yanlisIslem" },
        { deger: s(12) },
        { deger: s(16), hata: "adimAtlama" },
      ],
    },
  }),
  karsilastirma: sayisalGorev("karsilastirma", {
    etiket: "Çokluğun kesirleriyle karşılaştırma",
    aciklama:
      "İki kişinin miktarları, farklı bütünlerin kesirleri olarak verilir; öğrenci her miktarı bulur (çarpma), sonra " +
      "farkı hesaplar. Büyük kesir her zaman büyük miktar demek değildir.",
    kurallar: [
      "Soru kökü planın örnek soru kökündeki karşılaştırma yönünü (kimin kimden fazla olduğunu) aynen korumalı.",
    ],
    ornek: {
      tip: "gercek_hayat_senaryo",
      veri: {
        gorev: "karsilastirma",
        sahne: "sinif",
        senaryo: "Elif 120 sayfalık kitabının 3/4'ünü, Can ise 96 sayfalık kitabının 5/8'ini okudu.",
        soru: "Buna göre Elif, Can'dan kaç sayfa fazla okumuştur?",
        hesap: [
          { id: "a1", aciklama: "Elif'in okuduğu sayfa", islem: "carp", girdiler: [veriden(k(120)), veriden(k(3, 4))], sonuc: k(90) },
          { id: "a2", aciklama: "Can'ın okuduğu sayfa", islem: "carp", girdiler: [veriden(k(96)), veriden(k(5, 8))], sonuc: k(60) },
          { id: "a3", aciklama: "İkisinin okuduğu sayfa farkı", islem: "cikar", girdiler: [adimdan("a1"), adimdan("a2")], sonuc: k(30) },
        ],
      },
    },
    ornekSayilari: {
      baglam: "Elif ve Can, sayfa sayıları farklı iki kitap okuyor; her biri kendi kitabının bir kısmını okudu.",
      ornekSoru: "Buna göre Elif, Can'dan kaç sayfa fazla okumuştur?",
      birim: "sayfa",
      veriler: [
        { ad: "Elif'in kitabının sayfa sayısı", deger: s(120) },
        { ad: "Elif'in okuduğu kısım (kendi kitabının kesri)", deger: s(3, 4) },
        { ad: "Can'ın kitabının sayfa sayısı", deger: s(96) },
        { ad: "Can'ın okuduğu kısım (kendi kitabının kesri)", deger: s(5, 8) },
      ],
      cevap: s(30),
      ipucu: "120 × 3/4 = 90; 96 × 5/8 = 60; fark 30",
      secenekler: [
        { deger: s(24), hata: "yanlisIslem" },
        { deger: s(30) },
        { deger: s(90), hata: "adimAtlama" },
        { deger: s(150), hata: "yanlisIslem" },
      ],
    },
  }),
  parcaButun: sayisalGorev("parcaButun", {
    etiket: "Parça-bütün (kendisi dâhil)",
    aciklama:
      "Bir bütün (pasta, pizza, koli) eş parçalara bölünür; davet edilenler ve KENDİSİ aynı sayıda parça alır. Öğrenci " +
      "kişi sayısını (kendisi dâhil) bulur, kullanılan parça sayısını hesaplar ve bütünün kaçta kaçı olduğunu bulur.",
    kurallar: [
      "\"Kendisi dâhil\" bilgisi senaryoda açıkça yazılmalı; sorunun tuzağı kendisini saymayı unutmaktır.",
      "Kişi başına düşen parça sayısı birden fazlaysa rakamla yazılır (ör. 2'şer dilim).",
    ],
    ornek: {
      tip: "gercek_hayat_senaryo",
      veri: {
        gorev: "parcaButun",
        sahne: "mutfak",
        senaryo:
          "Ece doğum gününe 5 arkadaşını davet etti. Pastayı 16 eş dilime böldü ve kendisi dâhil herkese 2'şer dilim verdi.",
        soru: "Buna göre yenen pasta, bütün pastanın kaçta kaçıdır?",
        hesap: [
          { id: "a1", aciklama: "Pasta yiyen kişi sayısı (Ece dâhil)", islem: "topla", girdiler: [veriden(k(5)), veriden(k(1))], sonuc: k(6) },
          { id: "a2", aciklama: "Yenen dilim sayısı", islem: "carp", girdiler: [adimdan("a1"), veriden(k(2))], sonuc: k(12) },
          { id: "a3", aciklama: "Yenen pastanın kesri", islem: "bol", girdiler: [adimdan("a2"), veriden(k(16))], sonuc: k(3, 4) },
        ],
      },
    },
    ornekSayilari: {
      baglam:
        "Bir çocuk arkadaşlarını doğum gününe davet ediyor; pasta eş dilimlere bölünüyor ve KENDİSİ DÂHİL herkese aynı sayıda dilim veriliyor.",
      konu: "kutlama",
      ornekSoru: "Buna göre yenen pasta, bütün pastanın kaçta kaçıdır?",
      anahtarIfadeler: [["kendisi dahil", "kendisi dâhil", "kendisi de", "kendisine de", "kendine de", "kendisi için de", "kendisine"]],
      veriler: [
        { ad: "davet edilen arkadaş sayısı", deger: s(5) },
        { ad: "pastanın bölündüğü eş dilim sayısı", deger: s(16) },
        { ad: "kişi başına düşen parça sayısı", deger: s(2) },
      ],
      cevap: s(3, 4),
      ipucu: "5 + 1 (kendisi) = 6 kişi; 6 × 2 = 12 dilim; 12 ÷ 16 = 3/4",
      secenekler: [
        { deger: s(5, 8), hata: "birEksik" },
        { deger: s(3, 4) },
        { deger: s(1, 4), hata: "yanlisIslem" },
        { deger: s(3, 8), hata: "adimAtlama" },
      ],
    },
  }),
  kesirSiralama: cikarimGorev("kesirSiralama", {
    etiket: "Farklı paydalı kesirleri sıralama",
    aciklama:
      "Aynı bütünün (tarla, parkur, eşit büyüklükte pizzalar) farklı paydalı kesirleri verilir; öğrenci paydaları " +
      "eşitleyerek (eşitlikleri de görerek) miktarları sıralar. Payda büyüdükçe kesrin büyüdüğünü sanmak tipik hatadır.",
    kurallar: [
      "Kesirlerin AYNI bütüne (ya da eşit büyüklükteki bütünlere) ait olduğu senaryoda açıkça yazılmalı.",
      "Sıralamayı ya da eşitliği metinde verme; kesirleri planda yazıldığı gibi (sadeleştirmeden) yaz.",
    ],
    ornek: {
      tip: "gercek_hayat_senaryo",
      veri: {
        gorev: "kesirSiralama",
        sahne: "park",
        senaryo: "Bir çiftçi tarlasının 3/10'una domates, 2/5'ine biber, 8/20'sine salatalık ekti.",
        soru: "Buna göre ekili alanların büyükten küçüğe doğru sıralanışı aşağıdakilerden hangisidir?",
      },
    },
    ornekCikarim: {
      baglam: "Bir çiftçi tarlasının bir kısmına domates, bir kısmına biber, bir kısmına salatalık ekti.",
      konu: "tarım",
      ornekSoru: "Buna göre ekili alanların büyükten küçüğe doğru sıralanışı aşağıdakilerden hangisidir?",
      veriler: [
        { ad: "domates ekilen alan (tarlanın kesri)", deger: s(3, 10) },
        { ad: "biber ekilen alan (tarlanın kesri)", deger: s(2, 5) },
        { ad: "salatalık ekilen alan (tarlanın kesri)", deger: s(8, 20) },
      ],
      adlar: ["domates", "biber", "salatalık"],
      anahtarIfadeler: [["tarla"]],
      kokIfadeleri: [["büyükten küçüğe", "çoktan aza", "en çoktan", "en büyükten", "fazladan aza"]],
      ipucu: "paydalar 20'de eşitlenir: domates 3/10 = 6/20, biber 2/5 = 8/20, salatalık 8/20 = 8/20; büyükten küçüğe: Biber = Salatalık > Domates",
      cozum: "Paydalar 20'de eşitlenir: domates 3/10 = 6/20, biber 2/5 = 8/20, salatalık 8/20 = 8/20. Büyükten küçüğe: Biber = Salatalık > Domates.",
      secenekler: [
        { metin: "Biber > Salatalık > Domates", hata: "esitligiGormeme" },
        { metin: "Biber = Salatalık > Domates" },
        { metin: "Salatalık > Domates > Biber", hata: "paydaYanilgisi" },
        { metin: "Domates > Salatalık = Biber", hata: "tersYon" },
      ],
    },
  }),
  olabilirCikarim: cikarimGorev("olabilirCikarim", {
    etiket: "\"Olabilir\" çıkarımı (eşitsizlik)",
    aciklama:
      "Üç nesneden en küçüğü ve en büyüğü belirtilir, ikisinin ölçüsü verilir; öğrenci bilinmeyen ölçünün hangi aralıkta " +
      "olması gerektiğini çıkarır ve bileşik kesirle verilen şıkları bu aralıkla karşılaştırır.",
    kurallar: [
      "\"En küçük/en büyük\" bilgileri (en hafif, en ağır…) senaryoda açıkça yazılmalı; sorulan nesnenin ölçüsü YAZILMAZ.",
    ],
    ornek: {
      tip: "gercek_hayat_senaryo",
      veri: {
        gorev: "olabilirCikarim",
        sahne: "sinif",
        senaryo:
          "A, B ve C adlı üç küre var. B en hafif, C en ağır küredir. A küresinin kütlesi 5 kg, B küresinin kütlesi 4 kg'dır.",
        soru: "Buna göre C küresinin kütlesi kaç kilogram olabilir?",
      },
    },
    ornekCikarim: {
      baglam: "A, B ve C adlı üç küre var. B en hafif, C en ağır küredir. Sorulan ölçü metinde verilmez; yalnızca verilen iki ölçü yazılır.",
      konu: "ölçüm",
      ornekSoru: "Buna göre C küresinin kütlesi kaç kilogram olabilir?",
      veriler: [
        { ad: "B küresinin kütlesi (en küçük), kg", deger: s(4) },
        { ad: "A küresinin kütlesi, kg", deger: s(5) },
      ],
      adlar: [],
      anahtarIfadeler: [["en hafif"], ["en ağır"]],
      kokIfadeleri: [["olabilir"]],
      ipucu: "C küresinin kütlesi, A için verilen 5 kg değerinden fazla olmalıdır; 16/3 = 5 1/3, 9/2 = 4 1/2, 15/3 = 5, 7/2 = 3 1/2; yalnızca 16/3 uygun",
      cozum:
        "C küresinin kütlesi, A için verilen 5 kg değerinden fazla olmalıdır. Şıklar tam sayılı kesre çevrilir: 16/3 = 5 1/3, " +
        "9/2 = 4 1/2, 15/3 = 5, 7/2 = 3 1/2. Bu koşulu yalnızca 16/3 sağlar.",
      secenekler: [
        { metin: "9/2 kg", hata: "eksikKosul" },
        { metin: "16/3 kg" },
        { metin: "15/3 kg", hata: "sinirDahil" },
        { metin: "7/2 kg", hata: "yanlisYon" },
      ],
    },
  }),
  denklikOlamaz: cikarimGorev("denklikOlamaz", {
    etiket: "Denklik ve \"olamaz\" (bileşik ↔ tam sayılı kesir)",
    aciklama:
      "Bileşik kesirler verilir; öğrenci her birini tam sayılı kesre çevirir ve şıklardan hangisinin bunlardan HİÇBİRİNE " +
      "eşit olmadığını eleyerek bulur.",
    kurallar: [
      "Senaryoda yalnızca bileşik kesirler yazılır; tam sayılı karşılıklarını (cevabı) metinde verme.",
    ],
    ornek: {
      tip: "gercek_hayat_senaryo",
      veri: {
        gorev: "denklikOlamaz",
        sahne: "sinif",
        senaryo:
          "Bir oyunda her kartın ön yüzünde bir bileşik kesir, arka yüzünde aynı sayının tam sayılı kesir gösterimi " +
          "yazılıdır. Masadaki kartların ön yüzlerinde 11/4, 7/3 ve 9/5 yazmaktadır.",
        soru: "Buna göre aşağıdakilerden hangisi bu kartlardan birinin arka yüzü olamaz?",
      },
    },
    ornekCikarim: {
      baglam:
        "Bir oyunda her kartın ön yüzünde bir bileşik kesir, arka yüzünde aynı sayının tam sayılı kesir gösterimi yazılıdır. Masadaki kartların yalnızca ön yüzleri görünmektedir.",
      konu: "oyun",
      ornekSoru: "Buna göre aşağıdakilerden hangisi bu kartlardan birinin arka yüzü olamaz?",
      veriler: [
        { ad: "1. kartın ön yüzündeki kesir", deger: s(11, 4) },
        { ad: "2. kartın ön yüzündeki kesir", deger: s(7, 3) },
        { ad: "3. kartın ön yüzündeki kesir", deger: s(9, 5) },
      ],
      adlar: [],
      anahtarIfadeler: [["ön yüz"], ["arka yüz"]],
      kokIfadeleri: [["olamaz"]],
      ipucu: "11/4 = 2 3/4, 7/3 = 2 1/3, 9/5 = 1 4/5; 3 2/4 bunların hiçbirine eşit değil (11/4 için bölüm ile kalan yer değiştirmiş)",
      cozum:
        "Bileşik kesirler tam sayılı kesre çevrilir: 11/4 = 2 3/4, 7/3 = 2 1/3, 9/5 = 1 4/5. 3 2/4 bunların hiçbirine " +
        "eşit değildir; 11/4 çevrilirken bölüm ile kalan yer değiştirmiş.",
      secenekler: [
        { metin: "2 3/4", hata: "dogruDonusum" },
        { metin: "3 2/4" },
        { metin: "2 1/3", hata: "dogruDonusum" },
        { metin: "1 4/5", hata: "dogruDonusum" },
      ],
    },
  }),
  cokAdimliCikarim: {
    gorev: "cokAdimliCikarim",
    etiket: "Çok adımlı çıkarım",
    aciklama:
      "Senaryodaki birden fazla bilgi birlikte değerlendirilerek bir sonuca ulaşılır; cevap tek bir cümleden okunamaz.",
    kesirKonusuGerekir: false,
    // Kesir konularında cevabı kodla doğrulanan sayısal görevler kullanılır.
    kesirKonusundaKullanilmaz: true,
    semaAciklamasi: [
      '"islemAdimlari": ŞIKLARDAN ÖNCE yaz: en az 2 çıkarım adımı, her biri bir cümle.',
      '"cozum": Kısa çözüm özeti; istemiyorsan null.',
      '"secenekler": 3-5 öğe; her öğe {"id","metin"}.',
      '"dogruSecenekId": Doğru şıkkın "id" değeri.',
    ],
    kurallar: [
      "Doğru cevap senaryodaki tek bir cümlenin tekrarı olmamalı; en az iki bilgiyi ilişkilendirmeyi gerektirmeli.",
    ],
    ornek: {
      tip: "gercek_hayat_senaryo",
      veri: {
        gorev: "cokAdimliCikarim",
        sahne: "genel",
        senaryo:
          "Deniz aynı büyüklükteki üç saksıya aynı tür fasulye tohumu ekti. A saksısını güneşli pencerenin önüne " +
          "koyup her gün suladı. B saksısını aynı pencerenin önüne koydu ama hiç sulamadı. C saksısını karanlık bir " +
          "dolaba koyup her gün suladı. İki hafta sonra yalnızca A saksısındaki tohum sağlıklı bir fideye dönüştü.",
        soru: "Deniz bu gözlemlerden hangi sonuca ulaşabilir?",
        islemAdimlari: [
          "A ile B arasındaki tek fark sudur; B gelişmediğine göre tohumun gelişmesi için su gereklidir.",
          "A ile C arasındaki tek fark ışıktır; C gelişmediğine göre ışık da gereklidir.",
          "İki sonuç birlikte: sağlıklı gelişme için hem su hem ışık gerekir.",
        ],
        cozum: "A–B karşılaştırması suyun, A–C karşılaştırması ışığın gerekli olduğunu gösterir.",
        secenekler: [
          { id: "A", metin: "Tohumun sağlıklı gelişmesi için hem su hem ışık gereklidir." },
          { id: "B", metin: "Tohumun gelişmesi için yalnızca su yeterlidir." },
          { id: "C", metin: "Işık, tohumun gelişmesini engeller." },
          { id: "D", metin: "Saksının büyüklüğü tohumun gelişmesini belirler." },
        ],
        dogruSecenekId: "A",
      },
    },
    jsonSemasi: metinselSema("cokAdimliCikarim"),
  },
};

export const gercekHayatSenaryoTanimi: GorselSoruTanimi<"gercek_hayat_senaryo"> = {
  tip: "gercek_hayat_senaryo",
  etiket: "Gerçek hayat senaryosu",
  aciklama:
    "Gerçek MEB sınav seviyesinde, çok adımlı bir senaryo problemi ve onu destekleyen sade, dekoratif bir sahne. " +
    "Sayısal görevlerde doğru cevabı model değil sistem hesaplar.",
  gorselKategorisi: "dekoratif",
  // Sahnenin nasıl üretileceğini yalnızca bu alan belirler:
  // "svg" → koddaki SVG sahneleri, "hazirGorsel" → public/gorseller/sahneler/<sahne>.webp,
  // "yapayZeka" → AI ile üretilen görsel (henüz uygulanmadı), "yok" → sahne gösterilmez.
  gorselStratejisi: "svg",
  kesirKonusuGerekir: false,
  // references/senaryo-kalite-referans.md — Bölüm 2 kontrol listesi.
  kurallar: [
    "SORU PLANI satırında \"Bağlam\" ve \"SİSTEMİN VERDİĞİ SAYILAR\" varsa: bağlamı, sayıları ve şıkları sistem seçmiştir. " +
      "Senin görevin, BU bağlamda (başka bir bağlam uydurmadan) ve YALNIZCA bu sayılarla, aynı yazımla akıcı bir " +
      "senaryo metni, örnek soru köküne benzeyen tek bir soru ve \"Doğru cevap\"a ulaşan bir hesap yazmaktır. Kişi ve " +
      "nesne adlarını değiştirebilirsin; yeni bilgi ya da sayı ekleyemezsin.",
    "DİL: Metin ve soru akıcı, doğal ve dil bilgisi açısından kusursuz olmalı. Kesirden sonraki ek kesme işaretiyle " +
      "yazılır: 3/4'ü, 2/5'i, 1/2'si, 3/8'ini. \"Kesiri/kesirin/kesire\" değil \"kesri/kesrin/kesre\". Birimler " +
      "tam yazılır (metre, kilogram, litre). \"Bulunmaktadır\" gibi ağır ifadeleri yığma; \"oranında\" gibi yapay " +
      "ifadeler kullanma. Sistem sık yapılan yazım hatalarını kontrol eder.",
    "1) Cevap metinde açıkça verilmez; öğrenci en az bir işlem (bölme, çarpma, birim bulma, aralık sayma…) yapmak " +
      "zorundadır. Tek adımlı \"hangisi büyük?\" soruları KABUL EDİLMEZ. Sistem cevabın senaryoda geçip geçmediğini kontrol eder.",
    "2) En az bir kesir işlemi içerir (toplama, çıkarma, çarpma, bölme ya da tam sayılı ↔ bileşik kesir dönüşümü).",
    "3) Çeldiriciler yaygın öğrenci hatalarına denk gelir (ters çevirmeyi unutma, ±1 hatası, yanlış işlem seçme, adım " +
      "atlama, yanlış yuvarlama); rastgele sayı değil. Şıklar birbirine yakın ve akla yatkın olmalı.",
    "4) Bağlam gerçekçi ve işe dâhildir: çözüm o bağlamdaki bir işleme dayanır. Duygu, merak veya süs cümlesi " +
      `("merak ettiler", "çok eğlendiler") YAZMA. En fazla ${EN_FAZLA_CUMLE} cümle.`,
    "5) Tek net soru sorulur; birden fazla soru iç içe geçirilmez.",
    "6) \"En fazla / en az / tam olarak\" gibi incelikler uygun yerde, zorlamadan kullanılır.",
    "7) MEB kazanımına ve sınıf düzeyine uygundur: 5. sınıfta kesirlerle toplama-çıkarma ve bir çokluğun kesri; " +
      "kesirlerle çarpma ve bölme 6. sınıftan itibaren. Sayılar seviyeye göre makul büyüklükte tutulur.",
    "Sahne tamamen dekoratiftir ve hiçbir bilgi taşımaz: soru, sahne gösterilmese bile eksiksiz çözülebilmeli.",
    // references/senaryo-kalite-referans-v2.md — Bölüm 4 (çeşitlilik kuralları).
    "ÇEŞİTLİLİK: Her senaryo sorusu farklı bir PROBLEM AİLESİNDEN gelir (parça-bütün, kesrin kesri, en fazla/en az, " +
      "karşılaştırma/fazlalık, sıralama, \"olabilir\", \"olamaz\"…) ve farklı bir bağlamdadır; aile ve bağlamı sistem " +
      "atar. Aynı quizdeki sorularda kişi adlarını, nesneleri ve cümle kalıplarını TEKRARLAMA (her soruda başka adlar, " +
      "başka bir açılış cümlesi kullan).",
  ],
  ortakSemaAciklamasi: [
    `"sahne": Senaryoya en uygun dekoratif sahne; şunlardan biri: ${SENARYO_SAHNELERI.join(", ")}.`,
    `"senaryo": En fazla ${EN_FAZLA_CUMLE} cümlelik, gerçekçi ve çözüm için gereken TÜM verileri rakamla içeren metin.`,
    '"soru": Tek ve net bir soru cümlesi.',
  ],
  // references/senaryo-kalite-referans.md — Bölüm 1 (gerçek çalışma kitabı soruları).
  hedefSeviyeOrnekleri: [
    "Terzi: \"Bir terzi aldığı 32/5 metrelik kumaşla gömlek dikecektir. Gömleklerin her biri için 8/5 metre " +
      "kullanılacağına göre terzi aldığı kumaş ile en fazla kaç tane gömlek dikebilir?\" A) 1 B) 2 C) 3 D) 4 → D. " +
      "Kesir bölme gerekir; \"en fazla\" tam bölünmeseydi aşağı yuvarlamayı gerektirirdi.",
    "Kroki: \"Krokide okul ile kütüphane arası uzaklık 2 2/5 km olduğuna göre, kütüphane ile kafe arası uzaklık kaç " +
      "kilometredir?\" A) 3 1/5 B) 3 2/5 C) 3 3/5 D) 3 4/5 → C. İki adım: 2 kare = 2 2/5 km → 1 kare = 1 1/5 km; " +
      "3 kare = 3 3/5 km. Çeldiriciler birbirine çok yakın.",
    "Koşu pisti: \"49/2 metre uzunluğundaki bir koşu pistine; ilk engelin başlangıç çizgisine, son engelin bitiş " +
      "çizgisine uzaklığı ile ardışık iki engel arasındaki mesafe 1 3/4 metre olacak şekilde engeller " +
      "yerleştirilmiştir. Buna göre bu piste toplam kaç engel yerleştirilmiştir?\" A) 10 B) 11 C) 13 D) 14 → C. " +
      "49/2 ÷ 7/4 = 14 aralık, uçlarda engel olmadığı için 13 engel; D (14) ±1 tuzağına düşenler için.",
    // references/senaryo-kalite-referans-v2.md — Bölüm 1 ve 3.
    "Kesrin kesri: \"Ece 24 soruluk sınavda soruların 3/4'ünü doğru yapmış, kalan soruların yarısını boş bırakmıştır. " +
      "Ece kaç soruyu yanlış yapmıştır?\" → 24 × 3/4 = 18, kalan 6, yarısı 3 boş → 3 yanlış. \"Kalanın\" kelimesi kritik.",
    "Parça-bütün: \"Bir çocuk 5 arkadaşını davet eder, pastayı 12 eş dilime böler ve kendisi dâhil herkese birer dilim " +
      "verir. Yenen pasta, pastanın kaçta kaçıdır?\" → 6/12 = 1/2. Tuzak: kendisini saymamak (5/12).",
    "Olabilir: \"B en hafif (4 kg), C en ağır küredir; A 5 kg'dır. C'nin kütlesi hangisi olabilir?\" → yalnızca 5'ten " +
      "büyük seçenek (16/3 = 5 1/3); 15/3 = 5 eşit olduğu için olamaz.",
  ],
  gorevler,
  dogrula,
  dogruCevapMetni,
};
