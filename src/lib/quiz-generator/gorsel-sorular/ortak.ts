import type {
  GorselSoruGorevHaritasi,
  GorselSoruTipi,
  GorselSoruVeriHaritasi,
  GorselStratejisi,
  Kesir,
  SecenekKimligi,
} from "@/types/gorsel-soru";

/** `QuizValidationIssue` ile yapısal olarak aynı; aynı diziye eklenebilir. */
export interface GorselSoruSorunu {
  path: string;
  message: string;
}

export interface GorselSoruDogrulamaSonucu<V> {
  /** Soru kökü — sorunun ortak `prompt` alanına taşınır. */
  soru: string;
  /** Çözüm açıklaması — sorunun ortak `answerExplanation` alanına taşınır. */
  cozum?: string;
  veri: V;
}

/**
 * Fonksiyonel görseller matematiğin parçasıdır ve her zaman veriden SVG
 * ile çizilir; stratejileri bu yüzden sabittir. Yalnızca dekoratif
 * görsellerin stratejisi değiştirilebilir.
 */
type GorselAyari =
  | { gorselKategorisi: "fonksiyonel"; gorselStratejisi: "svg" }
  | { gorselKategorisi: "dekoratif"; gorselStratejisi: GorselStratejisi };

/**
 * Bir tipin tek bir görevi (ör. sayı doğrusunda "verilen kesri gösterme").
 * Her görevin kendi veri şeması, kuralları ve örneği vardır; Prompt
 * Builder yalnızca plana atanmış görevleri modele gösterir.
 */
export interface GorselSoruGorevTanimi<K extends GorselSoruTipi> {
  gorev: GorselSoruGorevHaritasi[K];
  etiket: string;
  /** Öğrenciden ne istendiği — prompt'ta gösterilir. */
  aciklama: string;
  /** `true` ise yalnızca konusu kesirler olan sorulara atanır. */
  kesirKonusuGerekir: boolean;
  /** `veri` alanlarının prompt'ta gösterilen açıklaması (her öğe bir satır). */
  semaAciklamasi: readonly string[];
  /** Göreve özgü içerik kuralları (prompt'ta gösterilir). */
  kurallar: readonly string[];
  /** Prompt'a birebir konan, kendi doğrulayıcısından geçen örnek çıktı. */
  ornek: { tip: K; veri: Record<string, unknown> };
  /**
   * `veri` için OpenAI structured outputs (strict) uyumlu JSON Schema:
   * her alan zorunlu, isteğe bağlı alanlar `null` alabilir, fazladan alan yok.
   */
  jsonSemasi: JsonSemasi;
}

/**
 * Bir görsel soru tipinin React'ten bağımsız (sunucuda da çalışan) tanımı:
 * görevleri (her biri şema + örnek), doğrulayıcısı ve görsel stratejisi.
 * İstemci tarafındaki registry bu tanıma yalnızca bir React bileşeni ekler.
 */
export type GorselSoruTanimi<K extends GorselSoruTipi> = GorselAyari & {
  tip: K;
  etiket: string;
  aciklama: string;
  /** `true` ise tip yalnızca konusu kesirler olan sorulara atanır. */
  kesirKonusuGerekir: boolean;
  /** Tüm görevlerde geçerli içerik kuralları (prompt'ta gösterilir). */
  kurallar: readonly string[];
  /** Tüm görevlerde ortak `veri` alanlarının açıklaması (her görevin kendi açıklamasına eklenir). */
  ortakSemaAciklamasi: readonly string[];
  gorevler: { readonly [G in GorselSoruGorevHaritasi[K]]: GorselSoruGorevTanimi<K> };
  dogrula(
    veri: unknown,
    path: string,
    sorunlar: GorselSoruSorunu[]
  ): GorselSoruDogrulamaSonucu<GorselSoruVeriHaritasi[K]> | undefined;
  /** Cevap anahtarında gösterilen, doğru şıkkın okunabilir özeti. */
  dogruCevapMetni(veri: GorselSoruVeriHaritasi[K]): string;
};

// ---------------------------------------------------------------------------
// JSON Schema yardımcıları (OpenAI structured outputs, strict mod)
// ---------------------------------------------------------------------------

export type JsonSemasi = Record<string, unknown>;

/** Strict mod: tüm alanlar zorunlu ve fazladan alana izin yok. Alan sırası, modelin yazma sırasıdır. */
export function jsonNesne(alanlar: Record<string, JsonSemasi>): JsonSemasi {
  return { type: "object", additionalProperties: false, required: Object.keys(alanlar), properties: alanlar };
}

export function jsonDizi(ogeler: JsonSemasi): JsonSemasi {
  return { type: "array", items: ogeler };
}

export function jsonSecim(degerler: readonly string[]): JsonSemasi {
  return { type: "string", enum: [...degerler] };
}

export const JSON_METIN: JsonSemasi = { type: "string" };
/** Strict modda isteğe bağlı alan: her zaman yazılır, yoksa `null` olur. */
export const JSON_BOS_OLABILIR_METIN: JsonSemasi = { type: ["string", "null"] };
export const JSON_TAM_SAYI: JsonSemasi = { type: "integer" };
export const JSON_BOS_OLABILIR_TAM_SAYI: JsonSemasi = { type: ["integer", "null"] };
export const JSON_MANTIKSAL: JsonSemasi = { type: "boolean" };

/** Görevi sabitleyen alan: her görev şemasında tek geçerli değer o görevin adıdır. */
export function jsonGorev(gorev: string): JsonSemasi {
  return jsonSecim([gorev]);
}

export const JSON_KESIR: JsonSemasi = jsonNesne({
  tam: JSON_BOS_OLABILIR_TAM_SAYI,
  pay: JSON_TAM_SAYI,
  payda: JSON_TAM_SAYI,
});

// ---------------------------------------------------------------------------
// Kesir yardımcıları
// ---------------------------------------------------------------------------

export function kesirDegeri(kesir: Kesir): number {
  return (kesir.tam ?? 0) + kesir.pay / kesir.payda;
}

/** Değerce eşitlik; paydaların çarpımıyla, kayan nokta hatası olmadan. */
export function kesirlerEsitMi(a: Kesir, b: Kesir): boolean {
  const aPay = (a.tam ?? 0) * a.payda + a.pay;
  const bPay = (b.tam ?? 0) * b.payda + b.pay;
  return aPay * b.payda === bPay * a.payda;
}

/** "7/4" veya "2 1/3" */
export function kesirMetni(kesir: Kesir): string {
  const kesirKismi = `${kesir.pay}/${kesir.payda}`;
  return kesir.tam !== undefined ? `${kesir.tam} ${kesirKismi}` : kesirKismi;
}

// "1 3/4" ve "1 tam 3/4" tek bir tam sayılı kesirdir; içindeki "3/4" ayrı bir kesir sayılmamalı.
const METINDEKI_KESIR = /(?:(\d+)\s+(?:tam\s+)?)?(\d+)\s*\/\s*(\d+)/g;

export interface MetindekiKesir {
  metin: string;
  kesir: Kesir;
}

/** Serbest metindeki kesirleri ("3/4", "1 3/4", "1 tam 3/4") bulur. */
export function metindekiKesirler(metin: string): MetindekiKesir[] {
  return Array.from(metin.matchAll(METINDEKI_KESIR)).map((eslesme) => ({
    metin: eslesme[0].replace(/\s+/g, " ").trim(),
    kesir: {
      ...(eslesme[1] ? { tam: Number(eslesme[1]) } : {}),
      pay: Number(eslesme[2]),
      payda: Number(eslesme[3]),
    },
  }));
}

/** Metin, verilen kesre değerce eşit bir kesir içeriyor mu (yazım biçiminden bağımsız)? */
export function metinKesriIceriyorMu(metin: string, kesir: Kesir): boolean {
  return metindekiKesirler(metin).some((bulunan) => kesirlerEsitMi(bulunan.kesir, kesir));
}

const KESIR_PAY_SINIRI = { min: 0, max: 999 };
const KESIR_PAYDA_SINIRI = { min: 1, max: 100 };
const KESIR_TAM_SINIRI = { min: 1, max: 99 };

/** `{tam?, pay, payda}` okur; strict çıktıda `tam: null` eksik sayılır. */
export function okuKesir(
  value: unknown,
  path: string,
  sorunlar: GorselSoruSorunu[]
): Kesir | undefined {
  if (!isRecord(value)) {
    sorunlar.push({ path, message: "Kesir bir {\"tam\",\"pay\",\"payda\"} nesnesi olmalıdır." });
    return undefined;
  }
  const pay = okuTamSayi(value, "pay", path, sorunlar, KESIR_PAY_SINIRI);
  const payda = okuTamSayi(value, "payda", path, sorunlar, KESIR_PAYDA_SINIRI);
  const tamVar = !yokMu(value.tam);
  const tam = tamVar ? okuTamSayi(value, "tam", path, sorunlar, KESIR_TAM_SINIRI) : undefined;
  if (pay === undefined || payda === undefined || (tamVar && tam === undefined)) return undefined;
  return tam !== undefined ? { tam, pay, payda } : { pay, payda };
}

// ---------------------------------------------------------------------------

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function okuMetin(
  record: Record<string, unknown>,
  alan: string,
  path: string,
  sorunlar: GorselSoruSorunu[]
): string | undefined {
  const value = record[alan];
  if (typeof value !== "string" || value.trim().length === 0) {
    sorunlar.push({ path: `${path}.${alan}`, message: `"${alan}" boş olmayan bir metin olmalıdır.` });
    return undefined;
  }
  return value.trim();
}

export function okuIstegeBagliMetin(record: Record<string, unknown>, alan: string): string | undefined {
  const value = record[alan];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

/** Strict structured output'ta isteğe bağlı alanlar `null` gelir; `null` ve eksik alan aynı sayılır. */
export function yokMu(value: unknown): value is null | undefined {
  return value === undefined || value === null;
}

/** Türkçe metinlerde büyük/küçük harf ve boşluk farkını yok sayar. */
export function metniNormallestir(metin: string): string {
  return metin.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
}

export function okuTamSayi(
  record: Record<string, unknown>,
  alan: string,
  path: string,
  sorunlar: GorselSoruSorunu[],
  sinir: { min: number; max: number }
): number | undefined {
  const value = record[alan];
  if (typeof value !== "number" || !Number.isInteger(value) || value < sinir.min || value > sinir.max) {
    sorunlar.push({
      path: `${path}.${alan}`,
      message: `"${alan}" ${sinir.min} ile ${sinir.max} arasında bir tam sayı olmalıdır.`,
    });
    return undefined;
  }
  return value;
}

export function okuSecim<T extends string>(
  record: Record<string, unknown>,
  alan: string,
  izinli: readonly T[],
  path: string,
  sorunlar: GorselSoruSorunu[]
): T | undefined {
  const value = record[alan];
  if (typeof value !== "string" || !(izinli as readonly string[]).includes(value)) {
    sorunlar.push({
      path: `${path}.${alan}`,
      message: `"${alan}" şu değerlerden biri olmalıdır: ${izinli.join(", ")}.`,
    });
    return undefined;
  }
  return value as T;
}

/**
 * Bir nesne dizisini okur; her öğenin boş olmayan, tekrarsız bir `id`si
 * olduğunu doğrular ve öğenin geri kalanını `okuOge` ile okur. Herhangi bir
 * öğe geçersizse `undefined` döner (sorunlar yine de toplanır).
 */
export function okuKimlikliDizi<T extends SecenekKimligi>(
  value: unknown,
  path: string,
  sorunlar: GorselSoruSorunu[],
  sinir: { min: number; max: number },
  okuOge: (oge: Record<string, unknown>, id: string, ogePath: string) => T | undefined
): T[] | undefined {
  if (!Array.isArray(value) || value.length < sinir.min || value.length > sinir.max) {
    sorunlar.push({ path, message: `"${path}" ${sinir.min}-${sinir.max} öğeli bir dizi olmalıdır.` });
    return undefined;
  }

  const sonuc: T[] = [];
  const gorulenIdler = new Set<string>();
  let gecerli = true;

  value.forEach((oge, index) => {
    const ogePath = `${path}[${index}]`;
    if (!isRecord(oge)) {
      sorunlar.push({ path: ogePath, message: "Her öğe bir JSON nesnesi olmalıdır." });
      gecerli = false;
      return;
    }
    const id = okuMetin(oge, "id", ogePath, sorunlar);
    if (!id) {
      gecerli = false;
      return;
    }
    if (gorulenIdler.has(id)) {
      sorunlar.push({ path: `${ogePath}.id`, message: `Tekrarlanan id: ${id}` });
      gecerli = false;
      return;
    }
    gorulenIdler.add(id);

    const okunan = okuOge(oge, id, ogePath);
    if (!okunan) {
      gecerli = false;
      return;
    }
    sonuc.push(okunan);
  });

  return gecerli ? sonuc : undefined;
}

/** 0 → "A", 1 → "B", … Şık harfi her zaman sıradan türetilir, modelin id'sinden değil. */
export function secenekHarfi(index: number): string {
  return String.fromCharCode(65 + index);
}

/**
 * Aynı içeriği gösteren şıkları (ör. iki şıkta aynı sıralama) tekrarsız
 * hâle getirir. Modelin doğru diye işaretlediği şık tekrarların içindeyse
 * o korunur; diğerleri atılır. Kalan şık sayısını çağıran denetler.
 */
export function tekrarlananSecenekleriAyikla<S extends SecenekKimligi>(
  secenekler: S[],
  anahtar: (secenek: S) => string,
  korunacakId: string
): S[] {
  const secilen = new Map<string, S>();
  for (const secenek of secenekler) {
    const deger = anahtar(secenek);
    if (!secilen.has(deger) || secenek.id === korunacakId) secilen.set(deger, secenek);
  }
  return secenekler.filter((secenek) => secilen.get(anahtar(secenek)) === secenek);
}

export interface UzlasmaSonucu<S> {
  secenekler: S[];
  dogruSecenekId: string;
  /** Model yanlış şıkkı işaretlediyse veya doğru cevabı hiçbir şıkka koymadıysa `true`. */
  onarildi: boolean;
}

/**
 * Doğru cevabın veriden hesaplanabildiği (fonksiyonel) tipler için:
 * modelin işaretlediği şık ile veri çelişirse yanıtı reddetmek yerine
 * cevap anahtarını veriye göre onarır. Çizim her zaman veriden yapıldığı
 * için doğruluğun tek kaynağı veridir.
 *
 * - Doğru cevap tam olarak bir şıkta varsa `dogruSecenekId` ona çekilir.
 * - Hiçbir şıkta yoksa, modelin (yanlışlıkla) doğru diye işaretlediği şıkkın
 *   içeriği doğru cevapla değiştirilir.
 * - Birden fazla şıkta varsa veya işaretli id hiçbir şıkta yoksa onarılamaz.
 */
export function dogruSecenegiUzlastir<S extends SecenekKimligi>(
  secenekler: S[],
  dogruSecenekId: string,
  dogruMu: (secenek: S) => boolean,
  dogruSecenekOlustur: (id: string) => S,
  path: string,
  sorunlar: GorselSoruSorunu[]
): UzlasmaSonucu<S> | undefined {
  if (!secenekler.some((secenek) => secenek.id === dogruSecenekId)) {
    sorunlar.push({
      path: `${path}.dogruSecenekId`,
      message: `"dogruSecenekId" (${dogruSecenekId}) şıklardan birinin id'si olmalıdır.`,
    });
    return undefined;
  }

  const dogrular = secenekler.filter(dogruMu);
  if (dogrular.length > 1) {
    sorunlar.push({
      path: `${path}.secenekler`,
      message: "Veriden hesaplanan doğru cevap birden fazla şıkta var; tam olarak bir doğru şık olmalıdır.",
    });
    return undefined;
  }

  if (dogrular.length === 1) {
    return { secenekler, dogruSecenekId: dogrular[0].id, onarildi: dogrular[0].id !== dogruSecenekId };
  }

  return {
    secenekler: secenekler.map((secenek) => (secenek.id === dogruSecenekId ? dogruSecenekOlustur(secenek.id) : secenek)),
    dogruSecenekId,
    onarildi: true,
  };
}

/**
 * Veriden hesaplanan doğru cevabın şıklar arasında TAM OLARAK bir kez yer
 * aldığını ve modelin işaretlediği `dogruSecenekId` ile aynı olduğunu
 * doğrular. Böylece çizim ile cevap anahtarı hiçbir zaman çelişemez.
 */
export function dogruSecenegiDogrula<S extends SecenekKimligi>(
  secenekler: S[],
  dogruSecenekId: string,
  dogruMu: (secenek: S) => boolean,
  path: string,
  sorunlar: GorselSoruSorunu[]
): boolean {
  if (!secenekler.some((secenek) => secenek.id === dogruSecenekId)) {
    sorunlar.push({
      path: `${path}.dogruSecenekId`,
      message: `"dogruSecenekId" (${dogruSecenekId}) şıklardan birinin id'si olmalıdır.`,
    });
    return false;
  }

  const dogrular = secenekler.filter(dogruMu);
  if (dogrular.length !== 1) {
    sorunlar.push({
      path: `${path}.secenekler`,
      message:
        dogrular.length === 0
          ? "Veriden hesaplanan doğru cevap şıkların hiçbirinde yok."
          : "Veriden hesaplanan doğru cevap birden fazla şıkta var; tam olarak bir doğru şık olmalıdır.",
    });
    return false;
  }

  if (dogrular[0].id !== dogruSecenekId) {
    sorunlar.push({
      path: `${path}.dogruSecenekId`,
      message:
        `"dogruSecenekId" ${dogruSecenekId} olarak işaretlenmiş, ancak veriden hesaplanan doğru şık ` +
        `${dogrular[0].id}.`,
    });
    return false;
  }

  return true;
}
