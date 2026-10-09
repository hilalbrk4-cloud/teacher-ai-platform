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
import { senaryoSayilariUret } from "@/lib/quiz-generator/gorsel-sorular/senaryo-sayilari";
import {
  GORSEL_SORU_TIPLERI,
  type SenaryoGorevi,
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

function tipinGorevleri<K extends GorselSoruTipi>(
  tip: K,
  kesirKonusu: boolean,
  sinif: number | undefined
): GorselSoruGorevHaritasi[K][] {
  return (Object.values(gorselSoruTanimi(tip).gorevler) as GorselSoruGorevTanimi<K>[])
    .filter((gorev) => !gorev.plandanCikarildi)
    .filter((gorev) => (kesirKonusu ? !gorev.kesirKonusundaKullanilmaz : !gorev.kesirKonusuGerekir))
    .filter((gorev) => sinif === undefined || gorev.enAzSinif === undefined || sinif >= gorev.enAzSinif)
    .map((gorev) => gorev.gorev);
}

/** "5. Sınıf", "6", "6. sınıf (ileri)" → 5 / 6; sayı yoksa sınıf kısıtı uygulanmaz. */
function sinifDuzeyi(gradeLevel: string | undefined): number | undefined {
  const eslesme = gradeLevel?.match(/\d+/);
  return eslesme ? Number(eslesme[0]) : undefined;
}

/** Aynı girdide hep aynı sonucu veren küçük bir özet (Blueprint rastgelelik kullanmaz). */
function tohum(metin: string): number {
  let deger = 0;
  for (const karakter of metin) deger = (deger * 31 + karakter.charCodeAt(0)) % 1_000_003;
  return deger;
}

/** Tek bir görsel okuma işi olan tipler (konum okuma, kart türü, sembol eşleştirme). */
const BASIT_OKUMA_TIPLERI: readonly GorselSoruTipi[] = ["sayi_dogrusu", "kesir_kartlari"];

/** Bir quizde en fazla bu kadar basit görsel okuma sorusu olur. */
const EN_FAZLA_BASIT_OKUMA = 2;

/**
 * Çok adımlı senaryo görevlerinin tercih sırası: en çok işlem adımı olan
 * önce gelir (iki kesir işlemi + karşılaştırma/kalan, sonra bölme +
 * yuvarlama, sonra birim bulma + ölçekleme).
 */
const COK_ADIMLI_GOREV_SIRASI: readonly SenaryoGorevi[] = [
  "karsilastirma",
  "kalaniBulma",
  "coklugunKesri",
  "bolmeEnFazla",
  "birimOlcekleme",
  "cokAdimliCikarim",
];

const ZORLUK_SIRASI: Record<QuestionBlueprintSlot["difficulty"], number> = { easy: 0, medium: 1, hard: 2 };

/**
 * Blueprint'in son adımı: her `gorselSoru` sırasına bir tip ve görev atar.
 *
 * Zorluk dengesi: quiz çok adımlı senaryolar ağırlıklıdır.
 * - Basit görsel okuma soruları (sayı doğrusu, kesir kartları) görsel
 *   soruların üçte biri kadardır, en fazla 2 (5 soruda 1, 6+ soruda 2).
 *   Blueprint'in en kolay işaretlediği sıralara verilir; iki tane varsa
 *   farklı tiplerdendir.
 * - Kalan sıralar çok adımlı senaryo görevleridir: önce her görev birer kez
 *   (en çok adımlı olandan başlayarak) kullanılır; tekrar eden görev
 *   sıraya özgü tohumla farklı sayılar alır.
 * - Kesir tipleri/görevleri yalnızca konu veya kazanımlar kesirlerle
 *   ilgiliyse atanır; aksi hâlde yalnızca derse bağımsız görevler kalır.
 * - Seçimler konudan türetilen sabit bir tohumla döndürülür: aynı plan her
 *   zaman aynı sonucu verir, farklı konular farklı görevlerle başlar.
 */
export function gorselSoruPlaniAta(
  slots: QuestionBlueprintSlot[],
  baglam: { subject: string; topic: string; gradeLevel?: string }
): QuestionBlueprintSlot[] {
  const metinler = [baglam.topic, ...slots.map((slot) => slot.learningOutcome)];
  const kesirKonusu = isFractionTopic(baglam.subject, metinler);
  const sinif = sinifDuzeyi(baglam.gradeLevel);
  const baslangic = tohum(metinler.join("|"));

  const basitTipler = BASIT_OKUMA_TIPLERI.filter(
    (tip) =>
      (kesirKonusu || !gorselSoruTanimi(tip).kesirKonusuGerekir) && tipinGorevleri(tip, kesirKonusu, sinif).length > 0
  );
  const senaryoGorevleri = tipinGorevleri("gercek_hayat_senaryo", kesirKonusu, sinif);
  const cokAdimliGorevler = COK_ADIMLI_GOREV_SIRASI.filter((gorev) => senaryoGorevleri.includes(gorev));

  const gorselSiralar = slots.filter((slot) => slot.type === "gorselSoru");
  const basitSayisi =
    basitTipler.length === 0
      ? 0
      : cokAdimliGorevler.length === 0
        ? gorselSiralar.length
        : Math.min(EN_FAZLA_BASIT_OKUMA, Math.floor(gorselSiralar.length / 3));
  // En kolay işaretlenen sıralar basit okuma olur (eşitlikte quizdeki sıraya göre).
  const basitSiralar = new Set(
    [...gorselSiralar]
      .sort((a, b) => ZORLUK_SIRASI[a.difficulty] - ZORLUK_SIRASI[b.difficulty] || a.order - b.order)
      .slice(0, basitSayisi)
      .map((slot) => slot.order)
  );

  let basitSira = 0;
  let cokAdimliSira = 0;
  return slots.map((slot) => {
    if (slot.type !== "gorselSoru") return slot;
    let plan: GorselSoruPlani;
    if (basitSiralar.has(slot.order)) {
      const tipIndex = (basitSira + baslangic) % basitTipler.length;
      const tip = basitTipler[tipIndex];
      const gorevler = tipinGorevleri(tip, kesirKonusu, sinif);
      const tekrar = Math.floor(basitSira / basitTipler.length);
      plan = { tip, gorev: gorevler[(tekrar + baslangic + tipIndex) % gorevler.length] } as GorselSoruPlani;
      basitSira += 1;
    } else {
      // Görevler tercih sırasıyla, konuya göre kaydırılmış bir başlangıçla döner;
      // tümü kullanılmadan hiçbiri tekrar etmez.
      const gorev = cokAdimliGorevler[(cokAdimliSira + baslangic) % cokAdimliGorevler.length];
      cokAdimliSira += 1;
      // Sayısal senaryolarda sayıları kod seçer; model yalnızca senaryoyu yazar.
      const sayilar =
        gorev !== "cokAdimliCikarim"
          ? senaryoSayilariUret(gorev as Exclude<SenaryoGorevi, "cokAdimliCikarim">, baslangic + slot.order * 7919)
          : undefined;
      plan = { tip: "gercek_hayat_senaryo", gorev, ...(sayilar ? { sayilar } : {}) };
    }
    return { ...slot, gorselPlani: plan };
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
  const sonuc = gorselSoruTanimi(tip).dogrula(raw.veri, `${path}.veri`, sorunlar, plan);
  if (!sonuc) return undefined;

  return { soru: sonuc.soru, cozum: sonuc.cozum, icerik: { tip, veri: sonuc.veri } as GorselSoruIcerigi };
}

export function gorselSoruCevapMetni(icerik: GorselSoruIcerigi): string {
  return gorselSoruTanimi(icerik.tip).dogruCevapMetni(icerik.veri);
}
