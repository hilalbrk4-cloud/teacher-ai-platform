import {
  esitMi,
  islemUygula,
  oranMetni,
  oranYap,
  tamSayiMi,
  type Oran,
} from "@/lib/quiz-generator/gorsel-sorular/kesir-aritmetigi";
import type { Kesir, SenaryoGorevi, SenaryoSayilari } from "@/types/gorsel-soru";

/**
 * Sayısal senaryo görevleri için sayıları KOD seçer. Gerçek üretimlerde
 * model, koşulları aynı anda sağlayan sayıları (tam çıkan aralık sayısı,
 * kalanı tam bölünen çokluk…) kurmakta sürekli başarısız oldu; bu yüzden
 * sayılar geriye doğru, cevaptan başlanarak burada kurulur. Model yalnızca
 * bu sayılarla senaryoyu, işlem adımlarını ve çeldiricileri yazar.
 *
 * Deterministiktir: aynı tohum her zaman aynı sayıları verir (Blueprint
 * rastgelelik kullanmaz).
 */

type SayisalGorev = Exclude<SenaryoGorevi, "cokAdimliCikarim">;

/** Küçük, tohumlanabilir sözde rastgele üreteç (mulberry32). */
function uretec(tohum: number): () => number {
  let durum = tohum >>> 0;
  return () => {
    durum = (durum + 0x6d2b79f5) >>> 0;
    let t = durum;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ebob(a: number, b: number): number {
  return b === 0 ? a : ebob(b, a % b);
}

/** Oranı öğrencinin göreceği biçime çevirir: tam sayı → 4, bileşik → 2 2/5 (karışık) ya da 49/2 (bileşik). */
function kesir(oran: Oran, bicim: "karisik" | "bilesik" = "karisik"): Kesir {
  if (tamSayiMi(oran)) return { pay: oran.pay, payda: 1 };
  if (bicim === "bilesik" || oran.pay < oran.payda) return { pay: oran.pay, payda: oran.payda };
  return { tam: Math.floor(oran.pay / oran.payda), pay: oran.pay % oran.payda, payda: oran.payda };
}

function sayi(n: number): Kesir {
  return { pay: n, payda: 1 };
}

function metin(k: Kesir): string {
  return oranMetni(oranYap(k));
}

export function senaryoSayilariUret(gorev: SayisalGorev, tohum: number): SenaryoSayilari {
  const rastgele = uretec(tohum);
  const sec = <T>(dizi: readonly T[]): T => dizi[Math.floor(rastgele() * dizi.length)];
  const aralik = (min: number, max: number) => min + Math.floor(rastgele() * (max - min + 1));
  /** 1'den büyük, sade (pay ile paydası aralarında asal) bir bileşik kesir: 8/5, 7/4, 5/3… */
  const birdenBuyuk = (paydalar: readonly number[]) => {
    const payda = sec(paydalar);
    const adaylar = Array.from({ length: payda - 1 }, (_, i) => payda + 1 + i).filter((pay) => ebob(pay, payda) === 1);
    return { pay: sec(adaylar), payda };
  };
  /** 1'den küçük, sade bir basit kesir. */
  const birdenKucuk = (payda: number) => {
    const adaylar = Array.from({ length: payda - 1 }, (_, i) => i + 1).filter((pay) => ebob(pay, payda) === 1);
    return { pay: sec(adaylar), payda };
  };

  switch (gorev) {
    case "bolmeEnFazla": {
      // cevap × parça + (bir parçadan az bir artık) = toplam
      const parca = birdenBuyuk([3, 4, 5, 8]);
      const cevap = aralik(3, 7);
      const artik = aralik(1, parca.pay - 1);
      const toplam = oranYap({ pay: cevap * parca.pay + artik, payda: parca.payda });
      return {
        veriler: [
          { ad: "toplam miktar", deger: kesir(toplam, "bilesik") },
          { ad: "bir parçaya giden miktar", deger: parca },
        ],
        cevap: sayi(cevap),
        ipucu: `${metin(kesir(toplam, "bilesik"))} ÷ ${metin(parca)} = ${oranMetni(
          islemUygula("bol", [toplam, parca]) as Oran
        )} → en fazla ${cevap}`,
      };
    }
    case "birimOlcekleme": {
      const birim = birdenBuyuk([3, 4, 5]);
      const k1 = sec([2, 3, 4].filter((k) => ebob(k, birim.payda) === 1));
      const k2 = aralik(k1 + 1, k1 + 3);
      const verilen = oranYap({ pay: k1 * birim.pay, payda: birim.payda });
      const cevap = oranYap({ pay: k2 * birim.pay, payda: birim.payda });
      return {
        veriler: [
          { ad: `${k1} birimin toplam uzunluğu/miktarı`, deger: kesir(verilen) },
          { ad: "verilen birim sayısı", deger: sayi(k1) },
          { ad: "istenen birim sayısı", deger: sayi(k2) },
        ],
        cevap: kesir(cevap),
        ipucu: `bir birim = ${metin(kesir(verilen))} ÷ ${k1} = ${metin(birim)}; ${k2} birim = ${metin(kesir(cevap))}`,
      };
    }
    case "araliklar": {
      const adim = birdenBuyuk([2, 3, 4, 5]);
      const aralikSayisi = aralik(8, 15);
      const uzunluk = oranYap({ pay: aralikSayisi * adim.pay, payda: adim.payda });
      // Yalnızca referans sorudaki kurgu: uçlarda nesne yok → nesne = aralık − 1.
      // "Uçlarda nesne var" (+1) varyantında model, planın ilişkisiyle
      // çelişen metinler yazdı (uçlarda boşluk anlatıp +1 yapmak gibi).
      const cevap = aralikSayisi - 1;
      return {
        veriler: [
          { ad: "toplam uzunluk", deger: kesir(uzunluk, "bilesik") },
          { ad: "ardışık iki nesne arası uzaklık", deger: kesir(oranYap(adim)) },
        ],
        cevap: sayi(cevap),
        ipucu:
          `${aralikSayisi} aralık; ilk nesnenin başlangıç çizgisine, son nesnenin bitiş çizgisine uzaklığı da aynı ` +
          `aralık kadar (uçlarda nesne YOK) → nesne sayısı = aralık − 1 = ${cevap}`,
      };
    }
    case "kalaniBulma": {
      // Farklı paydalı iki parça, bütünden çıkarılır; kalan tam çıkmasın.
      for (;;) {
        const butun = sec([2, 3]);
        const [d1, d2] = sec([
          [4, 8],
          [3, 6],
          [2, 5],
          [4, 6],
          [3, 4],
          [2, 3],
        ] as const);
        const p1 = birdenKucuk(d1);
        const p2 = birdenKucuk(d2);
        const kullanilan = islemUygula("topla", [oranYap(p1), oranYap(p2)]) as Oran;
        const kalan = islemUygula("cikar", [{ pay: butun, payda: 1 }, kullanilan]) as Oran;
        if (kalan.pay <= 0 || tamSayiMi(kalan)) continue;
        // Cevap, senaryoda geçecek bir sayıya eşit olmamalı (cevap metinde verilmez).
        if ([p1, p2].some((parca) => esitMi(oranYap(parca), kalan))) continue;
        return {
          veriler: [
            { ad: "başlangıçtaki bütün miktar", deger: sayi(butun) },
            { ad: "birinci kullanılan parça", deger: p1 },
            { ad: "ikinci kullanılan parça", deger: p2 },
          ],
          cevap: kesir(kalan),
          ipucu: `${butun} − (${metin(p1)} + ${metin(p2)}) = ${metin(kesir(kalan))}`,
        };
      }
    }
    case "coklugunKesri": {
      // N, iki paydanın katı seçilir; böylece her ara sonuç tam sayıdır.
      const d1 = sec([3, 4, 5, 7]);
      const d2 = sec([2, 3, 4]);
      const k1 = birdenKucuk(d1);
      const k2 = birdenKucuk(d2);
      const n = d1 * d2 * aralik(1, 2);
      const ilk = (n * k1.pay) / d1;
      const kalan = n - ilk;
      const ikinci = (kalan * k2.pay) / d2;
      const cevap = kalan - ikinci;
      return {
        veriler: [
          { ad: "toplam çokluk", deger: sayi(n) },
          { ad: "birinci grubun kesri (tümün)", deger: k1 },
          { ad: "ikinci grubun kesri (geri kalanın)", deger: k2 },
        ],
        cevap: sayi(cevap),
        ipucu: `${n} × ${metin(k1)} = ${ilk}; kalan ${kalan}; ${kalan} × ${metin(k2)} = ${ikinci}; geriye ${cevap}`,
      };
    }
    case "karsilastirma": {
      // A = iki parçanın toplamı, B tek parça; cevap |A − B| (sıfır olmayan).
      for (;;) {
        const [da, db, dc] = sec([
          [4, 2, 8],
          [3, 6, 2],
          [4, 8, 2],
          [6, 3, 4],
          [5, 10, 2],
        ] as const);
        const a = birdenKucuk(da);
        const b = birdenKucuk(db);
        const c = birdenKucuk(dc);
        const toplam = islemUygula("topla", [oranYap(a), oranYap(b)]) as Oran;
        if (toplam.pay >= toplam.payda) continue;
        const fark = islemUygula("cikar", [toplam, oranYap(c)]) as Oran;
        if (fark.pay === 0) continue;
        const mutlak = { pay: Math.abs(fark.pay), payda: fark.payda };
        if ([a, b, c].some((veri) => esitMi(oranYap(veri), mutlak))) continue;
        return {
          veriler: [
            { ad: "birinci kişinin ilk miktarı", deger: a },
            { ad: "birinci kişinin eklediği miktar", deger: b },
            { ad: "ikinci kişinin miktarı", deger: c },
          ],
          cevap: kesir(mutlak),
          ipucu: `${metin(a)} + ${metin(b)} = ${oranMetni(toplam)}; fark = ${metin(kesir(mutlak))}`,
        };
      }
    }
  }
}
