import { oranMetni, oranYap, type Oran } from "@/lib/quiz-generator/gorsel-sorular/kesir-aritmetigi";
import type { GorselSoruTanimi } from "@/lib/quiz-generator/gorsel-sorular/ortak";
import {
  PLANLI_GORSEL_SEMA_ACIKLAMASI,
  metinPlani,
  planliDogruCevapMetni,
  planliGorselDogrula,
  planliGorselSema,
  siklar,
  type CizimPlaniOf,
  type PlanliGorselPlan,
  type Uretim as GenelUretim,
} from "@/lib/quiz-generator/gorsel-sorular/planli-gorsel";
import { rastgeleOlustur, type Rastgele } from "@/lib/quiz-generator/gorsel-sorular/senaryo-sayilari";
import { ETAP_DOGRUSU_GOREVLERI, type EtapDogrusuGorevi, type EtapDogrusuVerisi, type Kesir } from "@/types/gorsel-soru";

/**
 * etap_dogrusu — sayı doğrusu HEDEF MODELİ (references/senaryo-kalite-referans-v2.md,
 * "sayidogrusu"): 0–1 ve 1–2 aralıkları FARKLI sayıda eş parçaya bölünmüş bir
 * doğru üzerinde K ve L noktaları. Hareket eden bir nesne 0 → K (1. etap) ve
 * K → L (2. etap) gider; öğrenci iki farklı paydalı konumu okuyup etapları
 * hesaplar ve karşılaştırır. Emoji/ikon eşleştirme yoktur (TYMM: dekoratif
 * işaretçi yasağı). Doğruyu, noktaları ve cevabı KOD kurar.
 */

type Uretim = GenelUretim<CizimPlaniOf<"etap_dogrusu">>;

const o = (pay: number, payda = 1): Oran => oranYap({ pay, payda });
const yaz = (oran: Oran) => oranMetni(oran);
const fark = (a: Oran, b: Oran) => o(a.pay * b.payda - b.pay * a.payda, a.payda * b.payda);

/** Birinci ve ikinci birimin bölme sayıları; biri diğerinin katı (5. sınıfta paydaları eşitleme). */
const BOLME_CIFTLERI: readonly [number, number][] = [
  [6, 3], [3, 6], [4, 8], [8, 4], [2, 6], [6, 2], [4, 2], [2, 4], [5, 10], [10, 5],
];

interface EtapBaglami {
  konu: string;
  baglam: string;
  anahtarIfadeler: string[][];
}

const ETAP_BAGLAMLARI: readonly EtapBaglami[] = [
  {
    konu: "ev",
    baglam:
      "Bir robot süpürge şarj istasyonundan (0 noktası) başlayarak doğrusal bir hat boyunca ilerlemektedir. Birinci " +
      "etapta K noktasına, ikinci etapta K noktasından L noktasına kadar temizlik yapmıştır.",
    anahtarIfadeler: [["robot"], ["k noktas"], ["l noktas"], ["etap"]],
  },
  {
    konu: "spor",
    baglam:
      "Bir koşucu başlangıç çizgisinden (0 noktası) başlayarak düz bir parkurda ilerlemektedir. Birinci etapta K " +
      "noktasına kadar koşmuş, ikinci etapta K noktasından L noktasına kadar yürümüştür.",
    anahtarIfadeler: [["koşucu"], ["k noktas"], ["l noktas"], ["etap"]],
  },
  {
    konu: "lojistik",
    baglam:
      "Bir kargo dronu depodan (0 noktası) kalkarak düz bir rota boyunca uçmaktadır. Birinci etapta K noktasındaki " +
      "teslimat adresine, ikinci etapta K noktasından L noktasındaki adrese kadar uçmuştur.",
    anahtarIfadeler: [["dron"], ["k noktas"], ["l noktas"], ["etap"]],
  },
  {
    konu: "ulaşım",
    baglam:
      "Bir tramvay ilk durağından (0 noktası) hareket ederek düz bir hat boyunca ilerlemektedir. Birinci etapta K " +
      "durağına, ikinci etapta K durağından L durağına kadar gitmiştir.",
    anahtarIfadeler: [["tramvay"], ["k durağ"], ["l durağ"], ["etap"]],
  },
];

const SAYI_YAZMA =
  " Aralıkların kaç parçaya bölündüğünü ve noktaların konumlarını metne YAZMA: öğrenci doğrudan okur.";

function etapFarki(r: Rastgele): Uretim {
  const b = r.sec(ETAP_BAGLAMLARI);
  const [a1, a2] = r.sec(BOLME_CIFTLERI);
  const i = r.aralik(1, a1 - 1);
  const j = r.aralik(1, a2 - 1);
  const k = o(i, a1);
  const l = o(a2 + j, a2);
  const ikinci = fark(l, k);
  const cevap = fark(ikinci, k);
  if (cevap.pay <= 0) return undefined;
  const birim = (oran: Oran) => `${yaz(oran)} birim`;
  const ortakPayda = Math.max(a1, a2);
  const cizgiK = o(i + 1, a1);
  const cizgiL = o(a2 + j + 1, a2);
  const cizgiSayma = fark(fark(cizgiL, cizgiK), cizgiK);
  const ayniBolme = fark(fark(o(a1 + j, a1), k), k); // ikinci birimi de birinci gibi bölünmüş sanmak
  const secenekler = siklar(r, birim(cevap), [
    { metin: birim(ikinci), hata: "yalnizcaIkinciEtap" },
    ...(ayniBolme.pay > 0 ? [{ metin: birim(ayniBolme), hata: "ayniBolmeSanma" }] : []),
    ...(cizgiSayma.pay > 0 ? [{ metin: birim(cizgiSayma), hata: "cizgiSayma" }] : []),
    { metin: birim(l), hata: "konumuYolSanma" },
    { metin: birim(fark(cevap, o(-1, ortakPayda))), hata: "birBolmeFazla" },
  ]);
  if (!secenekler) return undefined;
  const konumK: Kesir = { pay: i, payda: a1 };
  const konumL: Kesir = { tam: 1, pay: j, payda: a2 };
  return {
    cizim: { tip: "etap_dogrusu", dogru: { bolmeler: [a1, a2], noktalar: [{ ad: "K", konum: konumK }, { ad: "L", konum: konumL }] } },
    cikarim: metinPlani({
      baglam: b.baglam + SAYI_YAZMA,
      konu: b.konu,
      ornekSoru: "Buna göre ikinci etapta alınan yol, birinci etapta alınan yoldan kaç birim fazladır?",
      anahtarIfadeler: b.anahtarIfadeler,
      kokIfadeleri: [["fazla"]],
      ipucu:
        `0–1 arası ${a1}, 1–2 arası ${a2} eş parça; K = ${yaz(k)}, L = ${yaz(l)}; 1. etap ${yaz(k)}, ` +
        `2. etap ${yaz(l)} − ${yaz(k)} = ${yaz(ikinci)}; fark ${yaz(cevap)}`,
      cozum:
        `0 ile 1 arası ${a1}, 1 ile 2 arası ${a2} eş parçaya bölünmüştür. K = ${yaz(k)}, L = ${yaz(l)}. Birinci etap ` +
        `${yaz(k)} birim, ikinci etap ${yaz(l)} − ${yaz(k)} = ${yaz(ikinci)} birimdir. Fark: ${yaz(ikinci)} − ${yaz(k)} = ` +
        `${yaz(cevap)} birim.`,
      secenekler,
    }),
  };
}

const URETICILER: Record<EtapDogrusuGorevi, (r: Rastgele) => Uretim> = { etapFarki };

/** Deterministik: aynı tohum aynı planı verir; koşulları sağlamayan tohumlar atlanır. */
export function etapDogrusuPlaniUret(gorev: EtapDogrusuGorevi, tohum: number): PlanliGorselPlan<CizimPlaniOf<"etap_dogrusu">> {
  for (let deneme = 0; ; deneme += 1) {
    const plan = URETICILER[gorev](rastgeleOlustur(tohum + deneme * 1013));
    if (plan) return plan;
  }
}

// ---------------------------------------------------------------------------
// Tanım
// ---------------------------------------------------------------------------

const gorevler: GorselSoruTanimi<"etap_dogrusu">["gorevler"] = {
  etapFarki: {
    gorev: "etapFarki",
    etiket: "İki etabın farkı (farklı bölmeli aralıklar)",
    aciklama:
      "Doğrunun 0–1 ve 1–2 aralıkları farklı sayıda eş parçaya bölünmüştür. Öğrenci K ve L noktalarının konumlarını " +
      "okur, birinci (0 → K) ve ikinci (K → L) etabı hesaplar ve aradaki farkı bulur. İkinci aralığı da birinci gibi " +
      "bölünmüş sanmak ve aralık yerine çizgi saymak tipik hatalardır.",
    kesirKonusuGerekir: true,
    semaAciklamasi: PLANLI_GORSEL_SEMA_ACIKLAMASI,
    kurallar: ["Bölme sayılarını ve noktaların konumlarını metne yazma; yalnızca K ve L noktalarının adlarını kullan."],
    ornek: {
      tip: "etap_dogrusu",
      veri: {
        gorev: "etapFarki",
        senaryo:
          "Bir robot süpürge şarj istasyonundan (0 noktası) başlayarak doğrusal bir hat boyunca ilerlemektedir. Birinci " +
          "etapta K noktasına, ikinci etapta K noktasından L noktasına kadar temizlik yapmıştır.",
        soru: "Buna göre ikinci etapta alınan yol, birinci etapta alınan yoldan kaç birim fazladır?",
      },
    },
    ornekCizim: {
      tip: "etap_dogrusu",
      dogru: {
        bolmeler: [6, 3],
        noktalar: [
          { ad: "K", konum: { pay: 2, payda: 6 } },
          { ad: "L", konum: { tam: 1, pay: 2, payda: 3 } },
        ],
      },
    },
    ornekCikarim: metinPlani({
      baglam: "Robot süpürge 0 → K (1. etap), K → L (2. etap) gider; konumlar doğrudan okunur.",
      konu: "ev",
      ornekSoru: "Buna göre ikinci etapta alınan yol, birinci etapta alınan yoldan kaç birim fazladır?",
      anahtarIfadeler: [["k noktas"], ["l noktas"], ["etap"]],
      kokIfadeleri: [["fazla"]],
      ipucu: "0–1 arası 6, 1–2 arası 3 eş parça; K = 1/3, L = 1 2/3; 1. etap 1/3, 2. etap 1 1/3; fark 1",
      cozum:
        "0 ile 1 arası 6, 1 ile 2 arası 3 eş parçaya bölünmüştür. K = 2/6 = 1/3, L = 1 2/3. Birinci etap 1/3 birim, " +
        "ikinci etap 1 2/3 − 1/3 = 1 1/3 birimdir. Fark: 1 1/3 − 1/3 = 1 birim.",
      secenekler: [
        { metin: "1 1/3 birim", hata: "yalnizcaIkinciEtap" },
        { metin: "1 birim" },
        { metin: "2/3 birim", hata: "ayniBolmeSanma" },
        { metin: "1 2/3 birim", hata: "konumuYolSanma" },
      ],
    }),
    jsonSemasi: planliGorselSema("etapFarki"),
  },
};

export const etapDogrusuTanimi: GorselSoruTanimi<"etap_dogrusu"> = {
  tip: "etap_dogrusu",
  etiket: "Sayı doğrusu (hareket / etap modeli)",
  aciklama:
    "Aralıkları farklı sayıda eş parçaya bölünmüş bir sayı doğrusu ve üzerinde harfle adlandırılmış noktalar. Sistem " +
    "doğruyu ve noktaları plandan çizer, doğru cevabı kendisi hesaplar; öğrenci konumları okuyup etapları karşılaştırır.",
  gorselKategorisi: "fonksiyonel",
  gorselStratejisi: "svg",
  kesirKonusuGerekir: true,
  kurallar: [
    "Bağlam doğrusal bir harekettir (robot süpürge, koşucu). Noktaların konumları ve aralıkların bölmeleri DOĞRUDA " +
      "görünür; bunları metne yazma (sistem metindeki plan dışı sayıları reddeder).",
    "Noktalar yalnızca harfle (K, L) anılır; emoji ya da ikon kullanma.",
  ],
  // references/senaryo-kalite-referans-v2.md — TYMM HEDEF MODEL (sayı doğrusu).
  hedefSeviyeOrnekleri: [
    "Robot süpürge: \"0 ile 1 arası 6, 1 ile 2 arası 4 eş parçaya bölünmüş doğruda süpürge birinci etapta K'ye, ikinci " +
      "etapta K'den L'ye gitmiştir. İkinci etapta aldığı yol birinciden kaç birim fazladır?\" — farklı paydalı iki " +
      "aralığı ayrı ayrı okuma + iki çıkarma.",
  ],
  ortakSemaAciklamasi: [],
  gorevler,
  dogrula: (raw, path, sorunlar, plan) =>
    planliGorselDogrula(
      raw,
      path,
      sorunlar,
      plan,
      // "0 noktası" ve "ikinci etap" gibi ifadelerdeki 0 ve 2 serbesttir.
      { gorevler: ETAP_DOGRUSU_GOREVLERI, cizimTipi: "etap_dogrusu", serbestSayilar: () => [0, 2] },
      (ortak, cizim): EtapDogrusuVerisi => ({ ...ortak, dogru: cizim.dogru })
    ),
  dogruCevapMetni: planliDogruCevapMetni,
};
