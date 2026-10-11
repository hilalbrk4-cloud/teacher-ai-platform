// Bu dosya scripts/parse-all-curricula.ts tarafından üretilir; elle düzenlemeyin.
import type { CurriculumGradeData } from "@/types/curriculum";

import c_fen_bilimleri_3 from "./fen-bilimleri-3.json";
import c_fen_bilimleri_4 from "./fen-bilimleri-4.json";
import c_fen_bilimleri_5 from "./fen-bilimleri-5.json";
import c_fen_bilimleri_6 from "./fen-bilimleri-6.json";
import c_fen_bilimleri_7 from "./fen-bilimleri-7.json";
import c_fen_bilimleri_8 from "./fen-bilimleri-8.json";
import c_ingilizce_2 from "./ingilizce-2.json";
import c_ingilizce_3 from "./ingilizce-3.json";
import c_ingilizce_4 from "./ingilizce-4.json";
import c_ingilizce_5 from "./ingilizce-5.json";
import c_ingilizce_6 from "./ingilizce-6.json";
import c_ingilizce_7 from "./ingilizce-7.json";
import c_ingilizce_8 from "./ingilizce-8.json";
import c_matematik_5 from "./matematik-5.json";
import c_matematik_6 from "./matematik-6.json";
import c_matematik_7 from "./matematik-7.json";
import c_matematik_8 from "./matematik-8.json";
import c_sosyal_bilgiler_4 from "./sosyal-bilgiler-4.json";
import c_sosyal_bilgiler_5 from "./sosyal-bilgiler-5.json";
import c_sosyal_bilgiler_6 from "./sosyal-bilgiler-6.json";
import c_sosyal_bilgiler_7 from "./sosyal-bilgiler-7.json";
import c_t_c_inkilap_tarihi_ve_ataturkculuk_8 from "./t-c-inkilap-tarihi-ve-ataturkculuk-8.json";
import c_turkce_5 from "./turkce-5.json";
import c_turkce_6 from "./turkce-6.json";
import c_turkce_7 from "./turkce-7.json";
import c_turkce_8 from "./turkce-8.json";

export const CURRICULUM_REGISTRY: Record<string, CurriculumGradeData> = {
  "fen-bilimleri-3": c_fen_bilimleri_3 as CurriculumGradeData,
  "fen-bilimleri-4": c_fen_bilimleri_4 as CurriculumGradeData,
  "fen-bilimleri-5": c_fen_bilimleri_5 as CurriculumGradeData,
  "fen-bilimleri-6": c_fen_bilimleri_6 as CurriculumGradeData,
  "fen-bilimleri-7": c_fen_bilimleri_7 as CurriculumGradeData,
  "fen-bilimleri-8": c_fen_bilimleri_8 as CurriculumGradeData,
  "ingilizce-2": c_ingilizce_2 as CurriculumGradeData,
  "ingilizce-3": c_ingilizce_3 as CurriculumGradeData,
  "ingilizce-4": c_ingilizce_4 as CurriculumGradeData,
  "ingilizce-5": c_ingilizce_5 as CurriculumGradeData,
  "ingilizce-6": c_ingilizce_6 as CurriculumGradeData,
  "ingilizce-7": c_ingilizce_7 as CurriculumGradeData,
  "ingilizce-8": c_ingilizce_8 as CurriculumGradeData,
  "matematik-5": c_matematik_5 as CurriculumGradeData,
  "matematik-6": c_matematik_6 as CurriculumGradeData,
  "matematik-7": c_matematik_7 as CurriculumGradeData,
  "matematik-8": c_matematik_8 as CurriculumGradeData,
  "sosyal-bilgiler-4": c_sosyal_bilgiler_4 as CurriculumGradeData,
  "sosyal-bilgiler-5": c_sosyal_bilgiler_5 as CurriculumGradeData,
  "sosyal-bilgiler-6": c_sosyal_bilgiler_6 as CurriculumGradeData,
  "sosyal-bilgiler-7": c_sosyal_bilgiler_7 as CurriculumGradeData,
  "t-c-inkilap-tarihi-ve-ataturkculuk-8": c_t_c_inkilap_tarihi_ve_ataturkculuk_8 as CurriculumGradeData,
  "turkce-5": c_turkce_5 as CurriculumGradeData,
  "turkce-6": c_turkce_6 as CurriculumGradeData,
  "turkce-7": c_turkce_7 as CurriculumGradeData,
  "turkce-8": c_turkce_8 as CurriculumGradeData,
};
