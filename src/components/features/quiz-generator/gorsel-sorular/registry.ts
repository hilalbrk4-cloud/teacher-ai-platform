import type { ComponentType, ReactNode } from "react";

import { AlanIzgaraSoru } from "@/components/features/quiz-generator/gorsel-sorular/alan-izgara-soru";
import { CetvelOlcumSoru } from "@/components/features/quiz-generator/gorsel-sorular/cetvel-olcum-soru";
import { EtapDogrusuSoru } from "@/components/features/quiz-generator/gorsel-sorular/etap-dogrusu-soru";
import { DaireKesirSoru } from "@/components/features/quiz-generator/gorsel-sorular/daire-kesir-soru";
import { KesirCubuguSoru } from "@/components/features/quiz-generator/gorsel-sorular/kesir-cubugu-soru";
import { TabloKesirSoru } from "@/components/features/quiz-generator/gorsel-sorular/tablo-kesir-soru";
import { GercekHayatSenaryoSoru } from "@/components/features/quiz-generator/gorsel-sorular/gercek-hayat-senaryo-soru";
import { KesirKartlariSoru } from "@/components/features/quiz-generator/gorsel-sorular/kesir-kartlari-soru";
import { SayiDogrusuSoru } from "@/components/features/quiz-generator/gorsel-sorular/sayi-dogrusu-soru";
import type { GorselSoruTanimi } from "@/lib/quiz-generator/gorsel-sorular/ortak";
import { GORSEL_SORU_TANIMLARI } from "@/lib/quiz-generator/gorsel-sorular/tanimlar";
import type { GorselSoruTipi, GorselSoruVeriHaritasi, GorselStratejisi } from "@/types/gorsel-soru";
import type { Dictionary } from "@/types/i18n";

export interface GorselSoruBilesenProps<V> {
  veri: V;
  /** Soru kökü (düzenlenebilir); bileşen onu kendi düzeninde uygun yere koyar. */
  soruKoku: ReactNode;
  showAnswer: boolean;
  gorselStratejisi: GorselStratejisi;
  t: Dictionary;
}

/**
 * Registry kaydı = React'ten bağımsız tanım (tip anahtarı, veri şeması ve
 * doğrulayıcısı, prompt örneği, `gorselStratejisi`) + onu çizen bileşen.
 */
export type GorselSoruKaydi<K extends GorselSoruTipi> = GorselSoruTanimi<K> & {
  bilesen: ComponentType<GorselSoruBilesenProps<GorselSoruVeriHaritasi[K]>>;
};

export const GORSEL_SORU_REGISTRY: { [K in GorselSoruTipi]: GorselSoruKaydi<K> } = {
  sayi_dogrusu: { ...GORSEL_SORU_TANIMLARI.sayi_dogrusu, bilesen: SayiDogrusuSoru },
  kesir_kartlari: { ...GORSEL_SORU_TANIMLARI.kesir_kartlari, bilesen: KesirKartlariSoru },
  gercek_hayat_senaryo: { ...GORSEL_SORU_TANIMLARI.gercek_hayat_senaryo, bilesen: GercekHayatSenaryoSoru },
  daire_kesir: { ...GORSEL_SORU_TANIMLARI.daire_kesir, bilesen: DaireKesirSoru },
  kesir_cubugu: { ...GORSEL_SORU_TANIMLARI.kesir_cubugu, bilesen: KesirCubuguSoru },
  alan_izgara: { ...GORSEL_SORU_TANIMLARI.alan_izgara, bilesen: AlanIzgaraSoru },
  tablo_kesir: { ...GORSEL_SORU_TANIMLARI.tablo_kesir, bilesen: TabloKesirSoru },
  cetvel_olcum: { ...GORSEL_SORU_TANIMLARI.cetvel_olcum, bilesen: CetvelOlcumSoru },
  etap_dogrusu: { ...GORSEL_SORU_TANIMLARI.etap_dogrusu, bilesen: EtapDogrusuSoru },
};
