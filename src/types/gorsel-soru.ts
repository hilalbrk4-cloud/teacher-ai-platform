/**
 * Görsel soru tipleri — `gorselSoru` türündeki bir sorunun AI'dan
 * `{ "tip": "...", "veri": {...} }` biçiminde gelen içeriği.
 *
 * Her tipin birden fazla **görevi** vardır (ör. sayı doğrusunda "sıralama"
 * veya "verilen kesri gösterme"). Hangi sorunun hangi tip ve görevle
 * yazılacağına Blueprint karar verir (`GorselSoruPlani`); böylece aynı tip
 * bir quizde tekrar ettiğinde görev de değişir.
 *
 * Buradaki tipler, doğrulanmış ve normalize edilmiş veriyi temsil eder:
 * soru kökü (`soru`) ve çözüm (`cozum`) doğrulama sırasında `veri`den
 * çıkarılıp sorunun ortak `prompt` / `answerExplanation` alanlarına taşınır.
 */

export const GORSEL_SORU_TIPLERI = ["sayi_dogrusu", "kesir_kartlari", "gercek_hayat_senaryo"] as const;

export type GorselSoruTipi = (typeof GORSEL_SORU_TIPLERI)[number];

/**
 * Bir görselin nasıl üretileceği. Yalnızca dekoratif görseller için
 * değiştirilebilir; fonksiyonel görseller her zaman veriden SVG ile çizilir.
 *
 * - `svg`: Koddaki SVG sahnesi/çizimi.
 * - `hazirGorsel`: `public/gorseller/sahneler/<sahne>.webp` dosyası.
 * - `yapayZeka`: AI ile üretilen görsel (henüz uygulanmadı — hiçbir şey çizmez).
 * - `yok`: Görsel gösterilmez.
 */
export const GORSEL_STRATEJILERI = ["svg", "hazirGorsel", "yapayZeka", "yok"] as const;

export type GorselStratejisi = (typeof GORSEL_STRATEJILERI)[number];

/**
 * `fonksiyonel`: Görsel matematiğin parçasıdır; soru onsuz çözülemez ve
 * her zaman veriden hesaplanarak çizilir.
 * `dekoratif`: Görsel yalnızca bağlamı destekler; soru onsuz da eksiksizdir.
 */
export type GorselKategorisi = "fonksiyonel" | "dekoratif";

export interface SecenekKimligi {
  id: string;
}

/** `tam` yalnızca tam sayılı gösterimde bulunur (ör. 2 1/3). */
export interface Kesir {
  tam?: number;
  pay: number;
  payda: number;
}

// ---------------------------------------------------------------------------
// sayi_dogrusu
// ---------------------------------------------------------------------------

export const SAYI_DOGRUSU_GOREVLERI = ["siralama", "hedefeEnYakin", "isaretliKesir", "kesriGoster"] as const;

export type SayiDogrusuGorevi = (typeof SAYI_DOGRUSU_GOREVLERI)[number];

export type SiralamaYonu = "kucuktenBuyuge" | "buyuktenKucuge";

/** Sayı doğrusunda `pay/payda` konumunu gösteren bir işaretçi. */
export interface SayiDogrusuIsaretcisi {
  id: string;
  /** İşaretçiyi temsil eden emoji (ör. "🐞"). */
  simge: string;
  /** Simgenin sözlü adı (ör. "uğur böceği"); erişilebilirlik metninde kullanılır. */
  ad: string;
  pay: number;
  payda: number;
}

/** Her işaretçinin kendi sayı doğrusunda (kendi paydasına göre bölünmüş) çizildiği görevler için. */
export interface AyriDogruIsaretcisi extends SayiDogrusuIsaretcisi {
  /** Bu işaretçinin sayı doğrusunun 0'dan başlayıp bittiği tam sayı. */
  aralikSonu: number;
}

/** Tüm işaretçilerin tek bir sayı doğrusunda gösterildiği görevler için. */
export interface OrtakSayiDogrusu {
  aralikSonu: number;
  /** Her birimin kaç eş parçaya bölündüğü. */
  bolme: number;
}

interface SayiDogrusuOrtak {
  bilgi?: string;
  onculu?: string;
  dogruSecenekId: string;
}

export interface SiralamaSecenegi extends SecenekKimligi {
  /** İşaretçi id'lerinin bu şıktaki sırası. */
  sira: string[];
}

export interface IsaretciSecenegi extends SecenekKimligi {
  isaretciId: string;
}

export interface KesirSecenegi extends SecenekKimligi, Kesir {}

export type SayiDogrusuVerisi = SayiDogrusuOrtak &
  (
    | {
        gorev: "siralama";
        isaretciler: AyriDogruIsaretcisi[];
        siralama: SiralamaYonu;
        secenekler: SiralamaSecenegi[];
      }
    | {
        gorev: "hedefeEnYakin";
        isaretciler: AyriDogruIsaretcisi[];
        hedef: Kesir;
        secenekler: IsaretciSecenegi[];
      }
    | {
        gorev: "isaretliKesir";
        dogru: OrtakSayiDogrusu;
        isaretciler: SayiDogrusuIsaretcisi[];
        secenekler: KesirSecenegi[];
      }
    | {
        gorev: "kesriGoster";
        dogru: OrtakSayiDogrusu;
        isaretciler: SayiDogrusuIsaretcisi[];
        hedef: Kesir;
        secenekler: IsaretciSecenegi[];
      }
  );

// ---------------------------------------------------------------------------
// kesir_kartlari
// ---------------------------------------------------------------------------

export const KESIR_KARTLARI_GOREVLERI = ["ifadeDegerlendirme", "turuBul", "gosterimDonusumu"] as const;

export type KesirKartlariGorevi = (typeof KESIR_KARTLARI_GOREVLERI)[number];

export const KART_RENKLERI = ["mavi", "kirmizi", "yesil", "sari", "mor", "turuncu"] as const;

export type KartRengi = (typeof KART_RENKLERI)[number];

export const KESIR_TURU_IDDIALARI = ["basit", "bilesik", "tamSayili", "birim"] as const;

export type KesirTuruIddiasi = (typeof KESIR_TURU_IDDIALARI)[number];

export interface KesirKarti extends Kesir {
  id: string;
  renk: KartRengi;
}

export interface OgrenciIfadesi {
  id: string;
  ad: string;
  kartId: string;
  iddia: KesirTuruIddiasi;
}

export type KesirKartlariSoruBicimi = "dogruSoyleyenler" | "yanlisSoyleyenler";

export interface OgrenciGrubuSecenegi extends SecenekKimligi {
  ogrenciIdleri: string[];
}

export interface KartSecenegi extends SecenekKimligi {
  kartId: string;
}

interface KesirKartlariOrtak {
  baglam?: string;
  kartlar: KesirKarti[];
  dogruSecenekId: string;
}

export type KesirKartlariVerisi = KesirKartlariOrtak &
  (
    | {
        gorev: "ifadeDegerlendirme";
        ogrenciler: OgrenciIfadesi[];
        soruBicimi: KesirKartlariSoruBicimi;
        secenekler: OgrenciGrubuSecenegi[];
      }
    | {
        gorev: "turuBul";
        hedefTur: KesirTuruIddiasi;
        secenekler: KartSecenegi[];
      }
    | {
        gorev: "gosterimDonusumu";
        hedefKartId: string;
        secenekler: KesirSecenegi[];
      }
  );

// ---------------------------------------------------------------------------
// gercek_hayat_senaryo
// ---------------------------------------------------------------------------

export const SENARYO_GOREVLERI = ["karsilastirma", "kalaniBulma", "coklugunKesri", "cokAdimliCikarim"] as const;

export type SenaryoGorevi = (typeof SENARYO_GOREVLERI)[number];

export const SENARYO_SAHNELERI = ["market", "mutfak", "sinif", "park", "yolculuk", "genel"] as const;

export type SenaryoSahnesi = (typeof SENARYO_SAHNELERI)[number];

export interface MetinSecenegi extends SecenekKimligi {
  metin: string;
}

export interface GercekHayatSenaryoVerisi {
  gorev: SenaryoGorevi;
  /** Dekoratif sahne anahtarı — soru mantığına hiçbir bilgi taşımaz. */
  sahne: SenaryoSahnesi;
  senaryo: string;
  secenekler: MetinSecenegi[];
  dogruSecenekId: string;
}

// ---------------------------------------------------------------------------

export interface GorselSoruVeriHaritasi {
  sayi_dogrusu: SayiDogrusuVerisi;
  kesir_kartlari: KesirKartlariVerisi;
  gercek_hayat_senaryo: GercekHayatSenaryoVerisi;
}

export interface GorselSoruGorevHaritasi {
  sayi_dogrusu: SayiDogrusuGorevi;
  kesir_kartlari: KesirKartlariGorevi;
  gercek_hayat_senaryo: SenaryoGorevi;
}

/** `tip` alanına göre ayrışan (discriminated) içerik birliği. */
export type GorselSoruIcerigi = {
  [K in GorselSoruTipi]: { tip: K; veri: GorselSoruVeriHaritasi[K] };
}[GorselSoruTipi];

/** Blueprint'in bir `gorselSoru` sırasına atadığı tip ve görev. */
export type GorselSoruPlani = {
  [K in GorselSoruTipi]: { tip: K; gorev: GorselSoruGorevHaritasi[K] };
}[GorselSoruTipi];
