import {
  JSON_BOS_OLABILIR_METIN,
  JSON_BOS_OLABILIR_TAM_SAYI,
  JSON_MANTIKSAL,
  JSON_METIN,
  JSON_TAM_SAYI,
  dogruSecenegiUzlastir,
  isRecord,
  jsonDizi,
  jsonGorev,
  jsonNesne,
  jsonSecim,
  kesirlerEsitMi,
  kesirMetni,
  metniNormallestir,
  okuIstegeBagliMetin,
  okuKesir,
  okuKimlikliDizi,
  okuMetin,
  okuSecim,
  okuTamSayi,
  secenekHarfi,
  tekrarlananSecenekleriAyikla,
  yokMu,
  type GorselSoruDogrulamaSonucu,
  type GorselSoruSorunu,
  type GorselSoruTanimi,
  type JsonSemasi,
} from "@/lib/quiz-generator/gorsel-sorular/ortak";
import {
  KART_RENKLERI,
  KESIR_KARTLARI_GOREVLERI,
  KESIR_TURU_IDDIALARI,
  type KartRengi,
  type KartSecenegi,
  type Kesir,
  type KesirKarti,
  type KesirKartlariSoruBicimi,
  type KesirKartlariVerisi,
  type KesirSecenegi,
  type KesirTuruIddiasi,
  type OgrenciGrubuSecenegi,
  type OgrenciIfadesi,
} from "@/types/gorsel-soru";

const SORU_BICIMLERI: readonly KesirKartlariSoruBicimi[] = ["dogruSoyleyenler", "yanlisSoyleyenler"];

const OGRENCI_SINIRI = { min: 2, max: 5 };
const SECENEK_SINIRI = { min: 3, max: 5 };
const PAY_SINIRI = { min: 1, max: 99 };
const PAYDA_SINIRI = { min: 2, max: 99 };
const TAM_SINIRI = { min: 1, max: 20 };

type Sorunlar = GorselSoruSorunu[];

export const KART_RENGI_ETIKETLERI: Record<KartRengi, string> = {
  mavi: "Mavi",
  kirmizi: "Kırmızı",
  yesil: "Yeşil",
  sari: "Sarı",
  mor: "Mor",
  turuncu: "Turuncu",
};

export const KESIR_TURU_ETIKETLERI: Record<KesirTuruIddiasi, string> = {
  basit: "basit kesir",
  bilesik: "bileşik kesir",
  tamSayili: "tam sayılı kesir",
  birim: "birim kesir",
};

/** Modelin Türkçe karakterle veya büyük harfle yazdığı renkler ("Kırmızı") anahtara çevrilir. */
const RENK_ESANLAMLILARI: Record<string, KartRengi> = {
  mavi: "mavi",
  kirmizi: "kirmizi",
  kırmızı: "kirmizi",
  yesil: "yesil",
  yeşil: "yesil",
  sari: "sari",
  sarı: "sari",
  mor: "mor",
  turuncu: "turuncu",
};

type KartTuru = "basit" | "bilesik" | "tamSayili";

/** Kartın yazıldığı biçime göre türü: tam kısmı varsa tam sayılı, yoksa pay/payda karşılaştırması. */
export function kartTuru(kart: Kesir): KartTuru {
  if (kart.tam !== undefined) return "tamSayili";
  return kart.pay < kart.payda ? "basit" : "bilesik";
}

export function iddiaDogruMu(kart: Kesir, iddia: KesirTuruIddiasi): boolean {
  if (iddia === "birim") return kart.tam === undefined && kart.pay === 1;
  return kartTuru(kart) === iddia;
}

/**
 * Tam sayılı bir kesir, değer olarak bir bileşik kesre eşittir. Bu yüzden
 * "tam sayılı karttaki kesir bileşiktir" (veya tersi) iddiası tartışmaya
 * açıktır — her iddianın tek bir doğru değerlendirmesi olmalı.
 */
function belirsizIddiaMi(kart: Kesir, iddia: KesirTuruIddiasi): boolean {
  const tur = kartTuru(kart);
  return (tur === "tamSayili" && iddia === "bilesik") || (tur === "bilesik" && iddia === "tamSayili");
}

/**
 * Modelin bir öğrenci için niyetini (`dogruMu`) kesin olarak karşılayan
 * iddia: niyet "doğru" ise kartın gerçek türü, "yanlış" ise kartla açıkça
 * çelişen ve tartışmaya açık olmayan bir tür. Model kuralları biliyor ama
 * "bu öğrenci yanlış söylesin" isteğini uyumsuz bir iddia seçerek ifade
 * ederken sık hata yapıyor (ör. 5/6 için "basit" deyip "yanlış" sanmak).
 */
export function niyeteUygunIddia(kart: Kesir, dogruMu: boolean): KesirTuruIddiasi {
  const tur = kartTuru(kart);
  if (dogruMu) return tur;
  return tur === "basit" ? "bilesik" : "basit";
}

/** Öğrencinin ifadesi, yapılandırılmış iddiadan üretilir — metin ile mantık hiçbir zaman ayrışamaz. */
export function ifadeMetni(kart: KesirKarti, iddia: KesirTuruIddiasi): string {
  return `${KART_RENGI_ETIKETLERI[kart.renk]} karttaki kesir ${KESIR_TURU_ETIKETLERI[iddia]}dir.`;
}

/** Soru biçimine göre (doğru / yanlış söyleyenler) cevaba giren öğrencilerin id'leri. */
export function cevaptakiOgrenciIdleri(veri: {
  kartlar: KesirKarti[];
  ogrenciler: OgrenciIfadesi[];
  soruBicimi: KesirKartlariSoruBicimi;
}): string[] {
  const aranan = veri.soruBicimi === "dogruSoyleyenler";
  return veri.ogrenciler
    .filter((ogrenci) => {
      const kart = veri.kartlar.find((item) => item.id === ogrenci.kartId);
      return kart !== undefined && iddiaDogruMu(kart, ogrenci.iddia) === aranan;
    })
    .map((ogrenci) => ogrenci.id);
}

/** ["Elif"] → "Yalnız Elif", ["Elif","Can","Mert"] → "Elif, Can ve Mert" */
export function ogrenciListesiMetni(adlar: string[]): string {
  if (adlar.length === 1) return `Yalnız ${adlar[0]}`;
  return `${adlar.slice(0, -1).join(", ")} ve ${adlar[adlar.length - 1]}`;
}

export function secenektekiAdlar(ogrenciler: OgrenciIfadesi[], secenek: OgrenciGrubuSecenegi): string[] {
  // Adlar şıkta verilen sırayla değil, öğrencilerin tanıtılma sırasıyla yazılır.
  return ogrenciler.filter((ogrenci) => secenek.ogrenciIdleri.includes(ogrenci.id)).map((ogrenci) => ogrenci.ad);
}

export function kartEtiketi(kart: KesirKarti): string {
  return `${KART_RENGI_ETIKETLERI[kart.renk]} kart`;
}

/** Gösterim dönüşümünde kartın hedef biçimi: bileşik → tam sayılı, tam sayılı → bileşik. */
export function hedefGosterim(kart: Kesir): Kesir | undefined {
  if (kart.tam !== undefined) return { pay: kart.tam * kart.payda + kart.pay, payda: kart.payda };
  if (kart.pay > kart.payda && kart.pay % kart.payda !== 0) {
    return { tam: Math.floor(kart.pay / kart.payda), pay: kart.pay % kart.payda, payda: kart.payda };
  }
  return undefined;
}

function hedefBicimdeMi(secenek: Kesir, kart: Kesir): boolean {
  return kart.tam !== undefined
    ? secenek.tam === undefined && secenek.pay >= secenek.payda
    : secenek.tam !== undefined && secenek.pay > 0 && secenek.pay < secenek.payda;
}

function ayniKume(a: string[], b: string[]): boolean {
  const kume = new Set(a);
  return a.length === b.length && b.every((id) => kume.has(id));
}

function turCumlesi(kart: Kesir, iddia: KesirTuruIddiasi): string {
  if (iddia === "birim") {
    if (kart.tam !== undefined) return "tam sayılı kesirdir, birim kesir değildir";
    return kart.pay === 1 ? "payı 1 olduğu için birim kesirdir" : "payı 1 olmadığı için birim kesir değildir";
  }
  return `${KESIR_TURU_ETIKETLERI[kartTuru(kart)]}dir`;
}

/** Cevap anahtarı, iddialar veya kart renkleri düzeltildiğinde modelin çözüm metni yerine kullanılır. */
export function veridenCozum(veri: KesirKartlariVerisi): string {
  switch (veri.gorev) {
    case "ifadeDegerlendirme": {
      const cumleler = veri.ogrenciler.flatMap((ogrenci) => {
        const kart = veri.kartlar.find((item) => item.id === ogrenci.kartId);
        if (!kart) return [];
        const dogru = iddiaDogruMu(kart, ogrenci.iddia);
        return [
          `${KART_RENGI_ETIKETLERI[kart.renk]} karttaki ${kesirMetni(kart)} ${turCumlesi(kart, ogrenci.iddia)}; ` +
            `${ogrenci.ad} ${dogru ? "doğru" : "yanlış"} söylüyor.`,
        ];
      });
      const cevap = cevaptakiOgrenciIdleri(veri);
      const adlar = veri.ogrenciler.filter((ogrenci) => cevap.includes(ogrenci.id)).map((ogrenci) => ogrenci.ad);
      const baslik = veri.soruBicimi === "dogruSoyleyenler" ? "İfadesi doğru olanlar" : "İfadesi yanlış olanlar";
      return `${cumleler.join(" ")} ${baslik}: ${adlar.join(", ")}.`;
    }
    case "turuBul": {
      const cumleler = veri.kartlar.map(
        (kart) => `${KART_RENGI_ETIKETLERI[kart.renk]} karttaki ${kesirMetni(kart)} ${turCumlesi(kart, veri.hedefTur)}.`
      );
      return cumleler.join(" ");
    }
    case "gosterimDonusumu": {
      const kart = veri.kartlar.find((item) => item.id === veri.hedefKartId);
      const hedef = kart ? hedefGosterim(kart) : undefined;
      if (!kart || !hedef) return "";
      return kart.tam !== undefined
        ? `${kesirMetni(kart)} = (${kart.tam} × ${kart.payda} + ${kart.pay}) / ${kart.payda} = ${kesirMetni(hedef)}.`
        : `${kart.pay} ÷ ${kart.payda} işleminde bölüm ${hedef.tam}, kalan ${hedef.pay}'tür; bu yüzden ` +
            `${kesirMetni(kart)} = ${kesirMetni(hedef)}.`;
    }
  }
}

// ---------------------------------------------------------------------------
// Okuma
// ---------------------------------------------------------------------------

type OkunanKart = Omit<KesirKarti, "renk"> & { renk: KartRengi | undefined };

function okuKart(oge: Record<string, unknown>, id: string, ogePath: string, sorunlar: Sorunlar) {
  const hamRenk = typeof oge.renk === "string" ? RENK_ESANLAMLILARI[metniNormallestir(oge.renk)] : undefined;
  const pay = okuTamSayi(oge, "pay", ogePath, sorunlar, PAY_SINIRI);
  const payda = okuTamSayi(oge, "payda", ogePath, sorunlar, PAYDA_SINIRI);
  const tamVar = !yokMu(oge.tam);
  const tam = tamVar ? okuTamSayi(oge, "tam", ogePath, sorunlar, TAM_SINIRI) : undefined;
  if (pay === undefined || payda === undefined || (tamVar && tam === undefined)) return undefined;
  if (tam !== undefined && pay >= payda) {
    sorunlar.push({ path: ogePath, message: "Tam sayılı kesrin kesir kısmı basit kesir olmalıdır (pay < payda)." });
    return undefined;
  }
  const kart: OkunanKart = tam !== undefined ? { id, renk: hamRenk, tam, pay, payda } : { id, renk: hamRenk, pay, payda };
  return kart;
}

/**
 * Renk yalnızca kartları ayırt etmeye yarar; tanınmayan ("pembe") veya
 * tekrarlanan bir renk soruyu geçersiz kılmaz, henüz kullanılmayan bir
 * palet rengine eşlenir.
 */
function renkleriTamamla(kartlar: OkunanKart[]): { kartlar: KesirKarti[]; degisti: boolean } {
  const kullanilan = new Set<KartRengi>();
  const gecerli = kartlar.map((kart) => {
    if (!kart.renk || kullanilan.has(kart.renk)) return false;
    kullanilan.add(kart.renk);
    return true;
  });
  const bosta = KART_RENKLERI.filter((renk) => !kullanilan.has(renk));
  let degisti = false;
  const tamamlanmis = kartlar.map((kart, index) => {
    if (gecerli[index]) return kart as KesirKarti;
    degisti = true;
    return { ...kart, renk: bosta.shift() as KartRengi };
  });
  return { kartlar: tamamlanmis, degisti };
}

function enAzUcSecenek<S>(secenekler: S[], path: string, sorunlar: Sorunlar): boolean {
  if (secenekler.length >= SECENEK_SINIRI.min) return true;
  sorunlar.push({
    path: `${path}.secenekler`,
    message: `Aynı içeriği gösteren şıklar çıkarıldıktan sonra en az ${SECENEK_SINIRI.min} farklı şık kalmalıdır.`,
  });
  return false;
}

interface OrtakAlanlar {
  soru: string;
  dogruSecenekId: string;
  baglam?: string;
  cozum?: string;
  kartlar: KesirKarti[];
  renkDegisti: boolean;
}

type Sonuc = GorselSoruDogrulamaSonucu<KesirKartlariVerisi> | undefined;

/** Soru kökü, "soruBicimi"nin tersini soruyorsa onarım yanlış cevabı "doğru" yapardı. */
function kokBicimleCelisiyorMu(soru: string, soruBicimi: KesirKartlariSoruBicimi): boolean {
  const kok = metniNormallestir(soru);
  const dogruGeciyor = kok.includes("doğru");
  const yanlisGeciyor = kok.includes("yanlış");
  return soruBicimi === "dogruSoyleyenler" ? yanlisGeciyor && !dogruGeciyor : dogruGeciyor && !yanlisGeciyor;
}

function dogrulaIfadeDegerlendirme(raw: Record<string, unknown>, ortak: OrtakAlanlar, path: string, sorunlar: Sorunlar): Sonuc {
  const { kartlar } = ortak;
  const soruBicimi = okuSecim(raw, "soruBicimi", SORU_BICIMLERI, path, sorunlar);

  let iddiaDuzeltildi = false;
  const ogrenciler = okuKimlikliDizi<OgrenciIfadesi>(
    raw.ogrenciler,
    `${path}.ogrenciler`,
    sorunlar,
    OGRENCI_SINIRI,
    (oge, id, ogePath) => {
      const ad = okuMetin(oge, "ad", ogePath, sorunlar);
      const kartId = okuMetin(oge, "kartId", ogePath, sorunlar);
      const hamIddia = okuSecim(oge, "iddia", KESIR_TURU_IDDIALARI, ogePath, sorunlar);
      if (!ad || !kartId || !hamIddia) return undefined;
      const kart = kartlar.find((item) => item.id === kartId);
      if (!kart) {
        sorunlar.push({ path: `${ogePath}.kartId`, message: `"kartId" (${kartId}) bir kartın id'si olmalıdır.` });
        return undefined;
      }

      // Niyet (`dogruMu`) verildiyse doğruluğun kaynağı odur: iddia niyetle
      // çelişiyor ya da tartışmaya açıksa, niyeti kesin karşılayan iddiayla
      // değiştirilir. Böylece modelin kurduğu şıklar ve cevap geçerli kalır.
      let iddia = hamIddia;
      if (typeof oge.dogruMu === "boolean") {
        const niyet = oge.dogruMu;
        if (iddiaDogruMu(kart, iddia) !== niyet || belirsizIddiaMi(kart, iddia)) {
          iddia = niyeteUygunIddia(kart, niyet);
          iddiaDuzeltildi = true;
        }
      }

      if (belirsizIddiaMi(kart, iddia)) {
        sorunlar.push({
          path: `${ogePath}.iddia`,
          message:
            "Tam sayılı bir kart için \"bilesik\", bileşik bir kart için \"tamSayili\" iddiası tartışmaya açıktır; " +
            "farklı bir iddia seçilmelidir.",
        });
        return undefined;
      }
      return { id, ad, kartId, iddia };
    }
  );
  if (ogrenciler && new Set(ogrenciler.map((ogrenci) => ogrenci.ad)).size !== ogrenciler.length) {
    sorunlar.push({ path: `${path}.ogrenciler`, message: "Her öğrencinin adı farklı olmalıdır." });
    return undefined;
  }

  const ogrenciIdleri = new Set(ogrenciler?.map((ogrenci) => ogrenci.id) ?? []);
  const secenekler = okuKimlikliDizi<OgrenciGrubuSecenegi>(
    raw.secenekler,
    `${path}.secenekler`,
    sorunlar,
    SECENEK_SINIRI,
    (oge, id, ogePath) => {
      const liste = oge.ogrenciIdleri;
      const gecerli =
        Array.isArray(liste) &&
        liste.length > 0 &&
        new Set(liste).size === liste.length &&
        liste.every((item) => typeof item === "string" && (!ogrenciler || ogrenciIdleri.has(item)));
      if (!gecerli) {
        sorunlar.push({
          path: `${ogePath}.ogrenciIdleri`,
          message: '"ogrenciIdleri", öğrenci id\'lerinden oluşan boş olmayan, tekrarsız bir dizi olmalıdır.',
        });
        return undefined;
      }
      return { id, ogrenciIdleri: liste as string[] };
    }
  );

  if (!soruBicimi || !ogrenciler || !secenekler) return undefined;

  if (kokBicimleCelisiyorMu(ortak.soru, soruBicimi)) {
    sorunlar.push({ path: `${path}.soru`, message: `Soru kökü, "soruBicimi" (${soruBicimi}) ile çelişen bir şey soruyor.` });
    return undefined;
  }

  const tekrarsiz = tekrarlananSecenekleriAyikla(
    secenekler,
    (secenek) => [...secenek.ogrenciIdleri].sort().join("|"),
    ortak.dogruSecenekId
  );
  if (!enAzUcSecenek(tekrarsiz, path, sorunlar)) return undefined;

  // Herkesin doğru (ya da herkesin yanlış) söylediği bir soru hiçbir
  // yanılgıyı ölçmez; en az bir doğru ve en az bir yanlış ifade gerekir.
  const dogruSoyleyenSayisi = cevaptakiOgrenciIdleri({ kartlar, ogrenciler, soruBicimi: "dogruSoyleyenler" }).length;
  if (dogruSoyleyenSayisi === 0 || dogruSoyleyenSayisi === ogrenciler.length) {
    sorunlar.push({
      path: `${path}.ogrenciler`,
      message: "En az bir öğrencinin ifadesi doğru, en az bir öğrencinin ifadesi yanlış olmalıdır.",
    });
    return undefined;
  }

  const beklenen = cevaptakiOgrenciIdleri({ kartlar, ogrenciler, soruBicimi });
  const uzlasma = dogruSecenegiUzlastir(
    tekrarsiz,
    ortak.dogruSecenekId,
    (secenek) => ayniKume(secenek.ogrenciIdleri, beklenen),
    (id) => ({ id, ogrenciIdleri: beklenen }),
    path,
    sorunlar
  );
  if (!uzlasma) return undefined;

  const veri: KesirKartlariVerisi = {
    gorev: "ifadeDegerlendirme",
    baglam: ortak.baglam,
    kartlar,
    ogrenciler,
    soruBicimi,
    secenekler: uzlasma.secenekler,
    dogruSecenekId: uzlasma.dogruSecenekId,
  };
  const yenidenYaz = uzlasma.onarildi || ortak.renkDegisti || iddiaDuzeltildi;
  return { soru: ortak.soru, cozum: yenidenYaz ? veridenCozum(veri) : ortak.cozum, veri };
}

const TUR_KOK_IFADELERI: Record<KesirTuruIddiasi, string> = {
  basit: "basit",
  bilesik: "bileşik",
  tamSayili: "tam sayılı",
  birim: "birim",
};

function dogrulaTuruBul(raw: Record<string, unknown>, ortak: OrtakAlanlar, path: string, sorunlar: Sorunlar): Sonuc {
  const { kartlar } = ortak;
  const hedefTur = okuSecim(raw, "hedefTur", KESIR_TURU_IDDIALARI, path, sorunlar);
  const kartIdleri = new Set(kartlar.map((kart) => kart.id));
  const secenekler = okuKimlikliDizi<KartSecenegi>(raw.secenekler, `${path}.secenekler`, sorunlar, SECENEK_SINIRI, (oge, id, ogePath) => {
    const kartId = okuMetin(oge, "kartId", ogePath, sorunlar);
    if (!kartId) return undefined;
    if (!kartIdleri.has(kartId)) {
      sorunlar.push({ path: `${ogePath}.kartId`, message: `"kartId" (${kartId}) bir kartın id'si olmalıdır.` });
      return undefined;
    }
    return { id, kartId };
  });
  if (!hedefTur || !secenekler) return undefined;

  if (!metniNormallestir(ortak.soru).includes(TUR_KOK_IFADELERI[hedefTur])) {
    sorunlar.push({ path: `${path}.soru`, message: `Soru kökü aranan türü ("${TUR_KOK_IFADELERI[hedefTur]}") sormalıdır.` });
    return undefined;
  }
  if (kartlar.some((kart) => belirsizIddiaMi(kart, hedefTur))) {
    sorunlar.push({
      path: `${path}.kartlar`,
      message: "Aranan tür bileşikse tam sayılı kart, tam sayılıysa bileşik kart kullanma; cevap tartışmaya açık olur.",
    });
    return undefined;
  }
  const uyanlar = kartlar.filter((kart) => iddiaDogruMu(kart, hedefTur));
  if (uyanlar.length !== 1) {
    sorunlar.push({
      path: `${path}.kartlar`,
      message: `Tam olarak bir kart "${hedefTur}" türünde olmalıdır (şu an ${uyanlar.length}).`,
    });
    return undefined;
  }
  const dogruKart = uyanlar[0];

  const tekrarsiz = tekrarlananSecenekleriAyikla(secenekler, (secenek) => secenek.kartId, ortak.dogruSecenekId);
  if (!enAzUcSecenek(tekrarsiz, path, sorunlar)) return undefined;

  const uzlasma = dogruSecenegiUzlastir(
    tekrarsiz,
    ortak.dogruSecenekId,
    (secenek) => secenek.kartId === dogruKart.id,
    (id) => ({ id, kartId: dogruKart.id }),
    path,
    sorunlar
  );
  if (!uzlasma) return undefined;

  const veri: KesirKartlariVerisi = {
    gorev: "turuBul",
    baglam: ortak.baglam,
    kartlar,
    hedefTur,
    secenekler: uzlasma.secenekler,
    dogruSecenekId: uzlasma.dogruSecenekId,
  };
  const yenidenYaz = uzlasma.onarildi || ortak.renkDegisti;
  return { soru: ortak.soru, cozum: yenidenYaz ? veridenCozum(veri) : ortak.cozum, veri };
}

function dogrulaGosterimDonusumu(raw: Record<string, unknown>, ortak: OrtakAlanlar, path: string, sorunlar: Sorunlar): Sonuc {
  const { kartlar } = ortak;
  const hedefKartId = okuMetin(raw, "hedefKartId", path, sorunlar);
  const secenekler = okuKimlikliDizi<KesirSecenegi>(raw.secenekler, `${path}.secenekler`, sorunlar, SECENEK_SINIRI, (oge, id, ogePath) => {
    const kesir = okuKesir(oge, ogePath, sorunlar);
    return kesir ? { id, ...kesir } : undefined;
  });
  if (!hedefKartId || !secenekler) return undefined;

  const kart = kartlar.find((item) => item.id === hedefKartId);
  if (!kart) {
    sorunlar.push({ path: `${path}.hedefKartId`, message: `"hedefKartId" (${hedefKartId}) bir kartın id'si olmalıdır.` });
    return undefined;
  }
  const hedef = hedefGosterim(kart);
  if (!hedef) {
    sorunlar.push({
      path: `${path}.hedefKartId`,
      message: "Hedef kart tam sayılı bir kesir ya da tam sayıya eşit olmayan bir bileşik kesir olmalıdır.",
    });
    return undefined;
  }
  // Kök hangi kartın sorulduğunu rengiyle söylemeli; aksi hâlde kök ile cevap ayrışabilir.
  if (!metniNormallestir(ortak.soru).includes(metniNormallestir(KART_RENGI_ETIKETLERI[kart.renk]))) {
    sorunlar.push({ path: `${path}.soru`, message: "Soru kökü hedef kartı rengiyle anmalıdır." });
    return undefined;
  }

  const tekrarsiz = tekrarlananSecenekleriAyikla(
    secenekler,
    (secenek) => `${secenek.tam ?? 0}|${secenek.pay}|${secenek.payda}`,
    ortak.dogruSecenekId
  );
  if (!enAzUcSecenek(tekrarsiz, path, sorunlar)) return undefined;

  const uzlasma = dogruSecenegiUzlastir(
    tekrarsiz,
    ortak.dogruSecenekId,
    (secenek) => kesirlerEsitMi(secenek, kart) && hedefBicimdeMi(secenek, kart),
    (id) => ({ id, ...hedef }),
    path,
    sorunlar
  );
  if (!uzlasma) return undefined;

  const veri: KesirKartlariVerisi = {
    gorev: "gosterimDonusumu",
    baglam: ortak.baglam,
    kartlar,
    hedefKartId,
    secenekler: uzlasma.secenekler,
    dogruSecenekId: uzlasma.dogruSecenekId,
  };
  const yenidenYaz = uzlasma.onarildi || ortak.renkDegisti;
  return { soru: ortak.soru, cozum: yenidenYaz ? veridenCozum(veri) : ortak.cozum, veri };
}

function dogrula(raw: unknown, path: string, sorunlar: Sorunlar): Sonuc {
  if (!isRecord(raw)) {
    sorunlar.push({ path, message: '"veri" bir JSON nesnesi olmalıdır.' });
    return undefined;
  }
  const gorev = okuSecim(raw, "gorev", KESIR_KARTLARI_GOREVLERI, path, sorunlar);
  const soru = okuMetin(raw, "soru", path, sorunlar);
  const dogruSecenekId = okuMetin(raw, "dogruSecenekId", path, sorunlar);

  const kartSiniri = { min: gorev === "turuBul" ? 3 : 2, max: 6 };
  const okunanKartlar = okuKimlikliDizi<OkunanKart>(raw.kartlar, `${path}.kartlar`, sorunlar, kartSiniri, (oge, id, ogePath) =>
    okuKart(oge, id, ogePath, sorunlar)
  );
  if (!gorev || !soru || !dogruSecenekId || !okunanKartlar) return undefined;

  const renkler = renkleriTamamla(okunanKartlar);
  const ortak: OrtakAlanlar = {
    soru,
    dogruSecenekId,
    baglam: okuIstegeBagliMetin(raw, "baglam"),
    cozum: okuIstegeBagliMetin(raw, "cozum"),
    kartlar: renkler.kartlar,
    renkDegisti: renkler.degisti,
  };

  switch (gorev) {
    case "ifadeDegerlendirme":
      return dogrulaIfadeDegerlendirme(raw, ortak, path, sorunlar);
    case "turuBul":
      return dogrulaTuruBul(raw, ortak, path, sorunlar);
    case "gosterimDonusumu":
      return dogrulaGosterimDonusumu(raw, ortak, path, sorunlar);
  }
}

function dogruCevapMetni(veri: KesirKartlariVerisi): string {
  const index = veri.secenekler.findIndex((secenek) => secenek.id === veri.dogruSecenekId);
  const harf = secenekHarfi(index);
  switch (veri.gorev) {
    case "ifadeDegerlendirme": {
      const secenek = veri.secenekler[index];
      return secenek ? `${harf}) ${ogrenciListesiMetni(secenektekiAdlar(veri.ogrenciler, secenek))}` : "";
    }
    case "turuBul": {
      const secenek = veri.secenekler[index];
      const kart = secenek ? veri.kartlar.find((item) => item.id === secenek.kartId) : undefined;
      return kart ? `${harf}) ${kartEtiketi(kart)} (${kesirMetni(kart)})` : "";
    }
    case "gosterimDonusumu": {
      const secenek = veri.secenekler[index];
      return secenek ? `${harf}) ${kesirMetni(secenek)}` : "";
    }
  }
}

// ---------------------------------------------------------------------------
// Şemalar ve görev tanımları
// ---------------------------------------------------------------------------

const KART = jsonNesne({
  id: JSON_METIN,
  renk: jsonSecim(KART_RENKLERI),
  tam: JSON_BOS_OLABILIR_TAM_SAYI,
  pay: JSON_TAM_SAYI,
  payda: JSON_TAM_SAYI,
});

function gorevSemasi(gorev: string, alanlar: Record<string, JsonSemasi>, secenek: JsonSemasi): JsonSemasi {
  // `cozum` şıklardan önce: model önce çözer, sonra şıkları bu sonuca göre kurar.
  return jsonNesne({
    gorev: jsonGorev(gorev),
    baglam: JSON_BOS_OLABILIR_METIN,
    kartlar: jsonDizi(KART),
    ...alanlar,
    soru: JSON_METIN,
    cozum: JSON_BOS_OLABILIR_METIN,
    secenekler: jsonDizi(secenek),
    dogruSecenekId: JSON_METIN,
  });
}

const KART_ACIKLAMASI =
  `"kartlar": her öğe {"id","renk","tam","pay","payda"}. "renk" şunlardan biri: ${KART_RENKLERI.join(", ")}; ` +
  'her kartın rengi farklı. "tam" yalnızca tam sayılı kesirlerde dolu, diğerlerinde null. "pay" en az 1, ' +
  '"payda" en az 2 olmalı (1/1, 4/1 gibi kartlar yazma).';

const ORTAK_SEMA_ACIKLAMASI = [
  '"baglam": Kartlardan önce gösterilen kısa durum metni; istemiyorsan null.',
  '"soru": Soru kökü.',
  '"cozum": ŞIKLARDAN ÖNCE yaz: önce çöz, sonra şıkları bu sonuca göre kur.',
  '"dogruSecenekId": "cozum"da bulduğun sonucu içeren şıkkın "id" değeri.',
];

const gorevler: GorselSoruTanimi<"kesir_kartlari">["gorevler"] = {
  ifadeDegerlendirme: {
    gorev: "ifadeDegerlendirme",
    etiket: "Öğrenci ifadelerini değerlendirme",
    aciklama: "Öğrencilerin kartlardaki kesirlerin türü hakkındaki ifadelerinden hangilerinin doğru/yanlış olduğunu bulur.",
    kesirKonusuGerekir: true,
    semaAciklamasi: [
      KART_ACIKLAMASI + " 2-6 kart.",
      '"ogrenciler": 2-5 öğe; her öğe {"id","ad","kartId","dogruMu","iddia"}. ÖNCE "dogruMu" ile bu öğrencinin ' +
        "doğru mu (true) yanlış mı (false) söylemesini istediğine karar ver; SONRA buna uyan iddiayı seç. " +
        `"iddia" şunlardan biri: ${KESIR_TURU_IDDIALARI.join(", ")}. İfade cümlesini sistem veriden üretir.`,
      '"soruBicimi": "dogruSoyleyenler" veya "yanlisSoyleyenler"; soru kökü aynı şeyi ("doğrudur"/"yanlıştır") sormalı.',
      '"secenekler": 3-5 öğe; her öğe {"id","ogrenciIdleri"}.',
    ],
    kurallar: [
      "En az bir öğrenci doğru, en az bir öğrenci yanlış söylemeli.",
      "En az bir ifade yaygın bir yanılgıyı yansıtmalı (ör. 5/5'i basit kesir sanmak, 3/8'i birim kesir sanmak).",
    ],
    ornek: {
      tip: "kesir_kartlari",
      veri: {
        gorev: "ifadeDegerlendirme",
        baglam:
          "Öğretmen tahtaya üzerinde kesir yazan dört renkli kart astı ve öğrencilerinden kartlardaki kesirlerin " +
          "türünü belirlemelerini istedi.",
        kartlar: [
          { id: "k1", renk: "mavi", tam: null, pay: 7, payda: 4 },
          { id: "k2", renk: "kirmizi", tam: null, pay: 3, payda: 8 },
          { id: "k3", renk: "yesil", tam: 2, pay: 1, payda: 3 },
          { id: "k4", renk: "sari", tam: null, pay: 5, payda: 5 },
        ],
        ogrenciler: [
          { id: "o1", ad: "Elif", kartId: "k1", dogruMu: true, iddia: "bilesik" },
          { id: "o2", ad: "Can", kartId: "k2", dogruMu: false, iddia: "birim" },
          { id: "o3", ad: "Zeynep", kartId: "k3", dogruMu: true, iddia: "tamSayili" },
          { id: "o4", ad: "Mert", kartId: "k4", dogruMu: false, iddia: "basit" },
        ],
        soruBicimi: "dogruSoyleyenler",
        soru: "Buna göre hangi öğrencilerin ifadesi doğrudur?",
        cozum:
          "7/4'te pay paydadan büyük olduğu için bileşik kesirdir (Elif doğru). 3/8'in payı 1 olmadığından birim " +
          "kesir değildir (Can yanlış). 2 1/3 tam sayılı kesirdir (Zeynep doğru). 5/5'te pay paydaya eşit olduğu " +
          "için bileşik kesirdir (Mert yanlış).",
        secenekler: [
          { id: "A", ogrenciIdleri: ["o1", "o3"] },
          { id: "B", ogrenciIdleri: ["o1", "o2", "o3"] },
          { id: "C", ogrenciIdleri: ["o3", "o4"] },
          { id: "D", ogrenciIdleri: ["o1", "o3", "o4"] },
        ],
        dogruSecenekId: "A",
      },
    },
    jsonSemasi: gorevSemasi(
      "ifadeDegerlendirme",
      {
        ogrenciler: jsonDizi(
          jsonNesne({
            id: JSON_METIN,
            ad: JSON_METIN,
            kartId: JSON_METIN,
            dogruMu: JSON_MANTIKSAL,
            iddia: jsonSecim(KESIR_TURU_IDDIALARI),
          })
        ),
        soruBicimi: jsonSecim(SORU_BICIMLERI),
      },
      jsonNesne({ id: JSON_METIN, ogrenciIdleri: jsonDizi(JSON_METIN) })
    ),
  },
  turuBul: {
    gorev: "turuBul",
    etiket: "İstenen türdeki kesri bulma",
    aciklama: "Kartlar arasından istenen türde (basit, bileşik, tam sayılı veya birim) olan tek kesri bulur.",
    kesirKonusuGerekir: true,
    semaAciklamasi: [
      KART_ACIKLAMASI + " 3-6 kart.",
      `"hedefTur": aranan tür; şunlardan biri: ${KESIR_TURU_IDDIALARI.join(", ")}. Soru kökü bu türü açıkça sormalı.`,
      '"secenekler": 3-5 öğe; her öğe {"id","kartId"}.',
    ],
    kurallar: [
      "Tam olarak bir kart aranan türde olmalı; sistem kartlardan hesaplar.",
      "Diğer kartlar yanılgıya dayalı çeldirici olmalı (ör. bileşik aranıyorsa 7/7 doğru cevap, 1/9 veya 5/8 çeldirici).",
      "Aranan tür bileşikse tam sayılı kart, tam sayılıysa bileşik kart kullanma.",
    ],
    ornek: {
      tip: "kesir_kartlari",
      veri: {
        gorev: "turuBul",
        baglam: "Bir kutuda üzerinde kesir yazan dört renkli kart vardır.",
        kartlar: [
          { id: "k1", renk: "mavi", tam: null, pay: 3, payda: 5 },
          { id: "k2", renk: "kirmizi", tam: null, pay: 7, payda: 7 },
          { id: "k3", renk: "yesil", tam: null, pay: 5, payda: 8 },
          { id: "k4", renk: "sari", tam: null, pay: 1, payda: 9 },
        ],
        hedefTur: "bilesik",
        soru: "Hangi karttaki kesir bileşik kesirdir?",
        cozum:
          "Payı paydasına eşit ya da paydasından büyük olan kesirler bileşik kesirdir. 7/7'de pay paydaya eşittir; " +
          "diğer kartlarda pay paydadan küçüktür.",
        secenekler: [
          { id: "A", kartId: "k1" },
          { id: "B", kartId: "k2" },
          { id: "C", kartId: "k3" },
          { id: "D", kartId: "k4" },
        ],
        dogruSecenekId: "B",
      },
    },
    jsonSemasi: gorevSemasi(
      "turuBul",
      { hedefTur: jsonSecim(KESIR_TURU_IDDIALARI) },
      jsonNesne({ id: JSON_METIN, kartId: JSON_METIN })
    ),
  },
  gosterimDonusumu: {
    gorev: "gosterimDonusumu",
    etiket: "Bileşik ↔ tam sayılı gösterim",
    aciklama:
      "Bir karttaki bileşik kesrin tam sayılı kesir gösterimini ya da tam sayılı kesrin bileşik kesir gösterimini bulur.",
    kesirKonusuGerekir: true,
    semaAciklamasi: [
      KART_ACIKLAMASI + " 2-6 kart.",
      '"hedefKartId": dönüştürülecek kartın id\'si; bu kart tam sayılı ya da tam sayıya eşit olmayan bir bileşik ' +
        "kesir olmalı. Soru kökü bu kartı rengiyle anmalı.",
      '"secenekler": 3-5 öğe; her öğe {"id","tam","pay","payda"} — bir kesir (tam yoksa null).',
    ],
    kurallar: [
      "Doğru şık, kartın değerine eşit ve istenen biçimde (tam sayılı ↔ bileşik) olmalı; sistem hesaplar.",
      "Çeldiriciler tipik hataları yansıtmalı: bölümü veya kalanı karıştırmak, tam kısmı paydayla çarpmayı unutmak.",
    ],
    ornek: {
      tip: "kesir_kartlari",
      veri: {
        gorev: "gosterimDonusumu",
        baglam: null,
        kartlar: [
          { id: "k1", renk: "mavi", tam: null, pay: 11, payda: 4 },
          { id: "k2", renk: "turuncu", tam: 1, pay: 3, payda: 5 },
        ],
        hedefKartId: "k1",
        soru: "Mavi karttaki kesrin tam sayılı kesir olarak gösterimi hangisidir?",
        cozum: "11 ÷ 4 işleminde bölüm 2, kalan 3'tür. Bu yüzden 11/4 = 2 3/4.",
        secenekler: [
          { id: "A", tam: 2, pay: 3, payda: 4 },
          { id: "B", tam: 3, pay: 1, payda: 4 },
          { id: "C", tam: 2, pay: 1, payda: 4 },
          { id: "D", tam: 1, pay: 3, payda: 4 },
        ],
        dogruSecenekId: "A",
      },
    },
    jsonSemasi: gorevSemasi(
      "gosterimDonusumu",
      { hedefKartId: JSON_METIN },
      jsonNesne({ id: JSON_METIN, tam: JSON_BOS_OLABILIR_TAM_SAYI, pay: JSON_TAM_SAYI, payda: JSON_TAM_SAYI })
    ),
  },
};

export const kesirKartlariTanimi: GorselSoruTanimi<"kesir_kartlari"> = {
  tip: "kesir_kartlari",
  etiket: "Kesir kartları",
  aciklama: "Üzerinde kesir yazan renkli kartlar gösterilir; sistem kartları verideki kesirlerden kendisi çizer.",
  gorselKategorisi: "fonksiyonel",
  gorselStratejisi: "svg",
  kesirKonusuGerekir: true,
  kurallar: [
    "Basit kesir: pay < payda. Bileşik kesir: pay ≥ payda (ör. 5/5 bileşik kesirdir). Tam sayılı kesir: bir tam " +
      "sayı ile bir basit kesirden oluşur. Birim kesir: payı 1 olan kesir.",
    "Sistem doğru cevabı kartlardan hesaplar; sayılar kesin ve tutarlı olmalı.",
  ],
  ortakSemaAciklamasi: ORTAK_SEMA_ACIKLAMASI,
  gorevler,
  dogrula,
  dogruCevapMetni,
};
