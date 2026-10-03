import type { Kesir } from "@/types/gorsel-soru";

/**
 * Kesin kesir aritmetiği. Tüm değerler sadeleştirilmiş, paydası pozitif bir
 * bileşik kesir (`Oran`) olarak tutulur; hiçbir yerde ondalık/kayan nokta
 * kullanılmaz. Senaryo sorularında cevabı model değil bu modül hesaplar.
 */
export interface Oran {
  pay: number;
  payda: number;
}

export type IslemTuru = "topla" | "cikar" | "carp" | "bol" | "asagiYuvarla" | "yukariYuvarla";

function ebob(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x || 1;
}

function oran(pay: number, payda: number): Oran {
  const isaret = payda < 0 ? -1 : 1;
  const bolen = ebob(pay, payda);
  return { pay: (isaret * pay) / bolen, payda: (isaret * payda) / bolen };
}

/** `{tam?, pay, payda}` → sadeleştirilmiş bileşik kesir. */
export function oranYap(kesir: Kesir): Oran {
  return oran((kesir.tam ?? 0) * kesir.payda + kesir.pay, kesir.payda);
}

export function esitMi(a: Oran, b: Oran): boolean {
  return a.pay === b.pay && a.payda === b.payda;
}

export function tamSayiMi(a: Oran): boolean {
  return a.payda === 1;
}

export function pozitifMi(a: Oran): boolean {
  return a.pay > 0;
}

/** Bölen sıfırsa `undefined`. */
export function islemUygula(islem: IslemTuru, girdiler: Oran[]): Oran | undefined {
  const [a, b] = girdiler;
  switch (islem) {
    case "topla":
      return girdiler.reduce((toplam, x) => oran(toplam.pay * x.payda + x.pay * toplam.payda, toplam.payda * x.payda));
    case "cikar":
      return oran(a.pay * b.payda - b.pay * a.payda, a.payda * b.payda);
    case "carp":
      return girdiler.reduce((carpim, x) => oran(carpim.pay * x.pay, carpim.payda * x.payda));
    case "bol":
      return b.pay === 0 ? undefined : oran(a.pay * b.payda, a.payda * b.pay);
    case "asagiYuvarla":
      return oran(Math.floor(a.pay / a.payda), 1);
    case "yukariYuvarla":
      return oran(Math.ceil(a.pay / a.payda), 1);
  }
}

/** 4 → "4", 7/4 → "1 3/4", 3/5 → "3/5" (öğrencinin okuduğu doğal biçim). */
export function oranMetni(a: Oran): string {
  if (a.payda === 1) return String(a.pay);
  const tam = Math.trunc(a.pay / a.payda);
  const kalan = Math.abs(a.pay % a.payda);
  return tam === 0 ? `${a.pay}/${a.payda}` : `${tam} ${kalan}/${a.payda}`;
}

/** Modelin yazdığı biçimi koruyarak gösterir: 32/5 "32/5" kalır, 2 2/5 "2 2/5", 4/1 "4". */
export function kesirGosterimi(kesir: Kesir): string {
  if (kesir.payda === 1) return String((kesir.tam ?? 0) + kesir.pay);
  if (kesir.tam !== undefined && kesir.pay === 0) return String(kesir.tam);
  return kesir.tam !== undefined ? `${kesir.tam} ${kesir.pay}/${kesir.payda}` : `${kesir.pay}/${kesir.payda}`;
}

export const ISLEM_SEMBOLLERI: Record<Exclude<IslemTuru, "asagiYuvarla" | "yukariYuvarla">, string> = {
  topla: "+",
  cikar: "−",
  carp: "×",
  bol: "÷",
};
