import { describe, expect, it } from "vitest";

import { alanIzgaraPlaniUret } from "@/lib/quiz-generator/gorsel-sorular/alan-izgara";
import { cetvelOlcumPlaniUret } from "@/lib/quiz-generator/gorsel-sorular/cetvel-olcum";
import { daireKesirPlaniUret } from "@/lib/quiz-generator/gorsel-sorular/daire-kesir";
import { etapDogrusuPlaniUret } from "@/lib/quiz-generator/gorsel-sorular/etap-dogrusu";
import { kesirCubuguPlaniUret } from "@/lib/quiz-generator/gorsel-sorular/kesir-cubugu";
import { tabloKesirPlaniUret } from "@/lib/quiz-generator/gorsel-sorular/tablo-kesir";
import { esitMi, oranMetni, oranYap, type Oran } from "@/lib/quiz-generator/gorsel-sorular/kesir-aritmetigi";
import {
  ALAN_IZGARA_GOREVLERI,
  CETVEL_OLCUM_GOREVLERI,
  DAIRE_KESIR_GOREVLERI,
  ETAP_DOGRUSU_GOREVLERI,
  KESIR_CUBUGU_GOREVLERI,
  TABLO_KESIR_GOREVLERI,
  type SenaryoCikarimPlani,
} from "@/types/gorsel-soru";

/** "3/4", "2 1/3", "9" ya da "9 dilim" → değer. */
function metniOku(metin: string): Oran {
  const eslesme = metin.match(/^(?:(\d+) )?(\d+)\/(\d+)/);
  if (eslesme) {
    const [, tam, pay, payda] = eslesme;
    return oranYap({ pay: (tam ? Number(tam) * Number(payda) : 0) + Number(pay), payda: Number(payda) });
  }
  const tamSayi = metin.match(/^(\d+)/);
  if (!tamSayi) throw new Error(`sayı okunamadı: ${metin}`);
  return { pay: Number(tamSayi[1]), payda: 1 };
}

function ortakDenetim(cikarim: SenaryoCikarimPlani): string {
  expect(cikarim.secenekler).toHaveLength(4);
  expect(new Set(cikarim.secenekler.map((oge) => oge.metin)).size).toBe(4);
  const dogrular = cikarim.secenekler.filter((oge) => !oge.hata);
  expect(dogrular).toHaveLength(1);
  expect(cikarim.ornekSoru.trim().endsWith("?")).toBe(true);
  return dogrular[0].metin;
}

describe("daire_kesir planı: doğru şık, çizimden bağımsız yeniden hesaplanır", () => {
  it.each(DAIRE_KESIR_GOREVLERI)("%s: 300 tohumda tutarlı çizim, 4 farklı şık, tek doğru", (gorev) => {
    for (let tohum = 1; tohum <= 300; tohum += 1) {
      const { cikarim, cizim } = daireKesirPlaniUret(gorev, tohum * 7919);
      expect(cizim.tip).toBe("daire_kesir");
      const dogru = ortakDenetim(cikarim);
      const daireler = cizim.daireler;
      for (const daire of daireler) {
        expect(daire.dilim).toBeGreaterThanOrEqual(2);
        expect(daire.boyali).toBeGreaterThanOrEqual(0);
        expect(daire.boyali).toBeLessThan(daire.dilim);
      }

      if (gorev === "boyaKarisimi") {
        // Üç adım: bölme sayısı (şekilden) × kesir (metinden) × bölme başına litre (metinden).
        const kesir = oranYap(cikarim.veriler[0].deger);
        const litre = oranYap(cikarim.veriler[1].deger).pay;
        const beyazBolme = (daireler[0].dilim * kesir.pay) / kesir.payda;
        expect(Number.isInteger(beyazBolme)).toBe(true);
        // Birim bağlama göre değişir (litre, kova, kilogram).
        expect(Number.parseInt(dogru, 10)).toBe(beyazBolme * litre);
      } else if (gorev === "kalanPaylasim") {
        // İki aşama: şekilden kalan kesri okumak, sonra misafir sayısına bölmek.
        const [daire] = daireler;
        const kisi = oranYap(cikarim.veriler[0].deger).pay;
        const pay = oranYap({ pay: daire.dilim - daire.boyali, payda: daire.dilim * kisi });
        expect(dogru).toBe(oranMetni(pay));
        expect(dogru).not.toBe(oranMetni(oranYap({ pay: daire.dilim - daire.boyali, payda: daire.dilim })));
      } else if (gorev === "ikiPizzaKarsilastir") {
        const [a, b] = daireler.map((daire) => oranYap({ pay: daire.boyali, payda: daire.dilim }));
        const buyuk = a.pay * b.payda > b.pay * a.payda ? daireler[0].ad : daireler[1].ad;
        const fark = oranYap({ pay: Math.abs(a.pay * b.payda - b.pay * a.payda), payda: a.payda * b.payda });
        expect(dogru).toBe(`${buyuk}, ${oranMetni(fark)} fazla`);
        expect(daireler[0].ad).not.toBe(daireler[1].ad);
      } else if (gorev === "toplamIkiPizza") {
        expect(daireler[0].dilim).toBe(daireler[1].dilim);
        const toplam = oranYap({ pay: daireler[0].boyali + daireler[1].boyali, payda: daireler[0].dilim });
        expect(dogru).toBe(oranMetni(toplam));
      } else {
        // denklikDegil: doğru şık, dolu kısma denk OLMAYAN tek şıktır.
        const [daire] = daireler;
        const dolu = oranYap({ pay: daire.boyali, payda: daire.dilim });
        const denkOlmayanlar = cikarim.secenekler.filter((oge) => !esitMi(metniOku(oge.metin), dolu));
        expect(denkOlmayanlar.map((oge) => oge.metin)).toEqual([dogru]);
      }
    }
  });
});

describe("kesir_cubugu planı: doğru şık, şeritlerden bağımsız yeniden hesaplanır", () => {
  it.each(KESIR_CUBUGU_GOREVLERI)("%s: 300 tohumda tutarlı çizim, 4 farklı şık, tek doğru", (gorev) => {
    for (let tohum = 1; tohum <= 300; tohum += 1) {
      const { cikarim, cizim } = kesirCubuguPlaniUret(gorev, tohum * 7919);
      const dogru = ortakDenetim(cikarim);
      const cubuklar = cizim.cubuklar;
      for (const cubuk of cubuklar) {
        expect(cubuk.parca).toBeGreaterThanOrEqual(2);
        expect(cubuk.tarali).toBeGreaterThanOrEqual(1);
        expect(cubuk.tarali).toBeLessThanOrEqual(cubuk.parca);
      }
      const degerler = cubuklar.map((cubuk) => oranYap({ pay: cubuk.tarali, payda: cubuk.parca }));

      if (gorev === "esitOlmayanGosterim") {
        // Tüm şeritler aynı parçalı; taralı bölge = taralı parçaların toplamı / parça. Doğru şık ona eşit OLMAYAN tek şıktır.
        expect(new Set(cubuklar.map((cubuk) => cubuk.parca)).size).toBe(1);
        const toplam = oranYap({ pay: cubuklar.reduce((acc, cubuk) => acc + cubuk.tarali, 0), payda: cubuklar[0].parca });
        const esitOlmayanlar = cikarim.secenekler.filter((oge) => !esitMi(metniOku(oge.metin), toplam));
        expect(esitOlmayanlar.map((oge) => oge.metin)).toEqual([dogru]);
      } else {
        expect(cubuklar).toHaveLength(2);
        const [a, b] = degerler;
        // Paydalardan biri diğerinin katı (5. sınıfta paydaları eşitleme).
        const [p1, p2] = cubuklar.map((cubuk) => cubuk.parca).sort((x, y) => x - y);
        expect(p2 % p1).toBe(0);
        const beklenen =
          gorev === "seritFarki"
            ? oranYap({ pay: Math.abs(a.pay * b.payda - b.pay * a.payda), payda: a.payda * b.payda })
            : oranYap({ pay: a.pay * b.payda + b.pay * a.payda, payda: a.payda * b.payda });
        expect(dogru).toBe(oranMetni(beklenen));
      }
    }
  });
});

describe("alan_izgara planı: doğru şık, ızgaradan bağımsız yeniden hesaplanır", () => {
  it.each(ALAN_IZGARA_GOREVLERI)("%s: 300 tohumda tutarlı çizim, 4 farklı şık, tek doğru", (gorev) => {
    for (let tohum = 1; tohum <= 300; tohum += 1) {
      const { cikarim, cizim } = alanIzgaraPlaniUret(gorev, tohum * 7919);
      const dogru = ortakDenetim(cikarim);
      const { satir, sutun, boyalar } = cizim.izgara;
      const n = satir * sutun;
      const boyali = boyalar.reduce((acc, boya) => acc + boya.sayi, 0);
      expect(boyali).toBeLessThan(n);
      expect(boyalar.every((boya) => boya.sayi >= 1)).toBe(true);

      if (gorev === "sonradanBoyanan") {
        // Son durumdaki boyalı alan = n × (verilen kesir); cevap, sonradan boyanan kare sayısı.
        const hedef = oranYap(cikarim.veriler[0].deger);
        const sonKare = (n * hedef.pay) / hedef.payda;
        expect(Number.isInteger(sonKare)).toBe(true);
        // Birim bağlama göre değişir (kare, koltuk, araç).
        expect(Number.parseInt(dogru, 10)).toBe(sonKare - boyali);
        // Verilen kesir genişletilmiş yazımdır (öğrenci sadeleştirir).
        expect(cikarim.veriler[0].deger.payda).toBeGreaterThan(hedef.payda);
        // Payda kare sayısına eşit değildir (yoksa pay doğrudan kare sayısı olurdu).
        expect(cikarim.veriler[0].deger.payda).not.toBe(n);
      } else if (gorev === "damlamaUcu") {
        // TYMM HEDEF: boş oran (şekilden) ÷ birim kesir (metinden).
        const birim = oranYap(cikarim.veriler[0].deger);
        expect(birim.pay).toBe(1);
        const uc = ((n - boyali) * birim.payda) / n;
        expect(Number.isInteger(uc)).toBe(true);
        // Birim bağlama göre değişir (damlama ucu, güneş paneli, stand).
        expect(Number.parseInt(dogru, 10)).toBe(uc);
      } else {
        // bosAlanOlcusu: boş oran (şekilden) × toplam alan (metinden).
        const toplam = oranYap(cikarim.veriler[0].deger).pay;
        const alan = (toplam * (n - boyali)) / n;
        expect(Number.isInteger(alan)).toBe(true);
        expect(dogru).toBe(`${alan} m²`);
      }
    }
  });
});

describe("tablo_kesir planı: doğru şık, tablodan bağımsız yeniden hesaplanır", () => {
  it.each(TABLO_KESIR_GOREVLERI)("%s: 300 tohumda tutarlı tablo, 4 farklı şık, tek doğru", (gorev) => {
    for (let tohum = 1; tohum <= 300; tohum += 1) {
      const { cikarim, cizim } = tabloKesirPlaniUret(gorev, tohum * 7919);
      const dogru = ortakDenetim(cikarim);
      const degerler = cizim.tablo.satirlar.map((satir) => oranYap(satir.deger));
      // Tablodaki değerler birbirinden farklıdır.
      expect(degerler.every((a, i) => degerler.every((b, j) => i === j || !esitMi(a, b)))).toBe(true);
      const ondalik = (d: Oran) => d.pay / d.payda;

      if (gorev === "esikSay") {
        const esik = ondalik(oranYap(cikarim.veriler[0].deger));
        const buyukler = degerler.filter((d) => ondalik(d) > esik).length;
        expect(Number.parseInt(dogru, 10)).toBe(buyukler);
        // Eşiğe eşit bir tuzak değer vardır (ama sayılmaz).
        expect(degerler.some((d) => ondalik(d) === esik)).toBe(true);
      } else {
        const sirali = [...degerler].sort((a, b) => ondalik(a) - ondalik(b));
        const enKucuk = sirali[0];
        const enBuyuk = sirali[sirali.length - 1];
        const fark = oranYap({ pay: enBuyuk.pay * enKucuk.payda - enKucuk.pay * enBuyuk.payda, payda: enBuyuk.payda * enKucuk.payda });
        expect(dogru.startsWith(`${oranMetni(fark)} `)).toBe(true);
      }
    }
  });
});

describe("cetvel_olcum planı: doğru şık, cetvelden bağımsız yeniden hesaplanır", () => {
  it.each(CETVEL_OLCUM_GOREVLERI)("%s: 300 tohumda konumlar bölme çizgisinde, 4 farklı şık, tek doğru", (gorev) => {
    for (let tohum = 1; tohum <= 300; tohum += 1) {
      const { cikarim, cizim } = cetvelOlcumPlaniUret(gorev, tohum * 7919);
      const dogru = ortakDenetim(cikarim);
      const { uzunluk, bolme, nesneler } = cizim.cetvel;
      const uzunluklar = nesneler.map((nesne) => {
        // Konumlar cetvelin içinde ve bir bölme çizgisinde; nesne 0'dan başlamaz.
        for (const konum of [nesne.baslangic, nesne.bitis]) {
          expect(konum.payda).toBe(bolme);
          expect(konum.pay).toBeGreaterThan(0);
          expect(konum.pay).toBeLessThan(uzunluk * bolme);
        }
        return oranYap({ pay: nesne.bitis.pay - nesne.baslangic.pay, payda: bolme });
      });
      expect(uzunluklar.every((u) => u.pay > 0)).toBe(true);
      const [uzun] = uzunluklar;
      const veri = oranYap(cikarim.veriler[0].deger);
      if (gorev === "kamaBolme") {
        // TYMM HEDEF: cetvelden okunan uzunluk ÷ kama → en fazla kaç tam kama.
        const tam = Math.floor((uzun.pay * veri.payda) / (uzun.payda * veri.pay));
        // Birim bağlama göre değişir (kama, fiyonk, bağlantı kablosu); sayı tam kısımdır.
        expect(Number.parseInt(dogru, 10)).toBe(tam);
      } else {
        const kalan = oranYap({ pay: uzun.pay * veri.payda - veri.pay * uzun.payda, payda: uzun.payda * veri.payda });
        expect(kalan.pay).toBeGreaterThan(0);
        expect(dogru).toBe(`${oranMetni(kalan)} cm`);
      }
    }
  });
});

describe("etap_dogrusu planı: doğru şık, doğrudan bağımsız yeniden hesaplanır", () => {
  it.each(ETAP_DOGRUSU_GOREVLERI)("%s: 300 tohumda farklı bölmeli iki aralık, 4 farklı şık, tek doğru", (gorev) => {
    for (let tohum = 1; tohum <= 300; tohum += 1) {
      const { cikarim, cizim } = etapDogrusuPlaniUret(gorev, tohum * 7919);
      const dogru = ortakDenetim(cikarim);
      const { bolmeler, noktalar } = cizim.dogru;
      // HEDEF modeli: iki aralık farklı sayıda eş parçaya bölünür; noktalar harfle adlandırılır.
      expect(bolmeler).toHaveLength(2);
      expect(bolmeler[0]).not.toBe(bolmeler[1]);
      expect(noktalar.map((nokta) => nokta.ad)).toEqual(["K", "L"]);
      const [k, l] = noktalar.map((nokta) => oranYap(nokta.konum));
      // Her nokta kendi aralığının bir bölme çizgisindedir.
      expect(noktalar[0].konum.payda).toBe(bolmeler[0]);
      expect(noktalar[1].konum.payda).toBe(bolmeler[1]);
      const ikinci = oranYap({ pay: l.pay * k.payda - k.pay * l.payda, payda: l.payda * k.payda });
      const fark = oranYap({ pay: ikinci.pay * k.payda - k.pay * ikinci.payda, payda: ikinci.payda * k.payda });
      expect(fark.pay).toBeGreaterThan(0);
      expect(dogru).toBe(`${oranMetni(fark)} birim`);
      // Metin hiçbir sayı vermez: bilgi yalnızca doğrudan okunur (TYMM 1).
      expect(cikarim.veriler).toHaveLength(0);
    }
  });
});
