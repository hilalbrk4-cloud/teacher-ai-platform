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

export const GORSEL_SORU_TIPLERI = ["sayi_dogrusu", "kesir_kartlari", "gercek_hayat_senaryo", "daire_kesir", "kesir_cubugu", "alan_izgara", "tablo_kesir", "cetvel_olcum", "etap_dogrusu"] as const;

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

export const SENARYO_GOREVLERI = [
  "bolmeEnFazla",
  "birimOlcekleme",
  "araliklar",
  "kalaniBulma",
  "coklugunKesri",
  "karsilastirma",
  "parcaButun",
  "kesirSiralama",
  "olabilirCikarim",
  "denklikOlamaz",
  "cokAdimliCikarim",
] as const;

export type SenaryoGorevi = (typeof SENARYO_GOREVLERI)[number];

/**
 * Cevabı bir sayı değil bir sıralama ya da seçim olan görevler: bağlamı,
 * verileri, doğru cevabı ve şıkları kod kurar (bkz. `SenaryoCikarimPlani`);
 * model yalnızca senaryo metnini ve soru kökünü yazar.
 */
export const CIKARIM_GOREVLERI = ["kesirSiralama", "olabilirCikarim", "denklikOlamaz"] as const;

export type CikarimGorevi = (typeof CIKARIM_GOREVLERI)[number];

/** Modelin hesap adımlarını yazdığı, kodun bu hesabı yeniden yaptığı görevler. */
export type SayisalGorevi = Exclude<SenaryoGorevi, "cokAdimliCikarim" | CikarimGorevi>;

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
// Planlı görsel tipler (references/gorsel-tip-haritasi.md)
//
// Çizim verisini, metne girecek değerleri, doğru cevabı ve şıkları KOD kurar
// (bkz. `planli-gorsel.ts`); model yalnızca senaryo metnini ve soru kökünü
// yazar. Görsel plandan çizildiği için cevapla her zaman tutarlıdır.
// ---------------------------------------------------------------------------

/** Planlı görsel tiplerin ortak `veri` alanları; `cizim` tipe özgüdür. */
interface PlanliGorselOrtak<G extends string> {
  gorev: G;
  senaryo: string;
  secenekler: MetinSecenegi[];
  dogruSecenekId: string;
}

// daire_kesir ---------------------------------------------------------------

export const DAIRE_KESIR_GOREVLERI = [
  "boyaKarisimi",
  "kalanPaylasim",
  "ikiPizzaKarsilastir",
  "toplamIkiPizza",
  "denklikDegil",
] as const;

export type DaireKesirGorevi = (typeof DAIRE_KESIR_GOREVLERI)[number];

export const DAIRE_RENKLERI = ["turuncu", "mavi", "yesil", "mor", "pembe"] as const;

export type DaireRengi = (typeof DAIRE_RENKLERI)[number];

/** `dilim` eş parçaya bölünmüş daire; ilk `boyali` dilim dolu çizilir. */
export interface DaireCizimi {
  dilim: number;
  boyali: number;
  renk: DaireRengi;
  /** Dairenin üstünde yazan ad (ör. iki pizzanın sahipleri). */
  ad?: string;
}

export interface DaireKesirVerisi extends PlanliGorselOrtak<DaireKesirGorevi> {
  daireler: DaireCizimi[];
}

// kesir_cubugu --------------------------------------------------------------

export const KESIR_CUBUGU_GOREVLERI = ["esitOlmayanGosterim", "seritFarki", "seritToplami"] as const;

export type KesirCubuguGorevi = (typeof KESIR_CUBUGU_GOREVLERI)[number];

/** `parca` eş parçaya bölünmüş bir şerit; ilk `tarali` parça taralı çizilir. Şeritlerin hepsi aynı uzunluktadır. */
export interface CubukCizimi {
  parca: number;
  tarali: number;
  /** Şeridin üstünde yazan ad (ör. iki öğrencinin şeritleri). */
  ad?: string;
}

export interface KesirCubuguVerisi extends PlanliGorselOrtak<KesirCubuguGorevi> {
  cubuklar: CubukCizimi[];
}

// alan_izgara ---------------------------------------------------------------

export const ALAN_IZGARA_GOREVLERI = ["sonradanBoyanan", "damlamaUcu", "bosAlanOlcusu"] as const;

export type AlanIzgaraGorevi = (typeof ALAN_IZGARA_GOREVLERI)[number];

export const IZGARA_RENKLERI = ["mavi", "turuncu", "yesil"] as const;

export type IzgaraRengi = (typeof IZGARA_RENKLERI)[number];

/**
 * `satir × sutun` eş kareli ızgara. `boyalar` sırayla, satır satır soldan
 * sağa boyanır (ilk boyanın `sayi` karesi, ardından ikincisininki…).
 */
export interface IzgaraCizimi {
  satir: number;
  sutun: number;
  boyalar: { renk: IzgaraRengi; sayi: number }[];
}

export interface AlanIzgaraVerisi extends PlanliGorselOrtak<AlanIzgaraGorevi> {
  izgara: IzgaraCizimi;
}

// tablo_kesir ---------------------------------------------------------------

export const TABLO_KESIR_GOREVLERI = ["esikSay", "enBuyukFark"] as const;

export type TabloKesirGorevi = (typeof TABLO_KESIR_GOREVLERI)[number];

/** İki sütunlu tablo: her satır bir ad ve bir kesir değeri (yazıldığı gibi gösterilir). */
export interface TabloCizimi {
  basliklar: [string, string];
  satirlar: { ad: string; deger: Kesir }[];
}

export interface TabloKesirVerisi extends PlanliGorselOrtak<TabloKesirGorevi> {
  tablo: TabloCizimi;
}

// cetvel_olcum --------------------------------------------------------------

export const CETVEL_OLCUM_GOREVLERI = ["kamaBolme", "kalanParca"] as const;

export type CetvelOlcumGorevi = (typeof CETVEL_OLCUM_GOREVLERI)[number];

/**
 * `uzunluk` santimetrelik, her santimetresi `bolme` eş parçaya bölünmüş cetvel ve
 * üstünde ölçülen nesneler. Konumlar santimetre cinsinden kesirdir ve her zaman
 * bir bölme çizgisine denk gelir (payda = bolme).
 */
export interface CetvelCizimi {
  uzunluk: number;
  bolme: number;
  nesneler: { ad: string; baslangic: Kesir; bitis: Kesir }[];
}

export interface CetvelOlcumVerisi extends PlanliGorselOrtak<CetvelOlcumGorevi> {
  cetvel: CetvelCizimi;
}

// etap_dogrusu --------------------------------------------------------------

export const ETAP_DOGRUSU_GOREVLERI = ["etapFarki"] as const;

export type EtapDogrusuGorevi = (typeof ETAP_DOGRUSU_GOREVLERI)[number];

/**
 * 0'dan bolmeler.length'e kadar sayı doğrusu; i. birim (i ile i+1 arası)
 * bolmeler[i] eş parçaya bölünür (birimler farklı bölünebilir). Noktalar harfle
 * adlandırılır (emoji yok) ve her biri bir bölme çizgisine denk gelir.
 */
export interface EtapDogrusuCizimi {
  bolmeler: number[];
  noktalar: { ad: string; konum: Kesir }[];
}

export interface EtapDogrusuVerisi extends PlanliGorselOrtak<EtapDogrusuGorevi> {
  dogru: EtapDogrusuCizimi;
}

/** Blueprint'in planlı görsel sorular için kurduğu çizim verisi. */
export type GorselCizimPlani =
  | { tip: "daire_kesir"; daireler: DaireCizimi[] }
  | { tip: "kesir_cubugu"; cubuklar: CubukCizimi[] }
  | { tip: "alan_izgara"; izgara: IzgaraCizimi }
  | { tip: "tablo_kesir"; tablo: TabloCizimi }
  | { tip: "cetvel_olcum"; cetvel: CetvelCizimi }
  | { tip: "etap_dogrusu"; dogru: EtapDogrusuCizimi };

// ---------------------------------------------------------------------------

export interface GorselSoruVeriHaritasi {
  sayi_dogrusu: SayiDogrusuVerisi;
  kesir_kartlari: KesirKartlariVerisi;
  gercek_hayat_senaryo: GercekHayatSenaryoVerisi;
  daire_kesir: DaireKesirVerisi;
  kesir_cubugu: KesirCubuguVerisi;
  alan_izgara: AlanIzgaraVerisi;
  tablo_kesir: TabloKesirVerisi;
  cetvel_olcum: CetvelOlcumVerisi;
  etap_dogrusu: EtapDogrusuVerisi;
}

export interface GorselSoruGorevHaritasi {
  sayi_dogrusu: SayiDogrusuGorevi;
  kesir_kartlari: KesirKartlariGorevi;
  gercek_hayat_senaryo: SenaryoGorevi;
  daire_kesir: DaireKesirGorevi;
  kesir_cubugu: KesirCubuguGorevi;
  alan_izgara: AlanIzgaraGorevi;
  tablo_kesir: TabloKesirGorevi;
  cetvel_olcum: CetvelOlcumGorevi;
  etap_dogrusu: EtapDogrusuGorevi;
}

/** `tip` alanına göre ayrışan (discriminated) içerik birliği. */
export type GorselSoruIcerigi = {
  [K in GorselSoruTipi]: { tip: K; veri: GorselSoruVeriHaritasi[K] };
}[GorselSoruTipi];

/**
 * Sayısal senaryo görevlerinde sayıları kod seçer (bkz. `senaryo-sayilari.ts`):
 * model bu sayılarla senaryoyu yazar, kod da hesabının `cevap`a ulaştığını
 * denetler.
 */
export interface SenaryoSayilari {
  /** Kodun seçtiği gerçekçi bağlam (ör. terzi ve kumaş); model senaryoyu bu bağlamda yazar. */
  baglam: string;
  /** Bağlamın konusu (ör. "market", "tarım"); aynı quizde aynı konu tekrar etmesin diye. */
  konu?: string;
  /** Bu bağlam için doğal Türkçeyle yazılmış örnek soru kökü. */
  ornekSoru: string;
  /** Şıklarda sayının yanına yazılan birim (ör. "kg", "sayfa"); sayılan nesnelerde yok. */
  birim?: string;
  /**
   * Senaryoda MUTLAKA geçmesi gereken bilgiler: her grup, aynı bilginin
   * kabul edilen yazımlarıdır (ör. ["her kare", "her bir kare"]). Bunlar
   * olmadan soru eksik veya iki anlamlı kalır.
   */
  anahtarIfadeler?: string[][];
  veriler: { ad: string; deger: Kesir }[];
  cevap: Kesir;
  /** Sayılar arasındaki ilişki (ör. "34/5 ÷ 8/5 = 4 1/4 → en fazla 4"). */
  ipucu: string;
  /**
   * Şıklar, gösterilecek sırayla. Doğru şıkta `hata` yoktur; her çeldirici,
   * adı verilen bir öğrenci hatasının hesaplanmış sonucudur.
   */
  secenekler: { deger: Kesir; hata?: string }[];
}

/**
 * Çıkarım görevlerinde (sıralama, "olabilir", "olamaz") kodun kurduğu plan:
 * doğru cevap ve her çeldirici koddan gelir, model yalnızca metni yazar;
 * kod metnin bu verileri ve ifadeleri içerdiğini denetler.
 */
export interface SenaryoCikarimPlani {
  baglam: string;
  /** Bağlamın konusu (ör. "tarım"); aynı quizde aynı konu tekrar etmesin diye. */
  konu: string;
  ornekSoru: string;
  /** Senaryoda aynen (aynı yazımla) geçmesi gereken sayılar. */
  veriler: { ad: string; deger: Kesir }[];
  /** Senaryoda geçmesi gereken adlar (ürün, kişi…); şıklar bu adlarla yazılır. */
  adlar: string[];
  /** Senaryoda geçmesi gereken bilgiler; her grup aynı bilginin kabul edilen yazımlarıdır. */
  anahtarIfadeler: string[][];
  /** Soru kökünde geçmesi gereken ifadeler (ör. "büyükten küçüğe", "olamaz"). */
  kokIfadeleri: string[][];
  /** Doğru cevaba nasıl ulaşıldığı (prompt'ta modele gösterilir). */
  ipucu: string;
  /** Öğrenciye gösterilecek çözüm; koddan üretilir. */
  cozum: string;
  /** Şıklar, gösterilecek sırayla; doğru şıkta `hata` yoktur. */
  secenekler: { metin: string; hata?: string }[];
}

/** Blueprint'in bir `gorselSoru` sırasına atadığı tip, görev ve (senaryolarda) kodun kurduğu plan. */
export type GorselSoruPlani = {
  [K in GorselSoruTipi]: { tip: K; gorev: GorselSoruGorevHaritasi[K] };
}[GorselSoruTipi] & { sayilar?: SenaryoSayilari; cikarim?: SenaryoCikarimPlani; cizim?: GorselCizimPlani };
