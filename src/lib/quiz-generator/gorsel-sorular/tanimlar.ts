import { isFractionTopic } from "@/lib/ai/blueprint/subject";
import { gercekHayatSenaryoTanimi } from "@/lib/quiz-generator/gorsel-sorular/gercek-hayat-senaryo";
import { kesirKartlariTanimi } from "@/lib/quiz-generator/gorsel-sorular/kesir-kartlari";
import {
  isRecord,
  type GorselSoruGorevTanimi,
  type GorselSoruSorunu,
  type GorselSoruTanimi,
} from "@/lib/quiz-generator/gorsel-sorular/ortak";
import { sayiDogrusuTanimi } from "@/lib/quiz-generator/gorsel-sorular/sayi-dogrusu";
import {
  GORSEL_SORU_TIPLERI,
  type GorselSoruGorevHaritasi,
  type GorselSoruIcerigi,
  type GorselSoruPlani,
  type GorselSoruTipi,
} from "@/types/gorsel-soru";
import type { QuestionBlueprintSlot } from "@/types/quiz-blueprint";

/**
 * Görsel soru tiplerinin React'ten bağımsız tanımları — Blueprint, Prompt
 * Builder, yanıt doğrulayıcı ve mock servis bunu kullanır. Yeni bir tip
 * eklemek için: `GORSEL_SORU_TIPLERI`ne anahtarı, `GorselSoruVeriHaritasi`
 * ve `GorselSoruGorevHaritasi`na tiplerini ekleyin, burada tanımını ve
 * istemci registry'sinde bileşenini kaydedin. Mapped type sayesinde bunlardan
 * biri unutulursa TypeScript hata verir.
 */
export const GORSEL_SORU_TANIMLARI: { [K in GorselSoruTipi]: GorselSoruTanimi<K> } = {
  sayi_dogrusu: sayiDogrusuTanimi,
  kesir_kartlari: kesirKartlariTanimi,
  gercek_hayat_senaryo: gercekHayatSenaryoTanimi,
};

export function gorselSoruTanimi<K extends GorselSoruTipi>(tip: K): GorselSoruTanimi<K> {
  return GORSEL_SORU_TANIMLARI[tip];
}

export function gorevTanimi(plan: GorselSoruPlani): GorselSoruGorevTanimi<GorselSoruTipi> {
  const gorevler = gorselSoruTanimi(plan.tip).gorevler as Record<string, GorselSoruGorevTanimi<GorselSoruTipi>>;
  return gorevler[plan.gorev];
}

export function isGorselSoruTipi(value: unknown): value is GorselSoruTipi {
  return typeof value === "string" && (GORSEL_SORU_TIPLERI as readonly string[]).includes(value);
}

function tipinGorevleri<K extends GorselSoruTipi>(tip: K, kesirKonusu: boolean): GorselSoruGorevHaritasi[K][] {
  return (Object.values(gorselSoruTanimi(tip).gorevler) as GorselSoruGorevTanimi<K>[])
    .filter((gorev) => kesirKonusu || !gorev.kesirKonusuGerekir)
    .map((gorev) => gorev.gorev);
}

/** Aynı girdide hep aynı sonucu veren küçük bir özet (Blueprint rastgelelik kullanmaz). */
function tohum(metin: string): number {
  let deger = 0;
  for (const karakter of metin) deger = (deger * 31 + karakter.charCodeAt(0)) % 1_000_003;
  return deger;
}

/**
 * Blueprint'in son adımı: her `gorselSoru` sırasına bir tip ve görev atar.
 *
 * - Önce her uygun tip birer kez kullanılır; böylece tip sayısı yettiği
 *   sürece bir quizde her tipten en fazla bir soru olur.
 * - Soru sayısı tip sayısını aşarsa tekrar eden tipe her seferinde FARKLI
 *   bir görev verilir (ör. ikinci sayı doğrusu sorusu "sıralama" yerine
 *   "verilen kesri gösterme") — emoji/tema değişikliği çeşitlilik sayılmaz.
 * - Kesir tipleri/görevleri yalnızca konu veya kazanımlar kesirlerle
 *   ilgiliyse atanır; aksi hâlde yalnızca derse bağımsız görevler kalır.
 * - Hangi tipin/görevin önce geleceği konudan türetilen sabit bir tohumla
 *   döndürülür: aynı plan her zaman aynı sonucu verir, farklı konular farklı
 *   görevlerle başlar.
 */
export function gorselSoruPlaniAta(
  slots: QuestionBlueprintSlot[],
  baglam: { subject: string; topic: string }
): QuestionBlueprintSlot[] {
  const metinler = [baglam.topic, ...slots.map((slot) => slot.learningOutcome)];
  const kesirKonusu = isFractionTopic(baglam.subject, metinler);
  const tipler = GORSEL_SORU_TIPLERI.filter((tip) => kesirKonusu || !gorselSoruTanimi(tip).kesirKonusuGerekir);
  const baslangic = tohum(metinler.join("|"));

  let sira = 0;
  return slots.map((slot) => {
    if (slot.type !== "gorselSoru") return slot;
    const tipIndex = (sira + baslangic) % tipler.length;
    const tip = tipler[tipIndex];
    const tekrar = Math.floor(sira / tipler.length);
    const gorevler = tipinGorevleri(tip, kesirKonusu);
    const gorev = gorevler[(tekrar + baslangic + tipIndex) % gorevler.length];
    sira += 1;
    return { ...slot, gorselPlani: { tip, gorev } as GorselSoruPlani };
  });
}

export interface DogrulanmisGorselSoru {
  soru: string;
  cozum?: string;
  icerik: GorselSoruIcerigi;
}

/**
 * AI'dan gelen `{ "tip", "veri" }` nesnesini doğrular: `tip` registry'de
 * olmalı, `veri` o tipin kendi doğrulayıcısından geçmelidir. `plan`
 * verilirse tip ve görev plana uymak zorundadır — çeşitliliği garanti eden
 * şey budur, bu yüzden plandan sapan bir yanıt reddedilir.
 */
export function dogrulaGorselSoru(
  raw: unknown,
  path: string,
  sorunlar: GorselSoruSorunu[],
  plan?: GorselSoruPlani
): DogrulanmisGorselSoru | undefined {
  if (!isRecord(raw)) {
    sorunlar.push({ path, message: "Her soru bir JSON nesnesi olmalıdır." });
    return undefined;
  }
  if (!isGorselSoruTipi(raw.tip)) {
    sorunlar.push({
      path: `${path}.tip`,
      message: `Geçersiz görsel soru tipi: ${String(raw.tip)}. Geçerli tipler: ${GORSEL_SORU_TIPLERI.join(", ")}.`,
    });
    return undefined;
  }
  if (plan && raw.tip !== plan.tip) {
    sorunlar.push({ path: `${path}.tip`, message: `Plana göre tip "${plan.tip}" olmalıydı, "${raw.tip}" döndürüldü.` });
    return undefined;
  }
  if (plan && isRecord(raw.veri) && raw.veri.gorev !== plan.gorev) {
    sorunlar.push({
      path: `${path}.veri.gorev`,
      message: `Plana göre görev "${plan.gorev}" olmalıydı, "${String(raw.veri.gorev)}" döndürüldü.`,
    });
    return undefined;
  }

  const tip = raw.tip;
  const sonuc = gorselSoruTanimi(tip).dogrula(raw.veri, `${path}.veri`, sorunlar);
  if (!sonuc) return undefined;

  return { soru: sonuc.soru, cozum: sonuc.cozum, icerik: { tip, veri: sonuc.veri } as GorselSoruIcerigi };
}

export function gorselSoruCevapMetni(icerik: GorselSoruIcerigi): string {
  return gorselSoruTanimi(icerik.tip).dogruCevapMetni(icerik.veri);
}
