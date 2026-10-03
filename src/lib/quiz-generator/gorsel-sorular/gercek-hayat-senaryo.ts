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
  JSON_MANTIKSAL,
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
  tekrarlananSecenekleriAyikla,
  yokMu,
  type GorselSoruDogrulamaSonucu,
  type GorselSoruGorevTanimi,
  type GorselSoruSorunu,
  type GorselSoruTanimi,
  type JsonSemasi,
} from "@/lib/quiz-generator/gorsel-sorular/ortak";
import {
  SENARYO_GOREVLERI,
  SENARYO_SAHNELERI,
  type GercekHayatSenaryoVerisi,
  type GorselSoruPlani,
  type Kesir,
  type MetinSecenegi,
  type SenaryoGorevi,
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

type HataTuru = (typeof HATA_TURLERI)[number];

type SayisalGorev = Exclude<SenaryoGorevi, "cokAdimliCikarim">;

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
  /** En az bir çeldirici bu hata türlerinden birini temsil etmeli. */
  zorunluHata?: readonly HataTuru[];
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
    zorunluHata: ["birFazla", "birEksik"],
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
    tamSayiSonuc: false,
    yapi: ({ hesap }) =>
      hesap.some((adim) => adim.islem === "cikar") ? undefined : "Kalan, bütünden çıkarılarak bulunmalıdır.",
  },
  coklugunKesri: {
    tamSayiSonuc: true,
    araSonuclarTamSayi: true,
    yapi: ({ hesap }) =>
      hesap.some((adim) => adim.islem === "carp" && adim.girdiler.some((girdi) => !tamSayiMi(girdi.deger)))
        ? undefined
        : "Bir çokluğun kesri (çokluk × kesir) hesaplanmalıdır.",
  },
  karsilastirma: {
    tamSayiSonuc: false,
    yapi: ({ hesap }) =>
      hesap[hesap.length - 1].islem === "cikar"
        ? undefined
        : "Karşılaştırmanın sonucu bir fark (çıkarma) olarak hesaplanmalıdır.",
  },
};

interface SayisalSecenek {
  id: string;
  deger: Kesir;
  hata?: HataTuru;
}

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

function dogrulaSayisal(
  gorev: SayisalGorev,
  raw: Record<string, unknown>,
  ortak: { senaryo: string; soru: string; dogruSecenekId: string },
  path: string,
  sorunlar: Sorunlar,
  planlananSayilar?: SenaryoSayilari
): Sonuc {
  const kural = SAYISAL_KURALLAR[gorev];
  const hesap = hesabiDogrula(raw.hesap, ortak.senaryo, `${path}.hesap`, sorunlar);
  const secenekler = okuKimlikliDizi<SayisalSecenek>(
    raw.secenekler,
    `${path}.secenekler`,
    sorunlar,
    SECENEK_SINIRI,
    (oge, id, ogePath) => {
      const deger = okuKesir(oge.deger, `${ogePath}.deger`, sorunlar);
      if (!deger) return undefined;
      const hata = yokMu(oge.hata) ? undefined : okuSecim(oge, "hata", HATA_TURLERI, ogePath, sorunlar);
      if (!yokMu(oge.hata) && !hata) return undefined;
      return { id, deger, hata };
    }
  );
  if (!hesap || !secenekler) return undefined;

  const sonuc = hesap[hesap.length - 1].sonuc;
  const birim = okuIstegeBagliMetin(raw, "birim");

  // Sayıları kod seçtiyse: senaryo bu sayıları kullanmalı ve hesap, kodun
  // önceden bildiği cevaba ulaşmalı — senaryonun anlattığı işlem ile
  // planlanan işlem ancak böyle birebir örtüşür.
  if (planlananSayilar) {
    const eksik = planlananSayilar.veriler.find((veri) => !senaryodaGeciyorMu(ortak.senaryo, oranYap(veri.deger)));
    if (eksik) {
      sorunlar.push({
        path: `${path}.senaryo`,
        message: `Sistemin verdiği ${kesirGosterimi(eksik.deger)} (${eksik.ad}) senaryoda geçmiyor; verilen sayıları aynen kullan.`,
      });
      return undefined;
    }
    const beklenen = oranYap(planlananSayilar.cevap);
    if (!esitMi(sonuc, beklenen)) {
      sorunlar.push({
        path: `${path}.hesap`,
        message:
          `Hesabın sonucu ${oranMetni(sonuc)}, ama bu sayılarla doğru cevap ${oranMetni(beklenen)} ` +
          `(${planlananSayilar.ipucu}). Senaryoyu ve hesabı bu ilişkiye göre kur.`,
      });
      return undefined;
    }
  }

  const yapiHatasi = kural.yapi({ hesap, soru: ortak.soru, senaryo: ortak.senaryo });
  if (yapiHatasi) {
    sorunlar.push({ path: `${path}.hesap`, message: yapiHatasi });
    return undefined;
  }
  // Tam sayı çıkması gereken yerde (kişi, gömlek, engel) kesirli sonuç kabul edilmez.
  const tamSayiGerekli = kural.tamSayiSonuc || raw.sonucTamSayiOlmali === true;
  if (tamSayiGerekli && !tamSayiMi(sonuc)) {
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
  if (senaryodaGeciyorMu(ortak.senaryo, sonuc)) {
    sorunlar.push({
      path: `${path}.senaryo`,
      message: `Cevap (${oranMetni(sonuc)}) senaryoda zaten geçiyor; öğrenci işlem yapmadan cevabı okuyabilir.`,
    });
    return undefined;
  }

  const tekrarsiz = tekrarlananSecenekleriAyikla(
    secenekler,
    (secenek) => oranMetni(oranYap(secenek.deger)),
    ortak.dogruSecenekId
  );
  if (tekrarsiz.length < SECENEK_SINIRI.min) {
    sorunlar.push({ path: `${path}.secenekler`, message: "Değerce aynı şıklar çıkarıldıktan sonra en az 3 şık kalmalıdır." });
    return undefined;
  }

  // Doğru şıkkı kod belirler; model başka bir şıkkı işaretlediyse soru reddedilir.
  const koddakiDogru = tekrarsiz.find((secenek) => esitMi(oranYap(secenek.deger), sonuc));
  const isaretli = tekrarsiz.find((secenek) => secenek.id === ortak.dogruSecenekId);
  if (!koddakiDogru || (isaretli && koddakiDogru.id !== isaretli.id)) {
    sorunlar.push({
      path: `${path}.dogruSecenekId`,
      message: koddakiDogru
        ? `Model ${isaretli ? kesirGosterimi(isaretli.deger) : "?"} şıkkını işaretledi; kodun hesapladığı cevap ${oranMetni(sonuc)} (şık ${koddakiDogru.id}).`
        : `Kodun hesapladığı cevap (${oranMetni(sonuc)}) şıkların hiçbirinde yok.`,
    });
    return undefined;
  }
  const tutarli = dogruSecenegiDogrula(
    tekrarsiz,
    ortak.dogruSecenekId,
    (secenek) => esitMi(oranYap(secenek.deger), sonuc),
    path,
    sorunlar
  );
  if (!tutarli) return undefined;

  // Kalite ölçütü 3: her çeldirici adlandırılmış bir öğrenci hatasını temsil eder.
  const celdiriciler = tekrarsiz.filter((secenek) => secenek.id !== ortak.dogruSecenekId);
  const etiketsiz = celdiriciler.find((secenek) => !secenek.hata);
  if (etiketsiz) {
    sorunlar.push({ path: `${path}.secenekler`, message: `Çeldirici ${etiketsiz.id} bir hata türüyle etiketlenmelidir.` });
    return undefined;
  }
  const birlik = { pay: 1, payda: 1 };
  // "Bir fazla/eksik" yalnızca sayılan cevaplarda (tam sayı) anlamlıdır; 4/5 için "bir eksik" −1/5 olmaz.
  for (const secenek of tamSayiMi(sonuc) ? celdiriciler : []) {
    const beklenen =
      secenek.hata === "birFazla" ? islemUygula("topla", [sonuc, birlik]) : secenek.hata === "birEksik" ? islemUygula("cikar", [sonuc, birlik]) : undefined;
    if (beklenen && !esitMi(oranYap(secenek.deger), beklenen)) {
      sorunlar.push({
        path: `${path}.secenekler`,
        message: `Çeldirici ${secenek.id} "${secenek.hata}" olarak etiketlenmiş ama değeri ${oranMetni(beklenen)} değil.`,
      });
      return undefined;
    }
  }
  if (kural.zorunluHata && !celdiriciler.some((secenek) => secenek.hata && kural.zorunluHata?.includes(secenek.hata))) {
    sorunlar.push({
      path: `${path}.secenekler`,
      message: `En az bir çeldirici şu hatalardan birini temsil etmeli: ${kural.zorunluHata.join(", ")}.`,
    });
    return undefined;
  }

  const veri: GercekHayatSenaryoVerisi = {
    gorev,
    sahne: sahneOku(raw.sahne),
    senaryo: ortak.senaryo,
    secenekler: tekrarsiz.map((secenek) => ({
      id: secenek.id,
      metin: `${kesirGosterimi(secenek.deger)}${birim ? ` ${birim}` : ""}`,
    })),
    dogruSecenekId: ortak.dogruSecenekId,
  };
  // Çözüm metni modelden değil, doğrulanmış hesaptan üretilir.
  return { soru: ortak.soru, cozum: hesaptanCozum(hesap, birim), veri };
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
  const dogruSecenekId = okuMetin(raw, "dogruSecenekId", path, sorunlar);
  if (!gorev || !senaryo || !soru || !dogruSecenekId) return undefined;
  if (!ortakMetinDenetimi(senaryo, soru, path, sorunlar)) return undefined;

  const ortak = { senaryo, soru, dogruSecenekId };
  return gorev === "cokAdimliCikarim"
    ? dogrulaMetinsel(raw, ortak, path, sorunlar)
    : dogrulaSayisal(gorev, raw, ortak, path, sorunlar, plan?.sayilar);
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
  // Hesap şıklardan ÖNCE yazılır: model önce çözer, sonra şıkları sonuca göre kurar.
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
    sonucTamSayiOlmali: JSON_MANTIKSAL,
    birim: JSON_BOS_OLABILIR_METIN,
    secenekler: jsonDizi(
      jsonNesne({ id: JSON_METIN, deger: JSON_KESIR, hata: { anyOf: [jsonSecim(HATA_TURLERI), { type: "null" }] } })
    ),
    dogruSecenekId: JSON_METIN,
  });
}

const SAYISAL_SEMA_ACIKLAMASI = [
  '"hesap": ŞIKLARDAN ÖNCE yaz. Çözümün 2-8 adımı; her adım {"id","aciklama","islem","girdiler","sonuc"}. ' +
    `"islem" şunlardan biri: ${ISLEMLER.join(", ")}. topla/carp en az 2, cikar/bol tam 2, yuvarlama 1 girdi alır.`,
  '"girdiler": her girdi {"adimId","deger"}. Senaryodaki bir sayıysa "adimId": null ve "deger" o sayı ' +
    '({"tam","pay","payda"}; tam sayılar için payda 1, ör. 28 → {"tam":null,"pay":28,"payda":1}; 2 2/5 → ' +
    '{"tam":2,"pay":2,"payda":5}). Önceki bir adımın sonucuysa "adimId" o adımın id\'si ve "deger": null.',
  '"sonuc": o adımda SENİN bulduğun sonuç. SİSTEM HER ADIMI KESİN KESİR ARİTMETİĞİYLE KENDİSİ HESAPLAR ve doğru ' +
    'cevabı kendisi bulur; işaretlediğin şık bu cevapla tutmazsa soru reddedilir. Son adımın sonucu sorunun cevabıdır.',
  'Her "sonuc"u yazmadan önce işlemi açıkça yap: toplama/çıkarmada paydaları eşitle; çarpmada pay×pay, payda×payda; ' +
    "bölmede ikinci kesri ters çevirip çarp; tam sayılı kesri önce bileşik kesre çevir. Girdilerin sırası önemlidir: " +
    '"cikar" ve "bol" için birinci girdi eksilen/bölünendir.',
  "SAYILARI GERİYE DOĞRU KUR: önce cevabı ve adımlardaki sade değerleri SEÇ, senaryoya yazacağın verileri " +
    "bunlardan HESAPLA. Ör. 13 engel istiyorsan: 14 aralık × 7/4 m = 49/2 m → senaryoya \"49/2 metre\" ve \"1 3/4 " +
    "metre\" yaz. İleri doğru rastgele sayı seçip hesabın tutmasını umma; sayılan nesneler tam sayı çıkmalı.",
  "Hesaptaki her sayı senaryoda RAKAMLA yazılmış olmalı (yalnızca ±1 düzeltmesindeki 1 serbesttir).",
  '"sonucTamSayiOlmali": Cevap sayılan bir nesneyse (kişi, gömlek, engel, kutu…) true.',
  '"birim": Şıklardaki birim (ör. "km", "kg", "metre") ya da null.',
  '"secenekler": 3-5 öğe; her öğe {"id","deger","hata"}. "deger" bir sayı/kesir ({"tam","pay","payda"}). Doğru ' +
    `şıkta "hata": null. Her çeldiricide "hata" şunlardan biri: ${HATA_TURLERI.join(", ")}. "birFazla"/"birEksik" ` +
    "etiketli çeldirici doğru cevabın TAM 1 fazlası/eksiği olmalı (sistem kontrol eder).",
  '"dogruSecenekId": Değeri hesabın son sonucuna eşit olan şıkkın id\'si.',
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

const gorevler: GorselSoruTanimi<"gercek_hayat_senaryo">["gorevler"] = {
  bolmeEnFazla: sayisalGorev("bolmeEnFazla", {
    etiket: "Kesir bölmesi ve \"en fazla / en az\"",
    aciklama:
      "Bir miktar, kesirli bir paya bölünür (kumaştan gömlek, şişeden bardak…). Sonuç tam çıkmıyorsa \"en fazla\" " +
      "sorusunda aşağı, \"en az\" sorusunda yukarı yuvarlanır.",
    enAzSinif: 6,
    kurallar: [
      "Hesap: önce bol (toplam ÷ bir parçaya giden), sonra son adım yuvarlama: \"en fazla\" → asagiYuvarla, \"en " +
        "az\" → yukariYuvarla (bölüm tam çıksa bile).",
      "Geriye doğru kur: cevabı (ör. 4 gömlek) ve bir parçayı (8/5 m) seç; toplam = 4 × 8/5 + bir parçadan az bir " +
        "artık (ör. 2/5) = 34/5 m. Çeldiricilerden biri yuvarlamayı yanlış yöne yapmak olmalı.",
    ],
    ornek: {
      tip: "gercek_hayat_senaryo",
      veri: {
        gorev: "bolmeEnFazla",
        sahne: "genel",
        senaryo:
          "Bir terzi aldığı 34/5 metrelik kumaşla gömlek dikecektir. Gömleklerin her biri için 8/5 metre kumaş kullanılacaktır.",
        soru: "Buna göre terzi aldığı kumaşla en fazla kaç gömlek dikebilir?",
        hesap: [
          {
            id: "a1",
            aciklama: "Toplam kumaş, bir gömleğe giden kumaşa bölünür",
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
        sonucTamSayiOlmali: true,
        birim: null,
        secenekler: [
          { id: "A", deger: k(3), hata: "birEksik" },
          { id: "B", deger: k(4), hata: null },
          { id: "C", deger: k(5), hata: "birFazla" },
          { id: "D", deger: k(1, 4, 4), hata: "yuvarlama" },
        ],
        dogruSecenekId: "B",
      },
    },
  }),
  birimOlcekleme: sayisalGorev("birimOlcekleme", {
    etiket: "Birim bulma ve ölçekleme",
    aciklama:
      "Verilen bir toplamdan bir birimin değeri bulunur (bölme), sonra başka bir birim sayısına uygulanır (çarpma): " +
      "kroki, eş parçalar, paketler.",
    enAzSinif: 6,
    kurallar: [
      "İki adım zorunlu ve bu sırayla: önce bir birimin değeri = verilen miktar ÷ onun birim sayısı (bol), sonra " +
        "istenen miktar = bir birimin değeri × istenen birim sayısı (carp). Tek bir bölme veya tek bir çarpma YETMEZ.",
      "Geriye doğru kur: bir birimin değerini (ör. 6/5 km) ve iki birim sayısını (2 ve 3) seç; senaryoya 2 × 6/5 = " +
        "2 2/5 km'yi yaz, cevap 3 × 6/5 = 3 3/5 km olur.",
      "Çeldiriciler birbirine yakın olmalı ve adım atlamayı yansıtmalı (yalnızca birim değeri, birim bulmadan çarpmak).",
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
        sonucTamSayiOlmali: false,
        birim: "km",
        secenekler: [
          { id: "A", deger: k(1, 5, 1), hata: "adimAtlama" },
          { id: "B", deger: k(2, 5, 3), hata: "yakinDeger" },
          { id: "C", deger: k(3, 5, 3), hata: null },
          { id: "D", deger: k(1, 5, 7), hata: "adimAtlama" },
        ],
        dogruSecenekId: "C",
      },
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
      "Kurgu SABİTTİR (referans soru gibi): bir uzunluk boyunca nesneler (engel, fidan, direk, bayrak) dizilir; ilk " +
        "nesnenin BAŞLANGIÇ çizgisine, son nesnenin BİTİŞ çizgisine uzaklığı da ardışık iki nesne arasındaki uzaklığa " +
        "eşittir. Bu cümle senaryoda \"başlangıç\" ve \"bitiş\" sözcükleriyle AÇIKÇA yazılmalı. Kesme/parçalama " +
        "(\"kaç parça/börek çıkar\") kurgusu KULLANMA; o bir aralık sorusu değildir.",
      "Hesap tam iki adımdır: aralık sayısı = uzunluk ÷ aralık (bol); nesne sayısı = aralık sayısı − 1 (cikar); bu " +
        "adımda ikinci girdi senaryoda olmayan sabit 1'dir ({\"tam\":null,\"pay\":1,\"payda\":1}).",
      "Geriye doğru kur: önce aralık sayısını (tam sayı, ör. 14) ve aralık uzunluğunu (ör. 7/4) seç; uzunluk = 14 × " +
        "7/4 = 49/2. Aralık sayısı MUTLAKA tam sayı çıkmalı.",
      "Çeldiricilerden biri ±1 düzeltmesini unutmak olmalı (birFazla veya birEksik).",
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
            aciklama: "Başlangıçta ve bitişte engel olmadığından engel sayısı aralık sayısından 1 eksiktir",
            islem: "cikar",
            girdiler: [adimdan("a1"), veriden(k(1))],
            sonuc: k(13),
          },
        ],
        sonucTamSayiOlmali: true,
        birim: null,
        secenekler: [
          { id: "A", deger: k(12), hata: "birEksik" },
          { id: "B", deger: k(13), hata: null },
          { id: "C", deger: k(14), hata: "birFazla" },
          { id: "D", deger: k(15), hata: "yanlisIslem" },
        ],
        dogruSecenekId: "B",
      },
    },
  }),
  kalaniBulma: sayisalGorev("kalaniBulma", {
    etiket: "Kalanı bulma",
    aciklama:
      "Bir bütünden farklı paydalı parçalar kullanılır; öğrenci önce kullanılanı toplar, sonra bütünden çıkarır.",
    kurallar: ["En az iki parça kullanılmalı ve paydaları farklı olmalı."],
    ornek: {
      tip: "gercek_hayat_senaryo",
      veri: {
        gorev: "kalaniBulma",
        sahne: "mutfak",
        senaryo:
          "Bir pastane sabah 2 kilogram çikolata aldı. Öğlene kadar bu çikolatanın 1/4 kilogramını kek yapımında, " +
          "5/8 kilogramını da kurabiye yapımında kullandı.",
        soru: "Akşam için kaç kilogram çikolata kalmıştır?",
        hesap: [
          {
            id: "a1",
            aciklama: "Kullanılan çikolata",
            islem: "topla",
            girdiler: [veriden(k(1, 4)), veriden(k(5, 8))],
            sonuc: k(7, 8),
          },
          {
            id: "a2",
            aciklama: "Kalan çikolata",
            islem: "cikar",
            girdiler: [veriden(k(2)), adimdan("a1")],
            sonuc: k(1, 8, 1),
          },
        ],
        sonucTamSayiOlmali: false,
        birim: "kg",
        secenekler: [
          { id: "A", deger: k(7, 8), hata: "adimAtlama" },
          { id: "B", deger: k(1, 8, 1), hata: null },
          { id: "C", deger: k(3, 8, 1), hata: "adimAtlama" },
          { id: "D", deger: k(1, 2, 1), hata: "yanlisIslem" },
        ],
        dogruSecenekId: "B",
      },
    },
  }),
  coklugunKesri: sayisalGorev("coklugunKesri", {
    etiket: "Bir çokluğun kesrini bulma",
    aciklama:
      "Bir çokluğun kesirleri art arda alınır (ör. önce bir kısmı, sonra kalanın bir kesri); öğrenci istenen sayıyı bulur.",
    kurallar: [
      "Tek adımlı \"24'ün 1/3'ü kaçtır?\" YASAK; en az iki kesir işlemi ardışık uygulanmalı.",
      "Her ara sonuç tam sayı çıkmalı (kişi, nesne sayısı); sistem her adımı kontrol eder. Geriye doğru kur: toplamı " +
        "tüm paydaların katı seç (ör. 3/7 ve kalanın 1/4'ü için 28: 28 × 3/7 = 12, 16 × 1/4 = 4).",
    ],
    ornek: {
      tip: "gercek_hayat_senaryo",
      veri: {
        gorev: "coklugunKesri",
        sahne: "sinif",
        senaryo:
          "Bir sınıfta 28 öğrenci var. Öğrencilerin 3/7'si okula servisle geliyor. Servisle gelmeyenlerin 1/4'ü " +
          "bisikletle, geri kalanı yürüyerek geliyor.",
        soru: "Bu sınıfta okula yürüyerek gelen kaç öğrenci vardır?",
        hesap: [
          { id: "a1", aciklama: "Servisle gelenler", islem: "carp", girdiler: [veriden(k(28)), veriden(k(3, 7))], sonuc: k(12) },
          { id: "a2", aciklama: "Servisle gelmeyenler", islem: "cikar", girdiler: [veriden(k(28)), adimdan("a1")], sonuc: k(16) },
          { id: "a3", aciklama: "Bisikletle gelenler", islem: "carp", girdiler: [adimdan("a2"), veriden(k(1, 4))], sonuc: k(4) },
          { id: "a4", aciklama: "Yürüyerek gelenler", islem: "cikar", girdiler: [adimdan("a2"), adimdan("a3")], sonuc: k(12) },
        ],
        sonucTamSayiOlmali: true,
        birim: null,
        secenekler: [
          { id: "A", deger: k(4), hata: "adimAtlama" },
          { id: "B", deger: k(12), hata: null },
          { id: "C", deger: k(16), hata: "adimAtlama" },
          { id: "D", deger: k(21), hata: "yanlisIslem" },
        ],
        dogruSecenekId: "B",
      },
    },
  }),
  karsilastirma: sayisalGorev("karsilastirma", {
    etiket: "İşlem gerektiren karşılaştırma",
    aciklama:
      "Karşılaştırılacak miktarlar hazır verilmez; öğrenci önce her birini bir işlemle bulur, sonra farkı hesaplar.",
    kurallar: [
      "İki kesri doğrudan karşılaştırtma (\"5/6 mı 1/2 mi büyük?\" YASAK).",
      "Soru kimin daha fazla olduğunu değil, farkın ne kadar olduğunu sormalı; son adım çıkarma olmalı.",
    ],
    ornek: {
      tip: "gercek_hayat_senaryo",
      veri: {
        gorev: "karsilastirma",
        sahne: "park",
        senaryo:
          "Elif ve Can okul bahçesindeki çiçekleri sulamak için eşit büyüklükteki kovalarını dolduruyor. Elif " +
          "kovasının önce 1/4'ünü, sonra 1/2'sini daha doldurdu. Can ise kovasını tek seferde 5/8'ine kadar doldurdu.",
        soru: "İki kovadaki su miktarlarının farkı kovanın kaçta kaçıdır?",
        hesap: [
          { id: "a1", aciklama: "Elif'in kovasındaki su", islem: "topla", girdiler: [veriden(k(1, 4)), veriden(k(1, 2))], sonuc: k(3, 4) },
          { id: "a2", aciklama: "İki kova arasındaki fark", islem: "cikar", girdiler: [adimdan("a1"), veriden(k(5, 8))], sonuc: k(1, 8) },
        ],
        sonucTamSayiOlmali: false,
        birim: "kova",
        secenekler: [
          { id: "A", deger: k(1, 8), hata: null },
          { id: "B", deger: k(3, 8), hata: "adimAtlama" },
          { id: "C", deger: k(1, 4), hata: "yakinDeger" },
          { id: "D", deger: k(3, 4), hata: "adimAtlama" },
        ],
        dogruSecenekId: "A",
      },
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
    "SORU PLANI satırında \"SİSTEMİN VERDİĞİ SAYILAR\" varsa: sayıları sistem, koşulları sağlayacak şekilde seçmiştir. " +
      "Senaryoyu YALNIZCA bu sayılarla ve aynı yazımla kur (±1 düzeltmesindeki 1 dışında başka sayı ekleme), " +
      "\"hesap\" bu sayılarla \"Doğru cevap\"a ulaşmalı ve bu cevap doğru şık olmalı. Senin görevin sayı seçmek değil; " +
      "bu sayılara gerçekçi bir bağlam, doğru işlem adımları ve öğrenci hatalarına dayanan çeldiriciler yazmaktır.",
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
  ],
  gorevler,
  dogrula,
  dogruCevapMetni,
};
