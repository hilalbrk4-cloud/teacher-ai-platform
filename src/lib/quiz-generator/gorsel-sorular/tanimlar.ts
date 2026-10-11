import { isFractionTopic } from "@/lib/ai/blueprint/subject";
import { alanIzgaraPlaniUret, alanIzgaraTanimi } from "@/lib/quiz-generator/gorsel-sorular/alan-izgara";
import { cetvelOlcumPlaniUret, cetvelOlcumTanimi } from "@/lib/quiz-generator/gorsel-sorular/cetvel-olcum";
import { daireKesirPlaniUret, daireKesirTanimi } from "@/lib/quiz-generator/gorsel-sorular/daire-kesir";
import { etapDogrusuPlaniUret, etapDogrusuTanimi } from "@/lib/quiz-generator/gorsel-sorular/etap-dogrusu";
import { kesirCubuguPlaniUret, kesirCubuguTanimi } from "@/lib/quiz-generator/gorsel-sorular/kesir-cubugu";
import { gercekHayatSenaryoTanimi } from "@/lib/quiz-generator/gorsel-sorular/gercek-hayat-senaryo";
import { kesirKartlariTanimi } from "@/lib/quiz-generator/gorsel-sorular/kesir-kartlari";
import {
  isRecord,
  type GorselSoruGorevTanimi,
  type GorselSoruSorunu,
  type GorselSoruTanimi,
} from "@/lib/quiz-generator/gorsel-sorular/ortak";
import type { PlanliGorselPlan } from "@/lib/quiz-generator/gorsel-sorular/planli-gorsel";
import { tabloKesirPlaniUret, tabloKesirTanimi } from "@/lib/quiz-generator/gorsel-sorular/tablo-kesir";
import { sayiDogrusuTanimi } from "@/lib/quiz-generator/gorsel-sorular/sayi-dogrusu";
import { cikarimPlaniUret } from "@/lib/quiz-generator/gorsel-sorular/senaryo-cikarim";
import { rastgeleOlustur, senaryoSayilariUret } from "@/lib/quiz-generator/gorsel-sorular/senaryo-sayilari";
import {
  CIKARIM_GOREVLERI,
  GORSEL_SORU_TIPLERI,
  type CikarimGorevi,
  type AlanIzgaraGorevi,
  type CetvelOlcumGorevi,
  type DaireKesirGorevi,
  type EtapDogrusuGorevi,
  type KesirCubuguGorevi,
  type TabloKesirGorevi,
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
  daire_kesir: daireKesirTanimi,
  kesir_cubugu: kesirCubuguTanimi,
  alan_izgara: alanIzgaraTanimi,
  tablo_kesir: tabloKesirTanimi,
  cetvel_olcum: cetvelOlcumTanimi,
  etap_dogrusu: etapDogrusuTanimi,
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

/**
 * Model verisiyle çizilen eski tipler. TYMM kuralları (CLAUDE.md) tek adımlı
 * okuma/eşleştirme görevlerini yasakladığı için bunların tek adımlı görevleri
 * plandan çıkarıldı (plandanCikarildi); geriye kart muhakemesi
 * (ifadeDegerlendirme) kalır. Sayı doğrusu artık planlı `etap_dogrusu`dur.
 */
const BASIT_OKUMA_TIPLERI: readonly GorselSoruTipi[] = ["kesir_kartlari"];

/** Bir quizde en fazla bu kadar kart muhakemesi sorusu olur. */
const EN_FAZLA_BASIT_OKUMA = 1;

/**
 * Çok adımlı senaryo görevlerinin (problem ailelerinin) sırası. Her görev
 * ayrı bir ailedir (references/senaryo-kalite-referans-v2.md); sıra, ardışık
 * soruların farklı becerileri sınaması için hesap ağırlıklı aileler ile
 * çıkarım ailelerini dönüşümlü dizer. Başlangıç noktası konudan türetilir.
 */
const COK_ADIMLI_GOREV_SIRASI: readonly SenaryoGorevi[] = [
  "karsilastirma",
  "parcaButun",
  "coklugunKesri",
  "olabilirCikarim",
  "kalaniBulma",
  "kesirSiralama",
  "bolmeEnFazla",
  "denklikOlamaz",
  "birimOlcekleme",
  "cokAdimliCikarim",
];

function cikarimGoreviMi(gorev: SenaryoGorevi): gorev is CikarimGorevi {
  return (CIKARIM_GOREVLERI as readonly string[]).includes(gorev);
}

/**
 * Planlı görsel tipler (references/gorsel-tip-haritasi.md): çizimi, cevabı ve
 * şıkları kod kurar. `uygunlukSozcukleri`: tip, kazanım ya da konu bu
 * sözcüklerden birini içerdiğinde "konuya uyan" sayılır (pizza = paylaşma,
 * tablo = çoklu veri, cetvel = ölçüm, ızgara = alan).
 */
interface PlanliGorselKaydi {
  tip: GorselSoruTipi;
  uret: (gorev: string, tohum: number) => PlanliGorselPlan;
  uygunlukSozcukleri: readonly string[];
}

const PLANLI_GORSEL_TIPLERI: readonly PlanliGorselKaydi[] = [
  {
    tip: "daire_kesir",
    uret: (gorev, tohumu) => daireKesirPlaniUret(gorev as DaireKesirGorevi, tohumu),
    uygunlukSozcukleri: ["pizza", "pasta", "paylaş", "dilim", "daire", "bütünün parça"],
  },
  {
    tip: "kesir_cubugu",
    uret: (gorev, tohumu) => kesirCubuguPlaniUret(gorev as KesirCubuguGorevi, tohumu),
    uygunlukSozcukleri: ["şerit", "bar model", "kurdele", "çikolata", "bileşik", "tam sayılı"],
  },
  {
    tip: "alan_izgara",
    uret: (gorev, tohumu) => alanIzgaraPlaniUret(gorev as AlanIzgaraGorevi, tohumu),
    uygunlukSozcukleri: ["alan", "ızgara", "bahçe", "tarla", "kareli", "boya"],
  },
  {
    tip: "tablo_kesir",
    uret: (gorev, tohumu) => tabloKesirPlaniUret(gorev as TabloKesirGorevi, tohumu),
    uygunlukSozcukleri: ["tablo", "veri", "çizelge", "grafik"],
  },
  {
    tip: "cetvel_olcum",
    uret: (gorev, tohumu) => cetvelOlcumPlaniUret(gorev as CetvelOlcumGorevi, tohumu),
    uygunlukSozcukleri: ["ölç", "cetvel", "uzunluk", "santimetre"],
  },
  {
    tip: "etap_dogrusu",
    uret: (gorev, tohumu) => etapDogrusuPlaniUret(gorev as EtapDogrusuGorevi, tohumu),
    uygunlukSozcukleri: ["sayı doğrusu", "konum", "hareket", "etap"],
  },
];

/** Planlı bir görselin kullanılmamış bir bağlam konusu bulmak için görev başına deneyeceği tohum sayısı. */
const BAGLAM_DENEME_SINIRI = 12;

/** Bir quizde aynı planlı görsel tip en fazla bu kadar kullanılır. */
const EN_FAZLA_AYNI_GORSEL = 2;

/**
 * "Görsel yeni nesil" sorularının tip sırası (`adet` uzunlukta). Her soruya
 * işlevsel bir görsel bağlanır: konuya uyan tipler (pizza = paylaşma, tablo =
 * çoklu veri, cetvel = ölçüm, ızgara = alan…) önce ve en fazla ikişer kez,
 * ardından diğer tipler birer kez gelir; yalnızca çok uzun quizlerde döngü
 * başa döner. Sıralar konudan türetilen tohumla karıştırılır (hiçbir tip baskın
 * olmasın).
 */
function planliTipSirasi(
  metinler: string[],
  baslangic: number,
  adet: number,
  kullanilabilir: (kayit: PlanliGorselKaydi) => boolean
): PlanliGorselKaydi[] {
  const metin = metinler.join(" ").toLocaleLowerCase("tr-TR");
  const r = rastgeleOlustur(baslangic);
  const tumu = PLANLI_GORSEL_TIPLERI.filter(kullanilabilir);
  const uyarMi = (kayit: PlanliGorselKaydi) => kayit.uygunlukSozcukleri.some((sozcuk) => metin.includes(sozcuk));
  const uyanlar = r.karistir(tumu.filter(uyarMi));
  const digerleri = r.karistir(tumu.filter((kayit) => !uyarMi(kayit)));
  // Konuya uyanlar EN_FAZLA_AYNI_GORSEL (2) kez, diğerleri birer kez.
  const temel = [...uyanlar, ...(EN_FAZLA_AYNI_GORSEL > 1 ? uyanlar : []), ...digerleri];
  const dongu = r.karistir(tumu);
  return Array.from({ length: tumu.length > 0 ? adet : 0 }, (_, index) =>
    index < temel.length ? temel[index] : dongu[(index - temel.length) % dongu.length]
  );
}

const ZORLUK_SIRASI: Record<QuestionBlueprintSlot["difficulty"], number> = { easy: 0, medium: 1, hard: 2 };

/**
 * Blueprint'in son adımı: her `gorselSoru` sırasına bir tip ve görev atar.
 *
 * Zorluk dengesi: quiz çok adımlı senaryolar ağırlıklıdır.
 * - Basit görsel okuma soruları (sayı doğrusu, kesir kartları) görsel
 *   soruların üçte biri kadardır, en fazla 2 (5 soruda 1, 6+ soruda 2).
 *   Blueprint'in en kolay işaretlediği sıralara verilir; iki tane varsa
 *   farklı tiplerdendir.
 * - Kalan sıraların yarısı (yukarı yuvarlanır) planlı görsel tiplerdir
 *   (daire_kesir…): konuya uyan tipler dönüşümlü, her tip en fazla 2 kez,
 *   senaryolarla eşit aralıklı karışık. Kalanlar çok adımlı senaryo
 *   görevleridir (her biri ayrı bir problem ailesi): önce her aile birer kez
 *   kullanılır; tekrar eden aile sıraya özgü tohumla farklı sayılar alır.
 * - Bağlam konuları (market, tarım, spor…) quizde mümkün olduğunca tekrar
 *   etmez: her senaryo, öncekilerin konularından farklı bir bağlam seçer.
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

  // Kesir konusunda "görsel yeni nesil" sorularının HEPSİNE işlevsel bir görsel bağlanır
  // (planlı görsel tipler); görselsiz senaryolar yalnızca planlı tip yoksa (kesir dışı konu) kullanılır.
  const kalanSiralar = gorselSiralar.filter((slot) => !basitSiralar.has(slot.order));
  const planliTipler = kesirKonusu
    ? planliTipSirasi(metinler, baslangic, kalanSiralar.length, (kayit) => tipinGorevleri(kayit.tip, kesirKonusu, sinif).length > 0)
    : [];
  const planliSiralar = new Set(planliTipler.length > 0 ? kalanSiralar.map((slot) => slot.order) : []);
  const tipKullanimi = new Map<GorselSoruTipi, number>();

  let basitSira = 0;
  let cokAdimliSira = 0;
  let planliSira = 0;
  const kullanilanKonular = new Set<string>();
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
    } else if (planliSiralar.has(slot.order)) {
      const kayit = planliTipler[planliSira];
      planliSira += 1;
      const kullanim = tipKullanimi.get(kayit.tip) ?? 0;
      tipKullanimi.set(kayit.tip, kullanim + 1);
      // Aynı tip tekrar ederse görev de değişir; bağlam havuzu kısıtı: quizde kullanılmış
      // bir bağlam konusu (ör. iki kez robot süpürge, iki kez pizza) tekrar etmesin diye
      // önce farklı tohumlar, sonra aynı tipin diğer görevleri denenir.
      const gorevler = tipinGorevleri(kayit.tip, kesirKonusu, sinif);
      const adaylar = Array.from({ length: gorevler.length }, (_, kaydir) => gorevler[(kullanim + baslangic + kaydir) % gorevler.length]);
      const tohumu = baslangic + slot.order * 7919;
      let secilen: { gorev: string; uretim: PlanliGorselPlan } | undefined;
      arama: for (const gorev of adaylar) {
        for (let deneme = 0; deneme < BAGLAM_DENEME_SINIRI; deneme += 1) {
          const uretim = kayit.uret(gorev, tohumu + deneme * 104729);
          if (!kullanilanKonular.has(uretim.cikarim.konu)) {
            secilen = { gorev, uretim };
            break arama;
          }
        }
      }
      // Havuz tükendiyse (çok uzun quiz) tekrar kaçınılmazdır: sıradaki görev kullanılır.
      secilen ??= { gorev: adaylar[0], uretim: kayit.uret(adaylar[0], tohumu) };
      kullanilanKonular.add(secilen.uretim.cikarim.konu);
      plan = { tip: kayit.tip, gorev: secilen.gorev, ...secilen.uretim } as GorselSoruPlani;
    } else {
      // Görevler tercih sırasıyla, konuya göre kaydırılmış bir başlangıçla döner;
      // tümü kullanılmadan hiçbiri tekrar etmez.
      const gorev = cokAdimliGorevler[(cokAdimliSira + baslangic) % cokAdimliGorevler.length];
      cokAdimliSira += 1;
      // Sayıları, cevabı ve şıkları kod seçer; model yalnızca senaryoyu yazar.
      const tohumu = baslangic + slot.order * 7919;
      if (gorev === "cokAdimliCikarim") {
        plan = { tip: "gercek_hayat_senaryo", gorev };
      } else if (cikarimGoreviMi(gorev)) {
        const cikarim = cikarimPlaniUret(gorev, tohumu, kullanilanKonular);
        kullanilanKonular.add(cikarim.konu);
        plan = { tip: "gercek_hayat_senaryo", gorev, cikarim };
      } else {
        const sayilar = senaryoSayilariUret(gorev, tohumu, kullanilanKonular);
        if (sayilar.konu) kullanilanKonular.add(sayilar.konu);
        plan = { tip: "gercek_hayat_senaryo", gorev, sayilar };
      }
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
