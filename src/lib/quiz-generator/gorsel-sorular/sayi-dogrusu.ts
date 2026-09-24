import {
  JSON_BOS_OLABILIR_METIN,
  JSON_BOS_OLABILIR_TAM_SAYI,
  JSON_KESIR,
  JSON_METIN,
  JSON_TAM_SAYI,
  dogruSecenegiUzlastir,
  isRecord,
  jsonDizi,
  jsonGorev,
  jsonNesne,
  jsonSecim,
  kesirDegeri,
  kesirlerEsitMi,
  kesirMetni,
  metinKesriIceriyorMu,
  metniNormallestir,
  okuIstegeBagliMetin,
  okuKesir,
  okuKimlikliDizi,
  okuMetin,
  okuSecim,
  okuTamSayi,
  secenekHarfi,
  tekrarlananSecenekleriAyikla,
  type GorselSoruDogrulamaSonucu,
  type GorselSoruSorunu,
  type GorselSoruTanimi,
  type JsonSemasi,
} from "@/lib/quiz-generator/gorsel-sorular/ortak";
import {
  SAYI_DOGRUSU_GOREVLERI,
  type AyriDogruIsaretcisi,
  type IsaretciSecenegi,
  type Kesir,
  type KesirSecenegi,
  type OrtakSayiDogrusu,
  type SayiDogrusuIsaretcisi,
  type SayiDogrusuVerisi,
  type SiralamaSecenegi,
  type SiralamaYonu,
} from "@/types/gorsel-soru";

const SIRALAMA_YONLERI: readonly SiralamaYonu[] = ["kucuktenBuyuge", "buyuktenKucuge"];

const SIRALAMA_IFADELERI: Record<SiralamaYonu, string> = {
  kucuktenBuyuge: "küçükten büyüğe",
  buyuktenKucuge: "büyükten küçüğe",
};

const PAY_SINIRI = { min: 1, max: 60 };
// Payda 1 geçerlidir: tam sayı noktaları (ör. 2/1) iyi bir çeldiricidir.
const PAYDA_SINIRI = { min: 1, max: 12 };
const ARALIK_SINIRI = { min: 1, max: 5 };
const BOLME_SINIRI = { min: 2, max: 12 };
const EN_FAZLA_ARALIK = 30;
const SECENEK_SINIRI = { min: 3, max: 5 };
const SIMGE_EN_UZUN = 8;

type Sorunlar = GorselSoruSorunu[];

// ---------------------------------------------------------------------------
// Hesaplama yardımcıları
// ---------------------------------------------------------------------------

export function isaretciDegeri(isaretci: Pick<SayiDogrusuIsaretcisi, "pay" | "payda">): number {
  return isaretci.pay / isaretci.payda;
}

export function siralamaIsareti(siralama: SiralamaYonu): string {
  return siralama === "kucuktenBuyuge" ? "<" : ">";
}

function ebob(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : ebob(b, a % b);
}

function sadelestir(pay: number, payda: number): Kesir {
  const bolen = ebob(pay, payda) || 1;
  return { pay: pay / bolen, payda: payda / bolen };
}

/** |a − b| kesir olarak (kesin aritmetik). */
function fark(a: Kesir, b: Kesir): Kesir {
  const aPay = (a.tam ?? 0) * a.payda + a.pay;
  const bPay = (b.tam ?? 0) * b.payda + b.pay;
  return sadelestir(Math.abs(aPay * b.payda - bPay * a.payda), a.payda * b.payda);
}

function kucukMu(a: Kesir, b: Kesir): boolean {
  return a.pay * b.payda < b.pay * a.payda;
}

function isaretciKesri(isaretci: SayiDogrusuIsaretcisi): Kesir {
  return { pay: isaretci.pay, payda: isaretci.payda };
}

/** İşaretçi id'lerinin, veriden hesaplanan doğru sırası. */
export function dogruSiralama(isaretciler: SayiDogrusuIsaretcisi[], siralama: SiralamaYonu): string[] {
  const artan = [...isaretciler].sort((a, b) => isaretciDegeri(a) - isaretciDegeri(b));
  const sirali = siralama === "kucuktenBuyuge" ? artan : artan.reverse();
  return sirali.map((isaretci) => isaretci.id);
}

/** Hedefe en yakın işaretçi; iki işaretçi eşit uzaklıktaysa `undefined` (soru belirsiz). */
export function hedefeEnYakinIsaretci(
  isaretciler: SayiDogrusuIsaretcisi[],
  hedef: Kesir
): SayiDogrusuIsaretcisi | undefined {
  const farklar = isaretciler.map((isaretci) => ({ isaretci, fark: fark(isaretciKesri(isaretci), hedef) }));
  const enKucuk = farklar.reduce((a, b) => (kucukMu(b.fark, a.fark) ? b : a));
  const esitler = farklar.filter((item) => kesirlerEsitMi(item.fark, enKucuk.fark));
  return esitler.length === 1 ? enKucuk.isaretci : undefined;
}

function ayniSira(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

function buyukHarfle(metin: string): string {
  return metin.charAt(0).toLocaleUpperCase("tr-TR") + metin.slice(1);
}

// ---------------------------------------------------------------------------
// Okuma yardımcıları
// ---------------------------------------------------------------------------

function okuIsaretciler<T extends SayiDogrusuIsaretcisi>(
  value: unknown,
  path: string,
  sorunlar: Sorunlar,
  sinir: { min: number; max: number },
  okuEk: (oge: Record<string, unknown>, isaretci: SayiDogrusuIsaretcisi, ogePath: string) => T | undefined
): T[] | undefined {
  const isaretciler = okuKimlikliDizi<T>(value, path, sorunlar, sinir, (oge, id, ogePath) => {
    const simge = okuMetin(oge, "simge", ogePath, sorunlar);
    const ad = okuMetin(oge, "ad", ogePath, sorunlar);
    const pay = okuTamSayi(oge, "pay", ogePath, sorunlar, PAY_SINIRI);
    const payda = okuTamSayi(oge, "payda", ogePath, sorunlar, PAYDA_SINIRI);
    if (simge && simge.length > SIMGE_EN_UZUN) {
      sorunlar.push({ path: `${ogePath}.simge`, message: '"simge" tek bir emoji olmalıdır.' });
      return undefined;
    }
    if (!simge || !ad || pay === undefined || payda === undefined) return undefined;
    return okuEk(oge, { id, simge, ad, pay, payda }, ogePath);
  });
  if (!isaretciler) return undefined;

  // Aynı simge şıklarda ayırt edilemez; aynı değer ise sıralamayı ve
  // "hangisi" sorularını belirsizleştirir.
  if (new Set(isaretciler.map((isaretci) => isaretci.simge)).size !== isaretciler.length) {
    sorunlar.push({ path, message: "Her işaretçinin simgesi farklı olmalıdır." });
    return undefined;
  }
  const degerler = isaretciler.map(isaretciKesri);
  if (degerler.some((a, i) => degerler.some((b, j) => i < j && kesirlerEsitMi(a, b)))) {
    sorunlar.push({ path, message: "Her işaretçi farklı bir değeri göstermelidir." });
    return undefined;
  }
  return isaretciler;
}

function okuAyriIsaretciler(value: unknown, path: string, sorunlar: Sorunlar, sinir: { min: number; max: number }) {
  return okuIsaretciler<AyriDogruIsaretcisi>(value, path, sorunlar, sinir, (oge, isaretci, ogePath) => {
    const aralikSonu = okuTamSayi(oge, "aralikSonu", ogePath, sorunlar, ARALIK_SINIRI);
    if (aralikSonu === undefined) return undefined;
    if (isaretciDegeri(isaretci) > aralikSonu) {
      sorunlar.push({ path: ogePath, message: `${isaretci.pay}/${isaretci.payda}, 0-${aralikSonu} doğrusunun dışında.` });
      return undefined;
    }
    return { ...isaretci, aralikSonu };
  });
}

function okuOrtakDogru(value: unknown, path: string, sorunlar: Sorunlar): OrtakSayiDogrusu | undefined {
  if (!isRecord(value)) {
    sorunlar.push({ path, message: '"dogru" bir {"aralikSonu","bolme"} nesnesi olmalıdır.' });
    return undefined;
  }
  const aralikSonu = okuTamSayi(value, "aralikSonu", path, sorunlar, ARALIK_SINIRI);
  const bolme = okuTamSayi(value, "bolme", path, sorunlar, BOLME_SINIRI);
  if (aralikSonu === undefined || bolme === undefined) return undefined;
  if (aralikSonu * bolme > EN_FAZLA_ARALIK) {
    sorunlar.push({ path, message: `Doğru en fazla ${EN_FAZLA_ARALIK} eş parçaya bölünebilir (aralikSonu × bolme).` });
    return undefined;
  }
  return { aralikSonu, bolme };
}

/** Ortak doğrudaki işaretçiler birer bölme çizgisinin üzerinde olmalı; aksi hâlde okunamazlar. */
function okuOrtakIsaretciler(
  value: unknown,
  dogru: OrtakSayiDogrusu | undefined,
  path: string,
  sorunlar: Sorunlar,
  sinir: { min: number; max: number }
) {
  return okuIsaretciler<SayiDogrusuIsaretcisi>(value, path, sorunlar, sinir, (_oge, isaretci, ogePath) => {
    if (!dogru) return isaretci;
    const cizgiUzerinde = (isaretci.pay * dogru.bolme) % isaretci.payda === 0;
    if (!cizgiUzerinde || isaretciDegeri(isaretci) > dogru.aralikSonu) {
      sorunlar.push({
        path: ogePath,
        message:
          `${isaretci.pay}/${isaretci.payda}, her birimi ${dogru.bolme} parçaya bölünmüş 0-${dogru.aralikSonu} ` +
          "doğrusunda bir bölme çizgisine denk gelmiyor.",
      });
      return undefined;
    }
    return isaretci;
  });
}

function okuIsaretciSecenekleri(value: unknown, isaretciIdleri: Set<string>, path: string, sorunlar: Sorunlar) {
  return okuKimlikliDizi<IsaretciSecenegi>(value, path, sorunlar, SECENEK_SINIRI, (oge, id, ogePath) => {
    const isaretciId = okuMetin(oge, "isaretciId", ogePath, sorunlar);
    if (!isaretciId) return undefined;
    if (isaretciIdleri.size > 0 && !isaretciIdleri.has(isaretciId)) {
      sorunlar.push({ path: `${ogePath}.isaretciId`, message: `"isaretciId" (${isaretciId}) bir işaretçinin id'si olmalıdır.` });
      return undefined;
    }
    return { id, isaretciId };
  });
}

/**
 * Soru kökü, veriden gelen hedef kesri anmıyorsa kök ile cevap anahtarı
 * ayrışmış olabilir. Yazım biçimi önemsizdir: "1 1/2", "1 tam 1/2" ve
 * "3/2" aynı hedefi anar.
 */
function kokHedefiAniyorMu(soru: string, hedef: Kesir, path: string, sorunlar: Sorunlar): boolean {
  if (metinKesriIceriyorMu(soru, hedef)) return true;
  sorunlar.push({ path: `${path}.soru`, message: `Soru kökü hedef kesri (${kesirMetni(hedef)}) içermelidir.` });
  return false;
}

function enAzUcSecenek<S>(secenekler: S[], path: string, sorunlar: Sorunlar): boolean {
  if (secenekler.length >= SECENEK_SINIRI.min) return true;
  sorunlar.push({
    path: `${path}.secenekler`,
    message: `Aynı içeriği gösteren şıklar çıkarıldıktan sonra en az ${SECENEK_SINIRI.min} farklı şık kalmalıdır.`,
  });
  return false;
}

// ---------------------------------------------------------------------------
// Görev doğrulayıcıları
// ---------------------------------------------------------------------------

interface OrtakAlanlar {
  soru: string;
  dogruSecenekId: string;
  bilgi?: string;
  onculu?: string;
  cozum?: string;
}

type Sonuc = GorselSoruDogrulamaSonucu<SayiDogrusuVerisi> | undefined;

function dogrulaSiralama(raw: Record<string, unknown>, ortak: OrtakAlanlar, path: string, sorunlar: Sorunlar): Sonuc {
  const siralama = okuSecim(raw, "siralama", SIRALAMA_YONLERI, path, sorunlar);
  const isaretciler = okuAyriIsaretciler(raw.isaretciler, `${path}.isaretciler`, sorunlar, { min: 2, max: 4 });
  const idler = new Set(isaretciler?.map((isaretci) => isaretci.id) ?? []);
  const secenekler = okuKimlikliDizi<SiralamaSecenegi>(
    raw.secenekler,
    `${path}.secenekler`,
    sorunlar,
    SECENEK_SINIRI,
    (oge, id, ogePath) => {
      const sira = oge.sira;
      const permutasyonMu =
        Array.isArray(sira) &&
        (idler.size === 0 || sira.length === idler.size) &&
        new Set(sira).size === sira.length &&
        sira.every((item) => typeof item === "string" && (idler.size === 0 || idler.has(item)));
      if (!permutasyonMu) {
        sorunlar.push({ path: `${ogePath}.sira`, message: '"sira", tüm işaretçi id\'lerinin tekrarsız bir sıralaması olmalıdır.' });
        return undefined;
      }
      return { id, sira: sira as string[] };
    }
  );
  if (!siralama || !isaretciler || !secenekler) return undefined;

  // Cevap anahtarı "siralama" alanından hesaplanır; kök ters yönü soruyorsa
  // onarım yanlış cevabı "doğru" yapardı — bu yüzden reddedilir.
  const kok = metniNormallestir(ortak.soru);
  const tersYon: SiralamaYonu = siralama === "kucuktenBuyuge" ? "buyuktenKucuge" : "kucuktenBuyuge";
  if (kok.includes(SIRALAMA_IFADELERI[tersYon]) && !kok.includes(SIRALAMA_IFADELERI[siralama])) {
    sorunlar.push({
      path: `${path}.soru`,
      message: `Soru kökü "${SIRALAMA_IFADELERI[tersYon]}" soruyor, ama "siralama" alanı "${siralama}".`,
    });
    return undefined;
  }

  const tekrarsiz = tekrarlananSecenekleriAyikla(secenekler, (secenek) => secenek.sira.join("|"), ortak.dogruSecenekId);
  if (!enAzUcSecenek(tekrarsiz, path, sorunlar)) return undefined;

  const beklenen = dogruSiralama(isaretciler, siralama);
  const uzlasma = dogruSecenegiUzlastir(
    tekrarsiz,
    ortak.dogruSecenekId,
    (secenek) => ayniSira(secenek.sira, beklenen),
    (id) => ({ id, sira: beklenen }),
    path,
    sorunlar
  );
  if (!uzlasma) return undefined;

  const veri: SayiDogrusuVerisi = {
    gorev: "siralama",
    bilgi: ortak.bilgi,
    onculu: ortak.onculu,
    isaretciler,
    siralama,
    secenekler: uzlasma.secenekler,
    dogruSecenekId: uzlasma.dogruSecenekId,
  };
  return { soru: ortak.soru, cozum: uzlasma.onarildi ? veridenCozum(veri) : ortak.cozum, veri };
}

function dogrulaHedefeEnYakin(raw: Record<string, unknown>, ortak: OrtakAlanlar, path: string, sorunlar: Sorunlar): Sonuc {
  const hedef = okuKesir(raw.hedef, `${path}.hedef`, sorunlar);
  const isaretciler = okuAyriIsaretciler(raw.isaretciler, `${path}.isaretciler`, sorunlar, { min: 3, max: 4 });
  const idler = new Set(isaretciler?.map((isaretci) => isaretci.id) ?? []);
  const secenekler = okuIsaretciSecenekleri(raw.secenekler, idler, `${path}.secenekler`, sorunlar);
  if (!hedef || !isaretciler || !secenekler) return undefined;
  if (!kokHedefiAniyorMu(ortak.soru, hedef, path, sorunlar)) return undefined;

  if (isaretciler.some((isaretci) => kesirlerEsitMi(isaretciKesri(isaretci), hedef))) {
    sorunlar.push({ path: `${path}.isaretciler`, message: "Hiçbir işaretçi hedef kesre eşit olmamalıdır." });
    return undefined;
  }
  const enYakin = hedefeEnYakinIsaretci(isaretciler, hedef);
  if (!enYakin) {
    sorunlar.push({ path: `${path}.isaretciler`, message: "İki işaretçi hedefe eşit uzaklıkta; tek bir en yakın olmalıdır." });
    return undefined;
  }

  const tekrarsiz = tekrarlananSecenekleriAyikla(secenekler, (secenek) => secenek.isaretciId, ortak.dogruSecenekId);
  if (!enAzUcSecenek(tekrarsiz, path, sorunlar)) return undefined;

  const uzlasma = dogruSecenegiUzlastir(
    tekrarsiz,
    ortak.dogruSecenekId,
    (secenek) => secenek.isaretciId === enYakin.id,
    (id) => ({ id, isaretciId: enYakin.id }),
    path,
    sorunlar
  );
  if (!uzlasma) return undefined;

  const veri: SayiDogrusuVerisi = {
    gorev: "hedefeEnYakin",
    bilgi: ortak.bilgi,
    onculu: ortak.onculu,
    isaretciler,
    hedef,
    secenekler: uzlasma.secenekler,
    dogruSecenekId: uzlasma.dogruSecenekId,
  };
  return { soru: ortak.soru, cozum: uzlasma.onarildi ? veridenCozum(veri) : ortak.cozum, veri };
}

function dogrulaIsaretliKesir(raw: Record<string, unknown>, ortak: OrtakAlanlar, path: string, sorunlar: Sorunlar): Sonuc {
  const dogru = okuOrtakDogru(raw.dogru, `${path}.dogru`, sorunlar);
  const isaretciler = okuOrtakIsaretciler(raw.isaretciler, dogru, `${path}.isaretciler`, sorunlar, { min: 1, max: 1 });
  const secenekler = okuKimlikliDizi<KesirSecenegi>(
    raw.secenekler,
    `${path}.secenekler`,
    sorunlar,
    SECENEK_SINIRI,
    (oge, id, ogePath) => {
      const kesir = okuKesir(oge, ogePath, sorunlar);
      return kesir ? { id, ...kesir } : undefined;
    }
  );
  if (!dogru || !isaretciler || !secenekler) return undefined;

  const isaretli = isaretciKesri(isaretciler[0]);
  // Değerce eşit iki şık (ör. 1/2 ve 2/4) aynı cevaptır.
  const tekrarsiz = tekrarlananSecenekleriAyikla(
    secenekler,
    (secenek) => {
      const toplamPay = (secenek.tam ?? 0) * secenek.payda + secenek.pay;
      const sade = sadelestir(toplamPay, secenek.payda);
      return `${sade.pay}/${sade.payda}`;
    },
    ortak.dogruSecenekId
  );
  if (!enAzUcSecenek(tekrarsiz, path, sorunlar)) return undefined;

  const uzlasma = dogruSecenegiUzlastir(
    tekrarsiz,
    ortak.dogruSecenekId,
    (secenek) => kesirlerEsitMi(secenek, isaretli),
    (id) => ({ id, ...isaretli }),
    path,
    sorunlar
  );
  if (!uzlasma) return undefined;

  const veri: SayiDogrusuVerisi = {
    gorev: "isaretliKesir",
    bilgi: ortak.bilgi,
    onculu: ortak.onculu,
    dogru,
    isaretciler,
    secenekler: uzlasma.secenekler,
    dogruSecenekId: uzlasma.dogruSecenekId,
  };
  return { soru: ortak.soru, cozum: uzlasma.onarildi ? veridenCozum(veri) : ortak.cozum, veri };
}

function dogrulaKesriGoster(raw: Record<string, unknown>, ortak: OrtakAlanlar, path: string, sorunlar: Sorunlar): Sonuc {
  const dogru = okuOrtakDogru(raw.dogru, `${path}.dogru`, sorunlar);
  const hedef = okuKesir(raw.hedef, `${path}.hedef`, sorunlar);
  const isaretciler = okuOrtakIsaretciler(raw.isaretciler, dogru, `${path}.isaretciler`, sorunlar, { min: 3, max: 4 });
  const idler = new Set(isaretciler?.map((isaretci) => isaretci.id) ?? []);
  const secenekler = okuIsaretciSecenekleri(raw.secenekler, idler, `${path}.secenekler`, sorunlar);
  if (!dogru || !hedef || !isaretciler || !secenekler) return undefined;
  if (!kokHedefiAniyorMu(ortak.soru, hedef, path, sorunlar)) return undefined;

  // Hiçbir işaretçi hedefte değilse model niyetini yalnızca işaretli şıkla
  // belli etmiştir (ör. "10. çizgide yonca" deyip yoncayı 2'ye koymak): o
  // şıkkın işaretçisi hedef noktaya taşınır. Çizim veriden yapıldığı için
  // soru yine tutarlı kalır; çözüm metni veriden yeniden yazılır.
  let cizimDuzeltildi = false;
  let hedeftekiler = isaretciler.filter((isaretci) => kesirlerEsitMi(isaretciKesri(isaretci), hedef));
  const hedefCizgide = (hedef.pay * dogru.bolme) % hedef.payda === 0 && kesirDegeri(hedef) <= dogru.aralikSonu;
  const isaretliId = secenekler.find((secenek) => secenek.id === ortak.dogruSecenekId)?.isaretciId;
  if (hedeftekiler.length === 0 && hedefCizgide && isaretliId) {
    const cizgi = kesirDegeri(hedef) * dogru.bolme;
    isaretciler.forEach((isaretci, index) => {
      if (isaretci.id === isaretliId) isaretciler[index] = { ...isaretci, pay: cizgi, payda: dogru.bolme };
    });
    hedeftekiler = isaretciler.filter((isaretci) => kesirlerEsitMi(isaretciKesri(isaretci), hedef));
    cizimDuzeltildi = true;
  }
  if (hedeftekiler.length !== 1) {
    sorunlar.push({
      path: `${path}.isaretciler`,
      message: `Tam olarak bir işaretçi hedef kesri (${kesirMetni(hedef)}) göstermelidir.`,
    });
    return undefined;
  }
  const dogruIsaretci = hedeftekiler[0];

  const tekrarsiz = tekrarlananSecenekleriAyikla(secenekler, (secenek) => secenek.isaretciId, ortak.dogruSecenekId);
  if (!enAzUcSecenek(tekrarsiz, path, sorunlar)) return undefined;

  const uzlasma = dogruSecenegiUzlastir(
    tekrarsiz,
    ortak.dogruSecenekId,
    (secenek) => secenek.isaretciId === dogruIsaretci.id,
    (id) => ({ id, isaretciId: dogruIsaretci.id }),
    path,
    sorunlar
  );
  if (!uzlasma) return undefined;

  const veri: SayiDogrusuVerisi = {
    gorev: "kesriGoster",
    bilgi: ortak.bilgi,
    onculu: ortak.onculu,
    dogru,
    isaretciler,
    hedef,
    secenekler: uzlasma.secenekler,
    dogruSecenekId: uzlasma.dogruSecenekId,
  };
  const yenidenYaz = uzlasma.onarildi || cizimDuzeltildi;
  return { soru: ortak.soru, cozum: yenidenYaz ? veridenCozum(veri) : ortak.cozum, veri };
}

function dogrula(raw: unknown, path: string, sorunlar: Sorunlar): Sonuc {
  if (!isRecord(raw)) {
    sorunlar.push({ path, message: '"veri" bir JSON nesnesi olmalıdır.' });
    return undefined;
  }
  const gorev = okuSecim(raw, "gorev", SAYI_DOGRUSU_GOREVLERI, path, sorunlar);
  const soru = okuMetin(raw, "soru", path, sorunlar);
  const dogruSecenekId = okuMetin(raw, "dogruSecenekId", path, sorunlar);
  if (!gorev || !soru || !dogruSecenekId) return undefined;

  const ortak: OrtakAlanlar = {
    soru,
    dogruSecenekId,
    bilgi: okuIstegeBagliMetin(raw, "bilgi"),
    onculu: okuIstegeBagliMetin(raw, "onculu"),
    cozum: okuIstegeBagliMetin(raw, "cozum"),
  };

  switch (gorev) {
    case "siralama":
      return dogrulaSiralama(raw, ortak, path, sorunlar);
    case "hedefeEnYakin":
      return dogrulaHedefeEnYakin(raw, ortak, path, sorunlar);
    case "isaretliKesir":
      return dogrulaIsaretliKesir(raw, ortak, path, sorunlar);
    case "kesriGoster":
      return dogrulaKesriGoster(raw, ortak, path, sorunlar);
  }
}

// ---------------------------------------------------------------------------
// Veriden üretilen metinler
// ---------------------------------------------------------------------------

function isaretciBul(veri: SayiDogrusuVerisi, id: string): SayiDogrusuIsaretcisi | undefined {
  return (veri.isaretciler as SayiDogrusuIsaretcisi[]).find((isaretci) => isaretci.id === id);
}

/** Cevap anahtarı veriye göre onarıldığında modelin çözüm metni yerine kullanılır. */
export function veridenCozum(veri: SayiDogrusuVerisi): string {
  switch (veri.gorev) {
    case "siralama": {
      const isaret = ` ${siralamaIsareti(veri.siralama)} `;
      const sirali = dogruSiralama(veri.isaretciler, veri.siralama)
        .map((id) => isaretciBul(veri, id))
        .filter((isaretci): isaretci is SayiDogrusuIsaretcisi => Boolean(isaretci));
      const degerler = veri.isaretciler.map((isaretci) => `${isaretci.simge} = ${isaretci.pay}/${isaretci.payda}`).join(", ");
      const birimNotu = veri.isaretciler.every((isaretci) => isaretci.pay === 1)
        ? "Birim kesirlerde payda büyüdükçe kesir küçülür. "
        : "";
      return (
        `${birimNotu}İşaretçilerin gösterdiği kesirler: ${degerler}. ` +
        `${buyukHarfle(SIRALAMA_IFADELERI[veri.siralama])} sıralama: ` +
        `${sirali.map((isaretci) => `${isaretci.pay}/${isaretci.payda}`).join(isaret)}, yani ` +
        `${sirali.map((isaretci) => isaretci.simge).join(isaret)}.`
      );
    }
    case "hedefeEnYakin": {
      const hedef = veri.hedef;
      const farklar = veri.isaretciler
        .map((isaretci) => `${isaretci.pay}/${isaretci.payda} → ${kesirMetni(fark(isaretciKesri(isaretci), hedef))}`)
        .join(", ");
      const enYakin = hedefeEnYakinIsaretci(veri.isaretciler, hedef);
      return (
        `Her kesrin ${kesirMetni(hedef)} ile farkı: ${farklar}. En küçük fark ` +
        `${enYakin ? `${enYakin.pay}/${enYakin.payda} (${enYakin.simge} ${enYakin.ad})` : ""} kesrindedir.`
      );
    }
    case "isaretliKesir": {
      const isaretci = veri.isaretciler[0];
      const cizgi = (isaretci.pay * veri.dogru.bolme) / isaretci.payda;
      return (
        `Her birim ${veri.dogru.bolme} eş parçaya bölünmüştür. ${isaretci.simge} 0'dan itibaren ${cizgi}. çizgidedir; ` +
        `bu nokta ${cizgi}/${veri.dogru.bolme} = ${isaretci.pay}/${isaretci.payda} kesrini gösterir.`
      );
    }
    case "kesriGoster": {
      const dogruIsaretci = veri.isaretciler.find((isaretci) => kesirlerEsitMi(isaretciKesri(isaretci), veri.hedef));
      const cizgi = kesirDegeri(veri.hedef) * veri.dogru.bolme;
      return (
        `${kesirMetni(veri.hedef)} = ${cizgi}/${veri.dogru.bolme}. Her birimi ${veri.dogru.bolme} eş parçaya bölünmüş ` +
        `doğruda 0'dan itibaren ${cizgi}. çizgi ${dogruIsaretci ? `${dogruIsaretci.simge} ${dogruIsaretci.ad}` : ""} ` +
        "ile işaretlidir."
      );
    }
  }
}

function dogruCevapMetni(veri: SayiDogrusuVerisi): string {
  const index = veri.secenekler.findIndex((secenek) => secenek.id === veri.dogruSecenekId);
  const harf = secenekHarfi(index);
  switch (veri.gorev) {
    case "siralama": {
      const isaret = ` ${siralamaIsareti(veri.siralama)} `;
      const sirali = dogruSiralama(veri.isaretciler, veri.siralama)
        .map((id) => isaretciBul(veri, id))
        .filter((isaretci): isaretci is SayiDogrusuIsaretcisi => Boolean(isaretci));
      return (
        `${harf}) ${sirali.map((isaretci) => isaretci.simge).join(isaret)} ` +
        `(${sirali.map((isaretci) => `${isaretci.pay}/${isaretci.payda}`).join(isaret)})`
      );
    }
    case "hedefeEnYakin":
    case "kesriGoster": {
      const secenek = veri.secenekler[index];
      const isaretci = secenek ? isaretciBul(veri, secenek.isaretciId) : undefined;
      return isaretci ? `${harf}) ${isaretci.simge} ${isaretci.ad} (${isaretci.pay}/${isaretci.payda})` : "";
    }
    case "isaretliKesir": {
      const secenek = veri.secenekler[index];
      return secenek ? `${harf}) ${kesirMetni(secenek)}` : "";
    }
  }
}

// ---------------------------------------------------------------------------
// Şemalar ve görev tanımları
// ---------------------------------------------------------------------------

const AYRI_ISARETCI = jsonNesne({
  id: JSON_METIN,
  simge: JSON_METIN,
  ad: JSON_METIN,
  pay: JSON_TAM_SAYI,
  payda: JSON_TAM_SAYI,
  aralikSonu: JSON_TAM_SAYI,
});
const ORTAK_ISARETCI = jsonNesne({ id: JSON_METIN, simge: JSON_METIN, ad: JSON_METIN, pay: JSON_TAM_SAYI, payda: JSON_TAM_SAYI });
const ORTAK_DOGRU = jsonNesne({ aralikSonu: JSON_TAM_SAYI, bolme: JSON_TAM_SAYI });
const ISARETCI_SECENEGI = jsonNesne({ id: JSON_METIN, isaretciId: JSON_METIN });

function gorevSemasi(gorev: string, alanlar: Record<string, JsonSemasi>, secenek: JsonSemasi): JsonSemasi {
  // `cozum` şıklardan önce: model önce çözer, sonra şıkları bu sonuca göre kurar.
  return jsonNesne({
    gorev: jsonGorev(gorev),
    bilgi: JSON_BOS_OLABILIR_METIN,
    onculu: JSON_BOS_OLABILIR_METIN,
    ...alanlar,
    soru: JSON_METIN,
    cozum: JSON_BOS_OLABILIR_METIN,
    secenekler: jsonDizi(secenek),
    dogruSecenekId: JSON_METIN,
  });
}

const ORTAK_SEMA_ACIKLAMASI = [
  '"bilgi": Görselin üstündeki kısa bilgi kutusu metni; istemiyorsan null.',
  '"onculu": Görselin hemen altında, soru kökünden önce gelen öncül cümle; istemiyorsan null.',
  '"soru": Soru kökü.',
  '"cozum": Kısa çözüm. ŞIKLARDAN ÖNCE yaz: önce çöz, sonra şıkları bu sonuca göre kur.',
  '"dogruSecenekId": "cozum"da bulduğun sonucu içeren şıkkın "id" değeri.',
];

const AYRI_ISARETCI_ACIKLAMASI =
  '"isaretciler": her öğe {"id","simge","ad","pay","payda","aralikSonu"}. Her işaretçi KENDİ sayı doğrusunda ' +
  'çizilir: doğru 0\'dan "aralikSonu"na (1-5) kadardır ve her birim "payda" (2-12) eş parçaya bölünür; ' +
  'işaretçi pay/payda noktasındadır. "simge" tek bir emoji, "ad" onun Türkçe adı.';

const ORTAK_ISARETCI_ACIKLAMASI =
  '"dogru": {"aralikSonu","bolme"} — TEK bir sayı doğrusu 0\'dan "aralikSonu"na (1-5) kadardır ve her birim ' +
  '"bolme" (2-12) eş parçaya bölünür (aralikSonu × bolme ≤ 30). "isaretciler": her öğe {"id","simge","ad",' +
  '"pay","payda"}; hepsi bu tek doğrunun üzerinde, birer bölme çizgisine denk gelen noktalardadır.';

const gorevler: GorselSoruTanimi<"sayi_dogrusu">["gorevler"] = {
  siralama: {
    gorev: "siralama",
    etiket: "Kesirleri sıralama",
    aciklama: "Öğrenci, her biri kendi sayı doğrusunda gösterilen kesirleri konumlarını yorumlayarak sıralar.",
    kesirKonusuGerekir: true,
    semaAciklamasi: [
      AYRI_ISARETCI_ACIKLAMASI + " 2-4 işaretçi.",
      '"siralama": "kucuktenBuyuge" veya "buyuktenKucuge"; soru kökü aynı yönü açıkça sormalı.',
      '"secenekler": 3-5 öğe; her öğe {"id","sira"} — işaretçi id\'lerinin o şıktaki sırası.',
    ],
    kurallar: [
      "Doğruların \"aralikSonu\" değerlerini farklı seç ki öğrenci uzunluğa değil birim aralığa baksın.",
      "Yanlış şıklar \"paydası büyük olan kesir büyüktür\" gibi yaygın yanılgıları yansıtmalı.",
    ],
    ornek: {
      tip: "sayi_dogrusu",
      veri: {
        gorev: "siralama",
        bilgi:
          "Bütünün eş parçalarından yalnızca birini gösteren kesre birim kesir denir. Birim kesirlerin payı 1'dir.",
        onculu: "Yukarıda bazı birim kesirlerin sayı doğrusu üzerindeki yerleri böcek görselleriyle gösterilmiştir.",
        isaretciler: [
          { id: "i1", simge: "🐌", ad: "salyangoz", pay: 1, payda: 3, aralikSonu: 2 },
          { id: "i2", simge: "🐞", ad: "uğur böceği", pay: 1, payda: 8, aralikSonu: 1 },
          { id: "i3", simge: "🐝", ad: "arı", pay: 1, payda: 5, aralikSonu: 3 },
        ],
        siralama: "kucuktenBuyuge",
        soru: "Böceklerle işaretlenen birim kesirlerin küçükten büyüğe doğru sıralanışı aşağıdakilerden hangisidir?",
        cozum:
          "Birim kesirlerde payda büyüdükçe kesir küçülür: 1/8 < 1/5 < 1/3. Bu nedenle sıralama 🐞 < 🐝 < 🐌 olur.",
        secenekler: [
          { id: "A", sira: ["i1", "i3", "i2"] },
          { id: "B", sira: ["i2", "i3", "i1"] },
          { id: "C", sira: ["i3", "i2", "i1"] },
          { id: "D", sira: ["i2", "i1", "i3"] },
        ],
        dogruSecenekId: "B",
      },
    },
    jsonSemasi: gorevSemasi(
      "siralama",
      { isaretciler: jsonDizi(AYRI_ISARETCI), siralama: jsonSecim(SIRALAMA_YONLERI) },
      jsonNesne({ id: JSON_METIN, sira: jsonDizi(JSON_METIN) })
    ),
  },
  hedefeEnYakin: {
    gorev: "hedefeEnYakin",
    etiket: "Hedef kesre en yakın olanı bulma",
    aciklama:
      "Öğrenci, kendi sayı doğrularında gösterilen kesirlerden verilen bir hedef kesre (ör. 1/2 veya 1) en yakın " +
      "olanı bulur; bunun için kesirleri hedefle karşılaştırması gerekir.",
    kesirKonusuGerekir: true,
    semaAciklamasi: [
      AYRI_ISARETCI_ACIKLAMASI + " 3-4 işaretçi; pay 1 olmak zorunda değil.",
      '"hedef": {"tam","pay","payda"} — hedef kesir (tam yoksa null). Soru kökü bu kesri aynen (ör. "1/2") yazmalı.',
      '"secenekler": 3-5 öğe; her öğe {"id","isaretciId"}.',
    ],
    kurallar: [
      "Hiçbir işaretçi hedefe eşit olmamalı ve iki işaretçi hedefe eşit uzaklıkta olmamalı; sistem uzaklıkları hesaplar.",
      "En az bir çeldirici hedefe yakın görünmeli (ör. payı büyük ama hedefe uzak bir kesir) ki öğrenci gerçekten karşılaştırsın.",
    ],
    ornek: {
      tip: "sayi_dogrusu",
      veri: {
        gorev: "hedefeEnYakin",
        bilgi: null,
        onculu: "Yukarıdaki her sayı doğrusunda bir hayvanın bulunduğu nokta işaretlenmiştir.",
        isaretciler: [
          { id: "i1", simge: "🐞", ad: "uğur böceği", pay: 2, payda: 5, aralikSonu: 1 },
          { id: "i2", simge: "🐝", ad: "arı", pay: 3, payda: 4, aralikSonu: 1 },
          { id: "i3", simge: "🐌", ad: "salyangoz", pay: 5, payda: 8, aralikSonu: 1 },
          { id: "i4", simge: "🦋", ad: "kelebek", pay: 1, payda: 8, aralikSonu: 1 },
        ],
        hedef: { tam: null, pay: 1, payda: 2 },
        soru: "Hangi hayvanın bulunduğu noktanın gösterdiği kesir 1/2'ye en yakındır?",
        cozum:
          "Paydaları 40'ta eşitleyelim: 1/2 = 20/40, 2/5 = 16/40, 3/4 = 30/40, 5/8 = 25/40, 1/8 = 5/40. " +
          "20/40'a en yakın olan 16/40'tır; yani uğur böceği.",
        secenekler: [
          { id: "A", isaretciId: "i2" },
          { id: "B", isaretciId: "i1" },
          { id: "C", isaretciId: "i3" },
          { id: "D", isaretciId: "i4" },
        ],
        dogruSecenekId: "B",
      },
    },
    jsonSemasi: gorevSemasi(
      "hedefeEnYakin",
      { isaretciler: jsonDizi(AYRI_ISARETCI), hedef: JSON_KESIR },
      ISARETCI_SECENEGI
    ),
  },
  isaretliKesir: {
    gorev: "isaretliKesir",
    etiket: "İşaretli kesri bulma",
    aciklama:
      "Tek bir sayı doğrusunda işaretlenmiş noktanın hangi kesri gösterdiğini, birimin kaç parçaya bölündüğünü " +
      "okuyarak bulur.",
    kesirKonusuGerekir: true,
    semaAciklamasi: [
      ORTAK_ISARETCI_ACIKLAMASI + " Tam olarak 1 işaretçi.",
      '"secenekler": 3-5 öğe; her öğe {"id","tam","pay","payda"} — bir kesir (tam yoksa null).',
    ],
    kurallar: [
      "Birden büyük bir kesir (ör. 7/5) veya birimi 1'den farklı bölünmüş bir doğru seçmek soruyu güçlendirir.",
      "Çeldiriciler tipik okuma hatalarını yansıtmalı: çizgileri tüm doğru boyunca saymak (7/10), payı ve paydayı " +
        "ters yazmak (5/7), 1'den sonra yeniden saymak (2/5).",
      "Değerce eşit iki şık (ör. 1/2 ve 2/4) yazma.",
    ],
    ornek: {
      tip: "sayi_dogrusu",
      veri: {
        gorev: "isaretliKesir",
        bilgi: null,
        onculu: null,
        dogru: { aralikSonu: 2, bolme: 5 },
        isaretciler: [{ id: "i1", simge: "🐢", ad: "kaplumbağa", pay: 7, payda: 5 }],
        soru: "Kaplumbağanın bulunduğu nokta hangi kesri gösterir?",
        cozum:
          "Her birim 5 eş parçaya bölünmüştür, yani her aralık 1/5'tir. Kaplumbağa 0'dan itibaren 7. çizgidedir; " +
          "bu nedenle 7/5'i gösterir.",
        secenekler: [
          { id: "A", tam: null, pay: 7, payda: 10 },
          { id: "B", tam: null, pay: 7, payda: 5 },
          { id: "C", tam: null, pay: 5, payda: 7 },
          { id: "D", tam: null, pay: 2, payda: 5 },
        ],
        dogruSecenekId: "B",
      },
    },
    jsonSemasi: gorevSemasi(
      "isaretliKesir",
      { dogru: ORTAK_DOGRU, isaretciler: jsonDizi(ORTAK_ISARETCI) },
      jsonNesne({ id: JSON_METIN, tam: JSON_BOS_OLABILIR_TAM_SAYI, pay: JSON_TAM_SAYI, payda: JSON_TAM_SAYI })
    ),
  },
  kesriGoster: {
    gorev: "kesriGoster",
    etiket: "Verilen kesri sayı doğrusunda gösterme",
    aciklama:
      "Tek bir sayı doğrusunda birkaç nokta işaretlidir; öğrenci verilen kesrin hangi noktada olduğunu bulur. Hedef " +
      "kesir, doğrunun bölmesinden farklı ama denk bir paydayla verilirse (ör. 8'e bölünmüş doğruda 3/4) öğrenci " +
      "denk kesir düşünmek zorunda kalır.",
    kesirKonusuGerekir: true,
    semaAciklamasi: [
      ORTAK_ISARETCI_ACIKLAMASI + " 3-4 işaretçi.",
      '"hedef": {"tam","pay","payda"} — gösterilmesi istenen kesir (tam yoksa null). Soru kökü bu kesri aynen yazmalı.',
      '"secenekler": 3-5 öğe; her öğe {"id","isaretciId"}.',
    ],
    kurallar: [
      "Tam olarak bir işaretçi hedef kesre eşit olmalı; sistem bunu hesaplar.",
      "Çeldirici noktalar tipik hataları yansıtmalı (ör. 3/4 için 3/8'deki nokta — payı aynı sanmak).",
    ],
    ornek: {
      tip: "sayi_dogrusu",
      veri: {
        gorev: "kesriGoster",
        bilgi: null,
        onculu: "Aşağıdaki sayı doğrusunda bazı noktalar hayvan görselleriyle işaretlenmiştir.",
        dogru: { aralikSonu: 1, bolme: 8 },
        isaretciler: [
          { id: "i1", simge: "🐞", ad: "uğur böceği", pay: 3, payda: 8 },
          { id: "i2", simge: "🐝", ad: "arı", pay: 4, payda: 8 },
          { id: "i3", simge: "🐌", ad: "salyangoz", pay: 6, payda: 8 },
          { id: "i4", simge: "🦋", ad: "kelebek", pay: 7, payda: 8 },
        ],
        hedef: { tam: null, pay: 3, payda: 4 },
        soru: "3/4 kesri sayı doğrusunda hangi hayvanla gösterilmiştir?",
        cozum: "3/4 = 6/8'dir. 8 eş parçaya bölünmüş doğruda 0'dan itibaren 6. çizgide salyangoz vardır.",
        secenekler: [
          { id: "A", isaretciId: "i1" },
          { id: "B", isaretciId: "i2" },
          { id: "C", isaretciId: "i3" },
          { id: "D", isaretciId: "i4" },
        ],
        dogruSecenekId: "C",
      },
    },
    jsonSemasi: gorevSemasi(
      "kesriGoster",
      { dogru: ORTAK_DOGRU, isaretciler: jsonDizi(ORTAK_ISARETCI), hedef: JSON_KESIR },
      ISARETCI_SECENEGI
    ),
  },
};

export const sayiDogrusuTanimi: GorselSoruTanimi<"sayi_dogrusu"> = {
  tip: "sayi_dogrusu",
  etiket: "Sayı doğrusunda kesirler",
  aciklama:
    "Kesirler sayı doğrusu üzerinde emoji işaretçilerle gösterilir; sistem her işaretçiyi verideki pay/payda " +
    "değerine göre kendisi çizer.",
  gorselKategorisi: "fonksiyonel",
  gorselStratejisi: "svg",
  kesirKonusuGerekir: true,
  kurallar: [
    "İşaretçilerin konumunu SEN çizmezsin; sistem her işaretçiyi pay/payda noktasına kendisi çizer ve doğru cevabı " +
      "bu değerlerden hesaplar. Bu yüzden sayılar kesin ve tutarlı olmalı.",
    "Her işaretçinin simgesi ve gösterdiği değer farklı olmalı.",
  ],
  ortakSemaAciklamasi: ORTAK_SEMA_ACIKLAMASI,
  gorevler,
  dogrula,
  dogruCevapMetni,
};
