import {
  dilHatasi,
  metindekiTamSayilar,
  senaryodaGeciyorMu,
} from "@/lib/quiz-generator/gorsel-sorular/gercek-hayat-senaryo";
import { esitMi, kesirGosterimi, oranYap, tamSayiMi } from "@/lib/quiz-generator/gorsel-sorular/kesir-aritmetigi";
import {
  JSON_METIN,
  isRecord,
  jsonGorev,
  jsonNesne,
  metindekiKesirler,
  metniNormallestir,
  okuMetin,
  okuSecim,
  secenekHarfi,
  type GorselSoruDogrulamaSonucu,
  type GorselSoruSorunu,
  type JsonSemasi,
} from "@/lib/quiz-generator/gorsel-sorular/ortak";
import type { Rastgele } from "@/lib/quiz-generator/gorsel-sorular/senaryo-sayilari";
import type { GorselCizimPlani, GorselSoruPlani, MetinSecenegi, SenaryoCikarimPlani } from "@/types/gorsel-soru";

/**
 * Planlı görsel tiplerin (daire_kesir, kesir_cubugu…) ortak doğrulaması —
 * references/gorsel-tip-haritasi.md: "görsel = veriden çizilir, doğru cevabı
 * KOD hesaplar, tutarsızsa reddedilir".
 *
 * Blueprint her soru için iki plan kurar: `cizim` (görselin verisi) ve
 * `cikarim` (metne girecek değerler, doğru cevap ve hata modelli şıklar).
 * Model yalnızca `senaryo` ve `soru` yazar; burada metnin planın
 * değerlerini, adlarını ve ifadelerini içerdiği, plan dışı sayı (cevabı ele
 * veren ya da çizimle çelişen) içermediği denetlenir. Şıklar ve çözüm
 * plandan gelir; görsel de plandan çizildiği için cevapla çelişemez.
 */

const EN_FAZLA_CUMLE = 5;
const SENARYO_EN_KISA = 40;

export const PLANLI_GORSEL_SEMA_ACIKLAMASI: readonly string[] = [
  '"senaryo": SORU PLANI\'ndaki "Bağlam"ı kullanarak, verilen sayıların HEPSİNİ (aynı yazımla, rakamla) ve yalnızca ' +
    'onları içeren 1-3 cümlelik, akıcı bir metin. "Adlar" verildiyse bu adları aynen kullan.',
  '"soru": "Örnek soru kökü"ne benzeyen tek ve net bir soru cümlesi (sonu "?" ile biter); planda "Soru kökünde ' +
    'geçmeli" denen ifadeyi içermeli.',
  "Örnek çıktı yalnızca YAPIYI gösterir: plandaki Bağlam'ın sektöründe ve kişileriyle, kendi cümlelerinle yaz; örnek " +
    "metni ya da sayıları kopyalama (sistem plan dışı sayıları ve eksik bağlam sözcüklerini reddeder).",
  "GÖRSELİ VE ŞIKLARI SİSTEM ÜRETİR: görsel planın verisinden çizilir, doğru cevabı ve çeldiricileri (yaygın öğrenci " +
    "hatalarının sonuçları) sistem hesaplar. Sen şık, hesap ya da cevap yazmazsın; cevabı metinde VERMEZSİN.",
];

/** Model şeması: yalnızca metin. Görsel, cevap ve şıklar plandan gelir. */
export function planliGorselSema(gorev: string): JsonSemasi {
  return jsonNesne({ gorev: jsonGorev(gorev), senaryo: JSON_METIN, soru: JSON_METIN });
}

function cumleSayisi(metin: string): number {
  return metin.split(/[.!?]+(?:\s|$)/).filter((cumle) => cumle.trim().length > 0).length;
}

/** Metnin plana uyup uymadığını denetler; ilk sorunda durur. */
function metniDenetle(
  senaryo: string,
  soru: string,
  plan: SenaryoCikarimPlani,
  serbestSayilar: readonly number[],
  path: string,
  sorunlar: GorselSoruSorunu[]
): boolean {
  const hata = (alan: "senaryo" | "soru", message: string) => {
    sorunlar.push({ path: `${path}.${alan}`, message });
    return false;
  };
  if (senaryo.length < SENARYO_EN_KISA) return hata("senaryo", `"senaryo" en az ${SENARYO_EN_KISA} karakter olmalıdır.`);
  if (cumleSayisi(senaryo) > EN_FAZLA_CUMLE) {
    return hata("senaryo", `Senaryo en fazla ${EN_FAZLA_CUMLE} cümle olmalı; çözüme katkısı olmayan cümleleri çıkar.`);
  }
  if (senaryo.includes("?")) return hata("senaryo", "Senaryo soru cümlesi içermemeli; soru yalnızca \"soru\" alanında sorulur.");
  if ((soru.match(/\?/g) ?? []).length !== 1) return hata("soru", "Soru kökü tek bir soru sormalı ve \"?\" ile bitmelidir.");

  const metin = `${senaryo} ${soru}`;
  const normal = metniNormallestir(metin);
  const eksik = plan.veriler.find((veri) => !senaryodaGeciyorMu(metin, oranYap(veri.deger)));
  if (eksik) {
    return hata("senaryo", `Sistemin verdiği ${kesirGosterimi(eksik.deger)} (${eksik.ad}) metinde geçmiyor; verilen sayıları aynen kullan.`);
  }
  // Plan dışı bir sayı ya cevabı ele verir ya da çizimle çelişir.
  const planDegerleri = plan.veriler.map((veri) => oranYap(veri.deger));
  const fazla = [
    ...metindekiKesirler(metin).map((bulunan) => ({ metin: bulunan.metin, deger: oranYap(bulunan.kesir) })),
    ...metindekiTamSayilar(metin).map((n) => ({ metin: String(n), deger: { pay: n, payda: 1 } })),
  ].find(
    (sayi) =>
      !planDegerleri.some((deger) => esitMi(deger, sayi.deger)) &&
      !(tamSayiMi(sayi.deger) && serbestSayilar.includes(sayi.deger.pay))
  );
  if (fazla) return hata("senaryo", `Metindeki ${fazla.metin} sistemin verdiği verilerden biri değil; yalnızca verilen sayıları yaz.`);
  const eksikAd = plan.adlar.find((ad) => !normal.includes(metniNormallestir(ad)));
  if (eksikAd) return hata("senaryo", `Metinde "${eksikAd}" adı aynen geçmeli; görsel ve şıklar bu adla yazılır.`);
  const eksikIfade = plan.anahtarIfadeler.find((grup) => !grup.some((ifade) => normal.includes(ifade)));
  if (eksikIfade) return hata("senaryo", `Metin şu bilgiyi açıkça içermeli: "${eksikIfade[0]}".`);
  const kok = metniNormallestir(soru);
  const eksikKok = plan.kokIfadeleri.find((grup) => !grup.some((ifade) => kok.includes(ifade)));
  if (eksikKok) return hata("soru", `Soru kökü "${eksikKok[0]}" ifadesini içermeli (örnek soru kökünü izle).`);
  const dil = dilHatasi(senaryo, soru);
  if (dil) return hata("senaryo", `Dil hatası: ${dil}.`);
  return true;
}

/**
 * Planlı bir görsel sorunun ortak doğrulaması. `veriKur`, doğrulanmış
 * ortak alanlara tipin çizim verisini ekler (ör. `daireler`).
 */
export function planliGorselDogrula<G extends string, T extends GorselCizimPlani["tip"], V>(
  raw: unknown,
  path: string,
  sorunlar: GorselSoruSorunu[],
  plan: GorselSoruPlani | undefined,
  secenek: {
    gorevler: readonly G[];
    cizimTipi: T;
    serbestSayilar?: (cizim: Extract<GorselCizimPlani, { tip: T }>) => number[];
  },
  veriKur: (
    ortak: { gorev: G; senaryo: string; secenekler: MetinSecenegi[]; dogruSecenekId: string },
    cizim: Extract<GorselCizimPlani, { tip: T }>
  ) => V
): GorselSoruDogrulamaSonucu<V> | undefined {
  if (!isRecord(raw)) {
    sorunlar.push({ path, message: '"veri" bir JSON nesnesi olmalıdır.' });
    return undefined;
  }
  const gorev = okuSecim(raw, "gorev", secenek.gorevler, path, sorunlar);
  const senaryo = okuMetin(raw, "senaryo", path, sorunlar);
  const soru = okuMetin(raw, "soru", path, sorunlar);
  if (!gorev || !senaryo || !soru) return undefined;
  // Görsel ve cevap plandan gelir: plansız (ör. eski bir kayıttan) bir soru kabul edilmez.
  const cikarim = plan?.cikarim;
  const cizim = plan?.cizim?.tip === secenek.cizimTipi ? (plan.cizim as Extract<GorselCizimPlani, { tip: T }>) : undefined;
  if (!cikarim || !cizim) {
    sorunlar.push({ path, message: "Bu görsel sorunun çizimi, cevabı ve şıkları sistem tarafından planlanmalıdır." });
    return undefined;
  }
  const serbest = [1, cikarim.veriler.length, ...(secenek.serbestSayilar?.(cizim) ?? [])];
  if (!metniDenetle(senaryo, soru, cikarim, serbest, path, sorunlar)) return undefined;

  const secenekler = cikarim.secenekler.map((oge, index) => ({ id: secenekHarfi(index), metin: oge.metin, dogru: !oge.hata }));
  const dogru = secenekler.filter((oge) => oge.dogru);
  if (dogru.length !== 1) {
    sorunlar.push({ path, message: "Planın şıkları arasında tam olarak bir doğru cevap olmalıdır." });
    return undefined;
  }
  const veri = veriKur(
    { gorev, senaryo, secenekler: secenekler.map(({ id, metin }) => ({ id, metin })), dogruSecenekId: dogru[0].id },
    cizim
  );
  return { soru, cozum: cikarim.cozum, veri };
}

/** Cevap anahtarındaki doğru şık özeti ("B) 3/4"). */
export function planliDogruCevapMetni(veri: { secenekler: MetinSecenegi[]; dogruSecenekId: string }): string {
  const index = veri.secenekler.findIndex((oge) => oge.id === veri.dogruSecenekId);
  return index >= 0 ? `${secenekHarfi(index)}) ${veri.secenekler[index].metin}` : "";
}

// ---------------------------------------------------------------------------
// Üreticilerin ortak yardımcıları
// ---------------------------------------------------------------------------

/** Bir planlı görsel sorunun iki planı: metin/cevap/şıklar ve çizim verisi. */
export interface PlanliGorselPlan<C extends GorselCizimPlani = GorselCizimPlani> {
  cikarim: SenaryoCikarimPlani;
  cizim: C;
}

/** Bir tipin çizim planı (ör. CizimPlaniOf<"daire_kesir"> → { tip, daireler }). */
export type CizimPlaniOf<T extends GorselCizimPlani["tip"]> = Extract<GorselCizimPlani, { tip: T }>;

/** Bir üretici denemesi; koşulları sağlamayan tohumda undefined döner ve başka tohum denenir. */
export type Uretim<C extends GorselCizimPlani = GorselCizimPlani> = PlanliGorselPlan<C> | undefined;

export const ISIMLER = ["Ali", "Ayşe", "Mert", "Zeynep", "Can", "Elif", "Deniz", "Burak", "Ece", "Emre"];

/** Sadeleştirmeden yazım: 6/8. */
export const ham = (pay: number, payda: number) => `${pay}/${payda}`;

/** Doğru şık + yazımca farklı 3 çeldirici, karışık sırayla; 3 çeldirici bulunamazsa undefined. */
export function siklar(
  r: Rastgele,
  dogru: string,
  celdiriciler: { metin: string; hata: string }[]
): SenaryoCikarimPlani["secenekler"] | undefined {
  const secilen: { metin: string; hata: string }[] = [];
  for (const aday of celdiriciler) {
    if (secilen.length === 3) break;
    if (aday.metin !== dogru && !secilen.some((oge) => oge.metin === aday.metin)) secilen.push(aday);
  }
  return secilen.length === 3 ? r.karistir([{ metin: dogru }, ...secilen]) : undefined;
}

/** Metin planı; verilmeyen alanlar boştur (sayılar şekilden okunur). */
export function metinPlani(
  alanlar: Pick<SenaryoCikarimPlani, "baglam" | "konu" | "ornekSoru" | "ipucu" | "cozum" | "secenekler"> &
    Partial<Pick<SenaryoCikarimPlani, "veriler" | "adlar" | "anahtarIfadeler" | "kokIfadeleri">>
): SenaryoCikarimPlani {
  return { veriler: [], adlar: [], anahtarIfadeler: [], kokIfadeleri: [], ...alanlar };
}
