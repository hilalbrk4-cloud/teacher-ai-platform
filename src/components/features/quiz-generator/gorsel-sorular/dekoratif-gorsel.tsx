"use client";

import Image from "next/image";
import * as React from "react";

import { SvgSahne } from "@/components/features/quiz-generator/gorsel-sorular/dekoratif-sahneler";
import type { GorselStratejisi, SenaryoSahnesi } from "@/types/gorsel-soru";

interface SahneSaglayiciProps {
  sahne: SenaryoSahnesi;
}

/** `public/gorseller/sahneler/<sahne>.webp` — dosya yoksa sessizce hiçbir şey göstermez. */
function HazirGorselSahne({ sahne }: SahneSaglayiciProps) {
  const [hata, setHata] = React.useState(false);
  if (hata) return null;
  return (
    <Image
      src={`/gorseller/sahneler/${sahne}.webp`}
      alt=""
      width={640}
      height={240}
      onError={() => setHata(true)}
      className="block h-auto max-h-36 w-full object-cover"
    />
  );
}

/** AI ile üretilen sahneler için yer tutucu — henüz uygulanmadı, hiçbir şey göstermez. */
function YapayZekaSahne() {
  return null;
}

function BosSahne() {
  return null;
}

/**
 * Dekoratif görsel katmanı. Hangi sağlayıcının kullanılacağına yalnızca
 * `strateji` karar verir; soru bileşeni ve soru mantığı bundan habersizdir.
 * SVG'den hazır görsele veya AI üretimine geçmek için registry'deki
 * `gorselStratejisi` alanını değiştirmek yeterlidir.
 */
const SAHNE_SAGLAYICILARI: Record<GorselStratejisi, React.ComponentType<SahneSaglayiciProps>> = {
  svg: SvgSahne,
  hazirGorsel: HazirGorselSahne,
  yapayZeka: YapayZekaSahne,
  yok: BosSahne,
};

export function DekoratifGorsel({ sahne, strateji }: { sahne: SenaryoSahnesi; strateji: GorselStratejisi }) {
  if (strateji === "yok") return null;
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-lg empty:hidden">
      {React.createElement(SAHNE_SAGLAYICILARI[strateji], { sahne })}
    </div>
  );
}
