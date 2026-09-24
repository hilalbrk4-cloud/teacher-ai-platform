import {
  JSON_BOS_OLABILIR_METIN,
  JSON_METIN,
  dogruSecenegiDogrula,
  isRecord,
  jsonDizi,
  jsonGorev,
  jsonNesne,
  jsonSecim,
  metindekiKesirler,
  metinKesriIceriyorMu,
  metniNormallestir,
  okuIstegeBagliMetin,
  okuKimlikliDizi,
  okuMetin,
  okuSecim,
  secenekHarfi,
  type GorselSoruSorunu,
  type GorselSoruTanimi,
  type JsonSemasi,
} from "@/lib/quiz-generator/gorsel-sorular/ortak";
import {
  SENARYO_GOREVLERI,
  SENARYO_SAHNELERI,
  type GercekHayatSenaryoVerisi,
  type MetinSecenegi,
  type SenaryoGorevi,
  type SenaryoSahnesi,
} from "@/types/gorsel-soru";

const SECENEK_SINIRI = { min: 3, max: 5 };
const SENARYO_EN_KISA = 80;
const EN_AZ_ISLEM_ADIMI = 2;

function sahneOku(value: unknown): SenaryoSahnesi {
  // Sahne yalnızca dekoratiftir: tanınmayan bir değer soruyu geçersiz
  // kılmaz, nötr "genel" sahneye düşer.
  return typeof value === "string" && (SENARYO_SAHNELERI as readonly string[]).includes(value)
    ? (value as SenaryoSahnesi)
    : "genel";
}

/**
 * Doğru cevap TEK bir kesir değeriyse (ör. "1 1/8 kg") ve bu değer senaryoda
 * herhangi bir biçimde (denk yazımlar dâhil) zaten geçiyorsa, öğrenci işlem
 * yapmadan cevabı metinden okuyabilir. Birden fazla kesir içeren cevaplar
 * (ör. bir sıralama) ve tam sayılar ("3 kek", "2 kardeş") denetlenmez:
 * onların metinde geçmesi doğal ve masumdur.
 */
function cevapSenaryodaVarMi(senaryo: string, dogruMetin: string): string | undefined {
  const cevaptakiler = metindekiKesirler(dogruMetin);
  if (cevaptakiler.length !== 1) return undefined;
  const cevap = cevaptakiler[0];
  return metinKesriIceriyorMu(senaryo, cevap.kesir) ? cevap.metin : undefined;
}

function dogrula(raw: unknown, path: string, sorunlar: GorselSoruSorunu[]) {
  if (!isRecord(raw)) {
    sorunlar.push({ path, message: '"veri" bir JSON nesnesi olmalıdır.' });
    return undefined;
  }

  const gorev = okuSecim(raw, "gorev", SENARYO_GOREVLERI, path, sorunlar);
  const senaryo = okuMetin(raw, "senaryo", path, sorunlar);
  const soru = okuMetin(raw, "soru", path, sorunlar);
  const dogruSecenekId = okuMetin(raw, "dogruSecenekId", path, sorunlar);
  const secenekler = okuKimlikliDizi<MetinSecenegi>(
    raw.secenekler,
    `${path}.secenekler`,
    sorunlar,
    SECENEK_SINIRI,
    (oge, id, ogePath) => {
      const metin = okuMetin(oge, "metin", ogePath, sorunlar);
      return metin ? { id, metin } : undefined;
    }
  );

  const hamAdimlar = raw.islemAdimlari;
  const islemAdimlari = Array.isArray(hamAdimlar)
    ? hamAdimlar.filter((adim): adim is string => typeof adim === "string" && adim.trim().length > 0)
    : [];
  if (islemAdimlari.length < EN_AZ_ISLEM_ADIMI) {
    sorunlar.push({
      path: `${path}.islemAdimlari`,
      message: `Çözüm en az ${EN_AZ_ISLEM_ADIMI} işlem adımı gerektirmelidir; cevap tek bir okuma veya karşılaştırmayla bulunmamalı.`,
    });
    return undefined;
  }

  if (senaryo && senaryo.length < SENARYO_EN_KISA) {
    sorunlar.push({
      path: `${path}.senaryo`,
      message: `"senaryo" en az ${SENARYO_EN_KISA} karakterlik, sorunun tüm verisini içeren bir metin olmalıdır.`,
    });
    return undefined;
  }
  if (!gorev || !senaryo || !soru || !dogruSecenekId || !secenekler) return undefined;

  if (new Set(secenekler.map((secenek) => metniNormallestir(secenek.metin))).size !== secenekler.length) {
    sorunlar.push({ path: `${path}.secenekler`, message: "İki şıkkın metni aynı olamaz." });
    return undefined;
  }

  // Bu tipte doğru cevap metinden hesaplanamaz; yalnızca işaretli şıkkın var olduğu doğrulanır.
  const tutarli = dogruSecenegiDogrula(
    secenekler,
    dogruSecenekId,
    (secenek) => secenek.id === dogruSecenekId,
    path,
    sorunlar
  );
  if (!tutarli) return undefined;

  const dogruMetin = secenekler.find((secenek) => secenek.id === dogruSecenekId)?.metin ?? "";
  const verilenCevap = cevapSenaryodaVarMi(senaryo, dogruMetin);
  if (verilenCevap) {
    sorunlar.push({
      path: `${path}.senaryo`,
      message: `Doğru cevaptaki ${verilenCevap} senaryoda aynen geçiyor; öğrenci işlem yapmadan cevabı okuyabilir.`,
    });
    return undefined;
  }

  const veri: GercekHayatSenaryoVerisi = { gorev, sahne: sahneOku(raw.sahne), senaryo, secenekler, dogruSecenekId };
  const cozum = okuIstegeBagliMetin(raw, "cozum") ?? islemAdimlari.join(" ");
  return { soru, cozum, veri };
}

function dogruCevapMetni(veri: GercekHayatSenaryoVerisi): string {
  const index = veri.secenekler.findIndex((secenek) => secenek.id === veri.dogruSecenekId);
  const secenek = veri.secenekler[index];
  return secenek ? `${secenekHarfi(index)}) ${secenek.metin}` : "";
}

function gorevSemasi(gorev: SenaryoGorevi): JsonSemasi {
  // İşlem adımları şıklardan önce: model önce çok adımlı çözümü kurar,
  // sonra şıkları bu sonuca göre yazar.
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

const gorevler: GorselSoruTanimi<"gercek_hayat_senaryo">["gorevler"] = {
  karsilastirma: {
    gorev: "karsilastirma",
    etiket: "İşlem gerektiren karşılaştırma",
    aciklama:
      "Karşılaştırılacak nicelikler senaryoda hazır verilmez; öğrenci önce her birini bir işlemle bulur (ör. iki " +
      "parçayı toplar), sonra karşılaştırır ve farkı hesaplar.",
    kesirKonusuGerekir: true,
    semaAciklamasi: [],
    kurallar: [
      "İki kesri doğrudan karşılaştırtma (\"5/6 mı 1/2 mi büyük?\" YASAK); karşılaştırılacak değerler en az bir " +
        "işlemle (toplama, çıkarma, denk kesre çevirme) elde edilmeli.",
      "Soru hem kimin/neyin daha fazla olduğunu hem de farkın ne kadar olduğunu sorabilir.",
    ],
    ornek: {
      tip: "gercek_hayat_senaryo",
      veri: {
        gorev: "karsilastirma",
        sahne: "park",
        senaryo:
          "Elif ve Can okul bahçesindeki çiçekleri sulamak için eşit büyüklükteki kovalarını dolduruyor. Elif " +
          "kovasının önce 1/4'ünü, sonra 1/2'sini daha doldurdu. Can ise kovasını tek seferde 5/8'ine kadar doldurdu.",
        soru: "Buna göre kimin kovasında daha fazla su vardır ve fark kovanın kaçta kaçıdır?",
        islemAdimlari: [
          "Elif'in kovasındaki su: 1/4 + 1/2 = 1/4 + 2/4 = 3/4.",
          "3/4 = 6/8 olduğundan Can'ın 5/8'i ile karşılaştırılabilir: 6/8 > 5/8.",
          "Fark: 6/8 − 5/8 = 1/8.",
        ],
        cozum: "Elif'in kovası 1/4 + 1/2 = 3/4 = 6/8 doludur. 6/8 − 5/8 = 1/8; Elif'in kovasında 1/8 kova daha fazla su vardır.",
        secenekler: [
          { id: "A", metin: "Elif, 1/8 kova" },
          { id: "B", metin: "Can, 1/8 kova" },
          { id: "C", metin: "Elif, 1/4 kova" },
          { id: "D", metin: "İkisinde eşit miktarda su vardır." },
        ],
        dogruSecenekId: "A",
      },
    },
    jsonSemasi: gorevSemasi("karsilastirma"),
  },
  kalaniBulma: {
    gorev: "kalaniBulma",
    etiket: "Kalanı bulma",
    aciklama:
      "Bir bütünden (ör. 2 kg, 1 pizza, bir günün zamanı) farklı paydalı parçalar kullanılır; öğrenci kalan miktarı bulur.",
    kesirKonusuGerekir: true,
    semaAciklamasi: [],
    kurallar: [
      "En az iki parça kullanılmalı ve paydaları farklı olmalı; öğrenci paydaları eşitlemek zorunda kalmalı.",
      "Kalan miktar senaryoda hiçbir biçimde yazmamalı.",
    ],
    ornek: {
      tip: "gercek_hayat_senaryo",
      veri: {
        gorev: "kalaniBulma",
        sahne: "mutfak",
        senaryo:
          "Bir pastane sabah 2 kilogram çikolata aldı. Öğlene kadar bu çikolatanın 1/4 kilogramını kek yapımında, " +
          "5/8 kilogramını da kurabiye yapımında kullandı.",
        soru: "Akşam için kaç kilogram çikolata kalmıştır?",
        islemAdimlari: [
          "Kullanılan çikolata: 1/4 + 5/8 = 2/8 + 5/8 = 7/8 kg.",
          "Kalan çikolata: 2 − 7/8 = 16/8 − 7/8 = 9/8 kg.",
          "9/8 kg = 1 1/8 kg.",
        ],
        cozum: "Kullanılan: 1/4 + 5/8 = 7/8 kg. Kalan: 2 − 7/8 = 9/8 = 1 1/8 kg.",
        secenekler: [
          { id: "A", metin: "7/8 kg" },
          { id: "B", metin: "1 1/8 kg" },
          { id: "C", metin: "1 3/8 kg" },
          { id: "D", metin: "1 2/3 kg" },
        ],
        dogruSecenekId: "B",
      },
    },
    jsonSemasi: gorevSemasi("kalaniBulma"),
  },
  coklugunKesri: {
    gorev: "coklugunKesri",
    etiket: "Bir çokluğun kesrini bulma",
    aciklama:
      "Bir çokluğun (ör. 28 öğrenci, 60 dakika) belirtilen kesirleri alınır; öğrenci birden fazla adımda istenen " +
      "sayıyı bulur (ör. önce bir kısmı çıkarır, kalanın kesrini alır).",
    kesirKonusuGerekir: true,
    semaAciklamasi: [],
    kurallar: [
      "Tek adımlı \"24'ün 1/3'ü kaçtır?\" sorusu YASAK; en az iki kesir işlemi ardışık uygulanmalı.",
      "Tüm ara sonuçlar tam sayı çıkmalı (ör. 28'in 3/7'si = 12).",
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
        islemAdimlari: [
          "Servisle gelenler: 28'in 3/7'si = 12 öğrenci.",
          "Servisle gelmeyenler: 28 − 12 = 16 öğrenci; bunların 1/4'ü = 4 öğrenci bisikletle gelir.",
          "Yürüyerek gelenler: 16 − 4 = 12 öğrenci.",
        ],
        cozum: "28'in 3/7'si 12'dir; kalan 16 öğrencinin 1/4'ü (4 öğrenci) bisikletle gelir. Yürüyenler: 16 − 4 = 12.",
        secenekler: [
          { id: "A", metin: "4" },
          { id: "B", metin: "12" },
          { id: "C", metin: "16" },
          { id: "D", metin: "21" },
        ],
        dogruSecenekId: "B",
      },
    },
    jsonSemasi: gorevSemasi("coklugunKesri"),
  },
  cokAdimliCikarim: {
    gorev: "cokAdimliCikarim",
    etiket: "Çok adımlı çıkarım",
    aciklama:
      "Senaryodaki birden fazla bilgi birlikte değerlendirilerek bir sonuca ulaşılır; cevap tek bir cümleden okunamaz. " +
      "Her ders ve konu için uygundur.",
    kesirKonusuGerekir: false,
    semaAciklamasi: [],
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
    jsonSemasi: gorevSemasi("cokAdimliCikarim"),
  },
};

export const gercekHayatSenaryoTanimi: GorselSoruTanimi<"gercek_hayat_senaryo"> = {
  tip: "gercek_hayat_senaryo",
  etiket: "Gerçek hayat senaryosu",
  aciklama:
    "Güçlü, gerçekçi bir senaryo metni ve onu destekleyen sade, dekoratif bir sahne çizimi. Sorunun çözümü için " +
    "gereken her bilgi senaryo metnindedir; sahne yalnızca bağlamı canlandırır.",
  gorselKategorisi: "dekoratif",
  // Sahnenin nasıl üretileceğini yalnızca bu alan belirler:
  // "svg" → koddaki SVG sahneleri, "hazirGorsel" → public/gorseller/sahneler/<sahne>.webp,
  // "yapayZeka" → AI ile üretilen görsel (henüz uygulanmadı), "yok" → sahne gösterilmez.
  gorselStratejisi: "svg",
  kesirKonusuGerekir: false,
  kurallar: [
    "Cevap senaryoda doğrudan yazmamalı ve tek bir okuma/karşılaştırmayla bulunamamalı; öğrenci en az iki adımlı " +
      "bir işlem veya çıkarım yapmak ZORUNDA kalmalı. Doğru cevap bir kesirse o kesir senaryoda geçmemeli — sistem bunu kontrol eder.",
    "Senaryodaki HER cümle ya çözüm için gereken bir veriyi ya da o verinin anlaşılması için zorunlu bağlamı " +
      "vermeli. Duygu, merak veya süs cümleleri (\"yükseklikleri merak ediyorlar\", \"çok eğlendiler\") YAZMA. En " +
      "fazla 5 cümle.",
    "Sahne tamamen dekoratiftir ve hiçbir bilgi taşımaz: soru, sahne gösterilmese bile eksiksiz çözülebilmeli.",
    "Yanlış şıklar, adımlardan birini atlamak veya yanlış uygulamak gibi gerçekçi öğrenci hatalarından üretilmeli.",
  ],
  ortakSemaAciklamasi: [
    `"sahne": Senaryoya en uygun dekoratif sahne; şunlardan biri: ${SENARYO_SAHNELERI.join(", ")}.`,
    '"senaryo": En fazla 5 cümlelik, gerçekçi ve çözüm için gereken TÜM verileri içeren metin.',
    '"soru": Soru kökü.',
    '"islemAdimlari": ŞIKLARDAN ÖNCE yaz: çözümün en az 2 adımı, her biri bir işlem veya çıkarım cümlesi.',
    '"cozum": Kısa çözüm özeti; istemiyorsan null.',
    '"secenekler": 3-5 öğe; her öğe {"id","metin"}; biri "islemAdimlari"nın sonucunu birebir içermeli.',
    '"dogruSecenekId": Doğru şıkkın "id" değeri.',
  ],
  gorevler,
  dogrula,
  dogruCevapMetni,
};
