import type { ReactNode } from "react";

import type { SenaryoSahnesi } from "@/types/gorsel-soru";

/**
 * "svg" stratejisinin dekoratif sahneleri. Sade, düz şekillerden oluşur ve
 * hiçbir soru bilgisi taşımaz — soru mantığı bu dosyadan tamamen
 * bağımsızdır. Renkler tek bir palette toplanır ve açık/koyu temaya uyar.
 */
const R = {
  zemin: "fill-slate-100 dark:fill-slate-800/60",
  acik: "fill-slate-200 dark:fill-slate-700/70",
  orta: "fill-slate-300 dark:fill-slate-600",
  koyu: "fill-slate-500 dark:fill-slate-500",
  vurgu: "fill-indigo-200 dark:fill-indigo-500/30",
  sicak: "fill-amber-200 dark:fill-amber-400/30",
  yesil: "fill-emerald-200 dark:fill-emerald-500/25",
  yesilKoyu: "fill-emerald-300 dark:fill-emerald-600/40",
  gok: "fill-sky-100 dark:fill-sky-900/30",
  cizgi: "stroke-white/80 dark:stroke-slate-300/40",
};

function Market() {
  return (
    <>
      <rect x={0} y={100} width={320} height={20} className={R.acik} />
      <rect x={24} y={16} width={150} height={84} rx={4} className={R.acik} />
      {[42, 68, 94].map((y) => (
        <rect key={y} x={24} y={y} width={150} height={4} className={R.orta} />
      ))}
      {[32, 52, 72, 96, 120, 144].map((x, index) => (
        <rect key={`ust-${x}`} x={x} y={24} width={14} height={18} rx={2} className={index % 2 ? R.vurgu : R.sicak} />
      ))}
      {[34, 60, 86, 112, 140].map((x, index) => (
        <rect key={`orta-${x}`} x={x} y={52} width={18} height={16} rx={2} className={index % 2 ? R.yesil : R.vurgu} />
      ))}
      {[30, 58, 90, 124, 150].map((x, index) => (
        <circle key={`alt-${x}`} cx={x + 6} cy={86} r={7} className={index % 2 ? R.sicak : R.yesil} />
      ))}
      <rect x={214} y={14} width={76} height={18} rx={4} className={R.vurgu} />
      <path d="M206 58 h78 l-10 30 h-58 z" className={R.orta} />
      <rect x={194} y={52} width={16} height={4} rx={2} className={R.koyu} />
      <circle cx={226} cy={98} r={6} className={R.koyu} />
      <circle cx={266} cy={98} r={6} className={R.koyu} />
    </>
  );
}

function Mutfak() {
  return (
    <>
      <rect x={16} y={10} width={112} height={32} rx={3} className={R.acik} />
      <line x1={72} y1={12} x2={72} y2={40} strokeWidth={2} className={R.cizgi} />
      <rect x={220} y={12} width={78} height={46} rx={4} className={R.gok} />
      <line x1={259} y1={12} x2={259} y2={58} strokeWidth={3} className={R.cizgi} />
      <rect x={0} y={74} width={320} height={8} className={R.orta} />
      <rect x={0} y={82} width={320} height={38} className={R.acik} />
      {[80, 160, 240].map((x) => (
        <line key={x} x1={x} y1={84} x2={x} y2={118} strokeWidth={2} className={R.cizgi} />
      ))}
      <path d="M96 52 h56 a28 22 0 0 1 -56 0 z" className={R.vurgu} />
      <rect x={168} y={40} width={30} height={34} rx={4} className={R.sicak} />
      <rect x={172} y={50} width={22} height={10} rx={2} className={R.zemin} />
      <rect x={30} y={62} width={40} height={12} rx={3} className={R.koyu} />
      <circle cx={50} cy={56} r={8} className={R.orta} />
    </>
  );
}

function Sinif() {
  return (
    <>
      <rect x={0} y={104} width={320} height={16} className={R.acik} />
      <rect x={36} y={12} width={156} height={70} rx={4} className={R.koyu} />
      <rect x={42} y={18} width={144} height={58} rx={2} className="fill-slate-600 dark:fill-slate-700" />
      {[32, 46, 60].map((y, index) => (
        <line key={y} x1={54} y1={y} x2={54 + 110 - index * 30} y2={y} strokeWidth={2} className={R.cizgi} />
      ))}
      <rect x={36} y={82} width={156} height={4} className={R.orta} />
      <circle cx={262} cy={30} r={14} className={R.zemin} />
      <circle cx={262} cy={30} r={14} fill="none" strokeWidth={3} className="stroke-slate-400 dark:stroke-slate-500" />
      <line x1={262} y1={30} x2={262} y2={21} strokeWidth={2} className="stroke-slate-500" />
      <line x1={262} y1={30} x2={269} y2={30} strokeWidth={2} className="stroke-slate-500" />
      <rect x={216} y={70} width={88} height={7} rx={2} className={R.orta} />
      <rect x={222} y={77} width={5} height={27} className={R.orta} />
      <rect x={293} y={77} width={5} height={27} className={R.orta} />
      <rect x={236} y={56} width={26} height={14} rx={2} className={R.sicak} />
      <rect x={268} y={60} width={20} height={10} rx={2} className={R.vurgu} />
    </>
  );
}

function Park() {
  return (
    <>
      <rect x={0} y={0} width={320} height={120} className={R.gok} />
      <circle cx={276} cy={26} r={14} className={R.sicak} />
      <path d="M0 92 Q80 76 160 90 T320 86 V120 H0 Z" className={R.yesil} />
      <rect x={70} y={52} width={8} height={42} className={R.orta} />
      <circle cx={74} cy={44} r={22} className={R.yesilKoyu} />
      <circle cx={58} cy={54} r={14} className={R.yesilKoyu} />
      <circle cx={90} cy={54} r={14} className={R.yesilKoyu} />
      <rect x={176} y={78} width={70} height={6} rx={2} className={R.koyu} />
      <rect x={176} y={66} width={70} height={5} rx={2} className={R.orta} />
      <rect x={182} y={84} width={5} height={14} className={R.koyu} />
      <rect x={235} y={84} width={5} height={14} className={R.koyu} />
    </>
  );
}

function Yolculuk() {
  return (
    <>
      <rect x={0} y={0} width={320} height={120} className={R.gok} />
      <path d="M0 80 Q60 40 130 72 T260 60 T320 64 V92 H0 Z" className={R.yesil} />
      <rect x={0} y={90} width={320} height={22} className={R.orta} />
      {[12, 60, 108, 156, 204, 252, 300].map((x) => (
        <rect key={x} x={x} y={99} width={24} height={3} rx={1.5} className="fill-white/80 dark:fill-slate-300/40" />
      ))}
      <rect x={112} y={54} width={96} height={38} rx={8} className={R.vurgu} />
      {[120, 142, 164, 186].map((x) => (
        <rect key={x} x={x} y={61} width={16} height={12} rx={2} className={R.zemin} />
      ))}
      <circle cx={134} cy={92} r={7} className={R.koyu} />
      <circle cx={188} cy={92} r={7} className={R.koyu} />
    </>
  );
}

function Genel() {
  return (
    <>
      <circle cx={70} cy={70} r={38} className={R.vurgu} />
      <rect x={130} y={30} width={70} height={60} rx={12} className={R.acik} />
      <circle cx={250} cy={52} r={24} className={R.sicak} />
      <rect x={228} y={84} width={60} height={10} rx={5} className={R.yesil} />
    </>
  );
}

const SAHNELER: Record<SenaryoSahnesi, () => ReactNode> = {
  market: Market,
  mutfak: Mutfak,
  sinif: Sinif,
  park: Park,
  yolculuk: Yolculuk,
  genel: Genel,
};

export function SvgSahne({ sahne }: { sahne: SenaryoSahnesi }) {
  return (
    <svg viewBox="0 0 320 120" aria-hidden="true" focusable="false" className="block h-auto max-h-36 w-full">
      <rect x={0} y={0} width={320} height={120} className={R.zemin} />
      {SAHNELER[sahne]()}
    </svg>
  );
}
