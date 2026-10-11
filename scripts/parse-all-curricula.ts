/**
 * MEB çerçeve yıllık plan Excel dosyalarını (references/*.xlsx) tip güvenli
 * müfredat JSON'larına dönüştürür.
 *
 *   npm run curriculum:parse
 *
 * Çalışma kitapları farklı şablonlar kullanır (TYMM / önceki program,
 * Türkçe beceri sütunları, İngilizce başlıklar, 1-3 satırlık başlıklar,
 * birleştirilmiş hücreler). Bu yüzden sütunlar sabit konumla değil başlık
 * metniyle sınıflandırılır; öğrenme çıktıları ise resmî kod deseniyle
 * (FB.7.1.1, T.D.5.3, M.8.1.1.1, E7.1.L1…) hücre metninden ayrıştırılır.
 *
 * Çıktı: src/data/curriculum/<ders>-<sınıf>.json, index.json ve registry.ts.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ExcelJS from "exceljs";

import type {
  CurriculumGradeData,
  CurriculumIndexEntry,
  CurriculumOutcome,
  CurriculumProgram,
  CurriculumTag,
  CurriculumTopic,
  CurriculumUnit,
} from "../src/types/curriculum.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = path.join(ROOT, "references");
const OUTPUT_DIR = path.join(ROOT, "src", "data", "curriculum");

// ---------------------------------------------------------------- metin yardımcıları

const upper = (value: string) => value.toLocaleUpperCase("tr-TR");
const squash = (value: string) => value.replace(/[ \t ]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
const oneLine = (value: string) => squash(value).replace(/\n/g, " ");

function cellText(cell: ExcelJS.Cell): string {
  const value = cell.value as unknown;
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.richText)) return record.richText.map((part: { text: string }) => part.text).join("");
    if ("result" in record) return String(record.result ?? "");
    if ("text" in record) return String(record.text ?? "");
  }
  return "";
}

function slug(value: string): string {
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", i̇: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşüâîû]|i̇/g, (char) => map[char] ?? char)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

// ---------------------------------------------------------------- ders ve sınıf

const SUBJECTS: { pattern: RegExp; subject: string }[] = [
  { pattern: /FEN/, subject: "Fen Bilimleri" },
  { pattern: /MATEMAT/, subject: "Matematik" },
  { pattern: /SOSYAL/, subject: "Sosyal Bilgiler" },
  { pattern: /T[ÜU]RK[ÇC]E/, subject: "Türkçe" },
  { pattern: /[İI]NK[İI]LAP/, subject: "T.C. İnkılap Tarihi ve Atatürkçülük" },
  { pattern: /[İI]NG[İI]L[İI]ZCE|ENGLISH/, subject: "İngilizce" },
];

function detectSubject(fileName: string): string | undefined {
  const name = upper(fileName.normalize("NFC"));
  return SUBJECTS.find((item) => item.pattern.test(name))?.subject;
}

function detectGrade(sheetName: string, title: string): number | undefined {
  const fromSheet = /(\d{1,2})/.exec(sheetName);
  if (fromSheet) return Number(fromSheet[1]);
  const fromTitle = /(\d{1,2})\s*\.?\s*(?:SINIF|GRADE)/i.exec(title);
  return fromTitle ? Number(fromTitle[1]) : undefined;
}

// ---------------------------------------------------------------- sütun sınıflandırma

type ColumnRole =
  | "unit"
  | "topic"
  | "text"
  | "content"
  | "outcome"
  | "process"
  | "assessment"
  | "sdb"
  | "values"
  | "literacy";

/** En özel başlıktan (alt satır) başlayarak sütunun rolünü bulur. */
function classifyColumn(headers: string[]): ColumnRole | undefined {
  for (const raw of [...headers].reverse()) {
    const h = upper(oneLine(raw));
    if (!h) continue;
    if (/^(AY|HAFTA|DERS SAAT[İI]|S[ÜU]RE|MONTH|WEEK|CLASS HOURS?|DURATION)$/.test(h)) return undefined;
    if (/BEL[İI]RL[İI] G[ÜU]N|CELEBRATION|FARKLILA[ŞS]TIRMA|ZENG[İI]NLE[ŞS]T[İI]RME|DIFFERENTIATION|OKUL TEMELL[İI]|SCHOOL-BASED|OKUL DI[ŞS]I|OUT OF SCHOOL|Y[ÖO]NTEM VE TEKN|SUGGESTED CONTEXTS/.test(h)) {
      return undefined;
    }
    if (/S[ÜU]RE[ÇC] B[İI]LE[ŞS]EN|KAZANIM A[ÇC]IKLAMA/.test(h)) return "process";
    if (/[ÖO]L[ÇC]ME|ASSESSMENT|[ÖO]ĞRENME KANIT|INDICATORS FOR LEARNING/.test(h)) return "assessment";
    if (/SOSYAL\s*-?\s*DUYGUSAL|SOCIAL-EMOTIONAL/.test(h)) return "sdb";
    if (/^DEĞERLER$|^VALUES$/.test(h)) return "values";
    if (/OKURYAZARLIK|LITERACY/.test(h)) return "literacy";
    if (/D[İI]NLEME|^OKUMA$|^KONU[ŞS]MA$|^YAZMA$|[ÖO]ĞRENME [ÇC]IKTI|^KAZANIM$|LEARNING OUTCOME|LEARNING SKILLS/.test(h)) return "outcome";
    if (/^MET[İI]N$/.test(h)) return "text";
    if (/^KONU|KONU\/MET[İI]N/.test(h)) return "topic";
    if (/^[İI][ÇC]ER[İI]K [ÇC]ER[ÇC]EVES[İI]$|^CONTENT FRAME$|FUNCTIONS AND USEFUL/.test(h)) return "content";
    if (/[ÜU]N[İI]TE|TEMA|[ÖO]ĞRENME ALANI|THEME|UNIT/.test(h)) return "unit";
  }
  return undefined;
}

// ---------------------------------------------------------------- kod desenleri

/** Program kodu olmayan önekler (SDB2.1, D7, OB4 ve İngilizce karşılıkları). */
const NON_OUTCOME_PREFIXES = new Set(["SDB", "D", "OB", "SELS", "V", "LS"]);

/**
 * Öğrenme çıktısı/kazanım kodu: önek (T.D, MAT, FB, SB, İTA, ENG, E…), sınıf
 * ve 1-3 parça (sayı ya da L1/R2 gibi İngilizce beceri parçası).
 */
const OUTCOME_CODE =
  /(?<![\p{L}\d.])((?:[A-ZÇĞİÖŞÜ]{1,4}\.)?[A-ZÇĞİÖŞÜ]{1,4})([.\s]?)(\d{1,2})((?:\.(?:[A-Z]{1,2})?\d{1,2}){1,3})\.?(?!\d)/gu;

interface CodeMatch {
  code: string;
  start: number;
  end: number;
}

function findOutcomeCodes(text: string, grade: number): CodeMatch[] {
  const found: CodeMatch[] = [];
  for (const match of text.matchAll(OUTCOME_CODE)) {
    const [whole, prefix, separator, gradeText, rest] = match;
    if (NON_OUTCOME_PREFIXES.has(prefix) || Number(gradeText) !== grade) continue;
    const code = `${prefix}${separator === "" ? "" : "."}${gradeText}${rest}`;
    found.push({ code, start: match.index!, end: match.index! + whole.length });
  }
  return found;
}

/** Bir hücreyi kod → o koddan sonra gelen metin parçalarına böler. */
function splitByCodes(text: string, grade: number): { code: string; body: string }[] {
  const codes = findOutcomeCodes(text, grade);
  return codes.map((match, index) => ({
    code: match.code,
    body: squash(text.slice(match.end, codes[index + 1]?.start ?? text.length)),
  }));
}

const COMPONENT_MARKER = /(?:^|\s)([a-zçğıöşü])[).]\s+/g;
const LETTERS = "abcçdefgğhıijklmnoöprsştuüvyz";

/** "Başlık a) … b) …" → başlık + bileşenler; harfler a'dan başlayıp sırayla ilerlemelidir. */
function splitComponents(body: string): { title: string; components: string[] } {
  const markers: { index: number; contentStart: number }[] = [];
  let expected = 0;
  for (const match of body.matchAll(COMPONENT_MARKER)) {
    const letter = match[1];
    const position = LETTERS.indexOf(letter);
    const isNext = markers.length === 0 ? letter === "a" : position === expected || position === expected + 1;
    if (!isNext) continue;
    expected = position + 1;
    markers.push({ index: match.index!, contentStart: match.index! + match[0].length });
  }
  if (markers.length === 0) return { title: oneLine(body), components: [] };
  const components = markers
    .map((marker, index) => oneLine(body.slice(marker.contentStart, markers[index + 1]?.index ?? body.length)))
    .filter(Boolean);
  return { title: oneLine(body.slice(0, markers[0].index)), components };
}

/** "SDB2.1. İletişim, SDB2.2. İş Birliği" → etiketler. İngilizce SELS/V/LS kodları SDB/D/OB'ye eşlenir. */
function parseTags(text: string, kind: "sdb" | "values" | "literacy"): CurriculumTag[] {
  const pattern = {
    sdb: /\b(SDB|SELS)\s?(\d+(?:\.\d+)?)\.?/g,
    values: /\b(D|V)\s?(\d{1,2})\.?(?!\d)/g,
    literacy: /\b(OB|LS)\s?(\d{1,2})\.?(?!\d)/g,
  }[kind];
  const canonical = { sdb: "SDB", values: "D", literacy: "OB" }[kind];
  const matches = [...oneLine(text).matchAll(pattern)];
  const tags = matches.map((match, index) => {
    const end = match.index! + match[0].length;
    const label = oneLine(oneLine(text).slice(end, matches[index + 1]?.index ?? undefined))
      .replace(/^[\s.:,;-]+|[\s.,;-]+$/g, "")
      .slice(0, 80);
    return { code: `${canonical}${match[2]}`, label };
  });
  return dedupeTags(tags.filter((tag) => tag.label.length > 0));
}

function dedupeTags(tags: CurriculumTag[]): CurriculumTag[] {
  const seen = new Map<string, CurriculumTag>();
  for (const tag of tags) if (!seen.has(tag.code)) seen.set(tag.code, tag);
  return [...seen.values()];
}

const uniq = (values: string[]) => [...new Set(values.filter(Boolean))];

// ---------------------------------------------------------------- sayfa ayrıştırma

/** Konu/ünite adındaki eski program numaralarını ("M.8.1.1.", "8.1.1.") temizler. */
// Yalnızca Türkçe bağlaçlar: "at", "on", "in" gibi İngilizce edatlar Türkçede ad olabilir ("Cepheye Koşan At").
const SMALL_WORDS = new Set(["ve", "ile", "ya", "da", "de", "ki", "veya"]);

/** Tamamı büyük harfle yazılmış adları Türkçe kurallarıyla başlık biçimine çevirir ("UZAY ÇAĞI" → "Uzay Çağı"). */
function titleCase(value: string): string {
  if (/\p{Ll}/u.test(value)) return value;
  return value
    .toLocaleLowerCase("tr-TR")
    .split(" ")
    .map((word, index) =>
      index > 0 && SMALL_WORDS.has(word)
        ? word
        : word.replace(/(^|[(/-])(\p{L})/gu, (_, before: string, letter: string) => before + letter.toLocaleUpperCase("tr-TR"))
    )
    .join(" ");
}

function cleanName(value: string): string {
  const cleaned = oneLine(value)
    .replace(/^(?:[A-ZÇĞİÖŞÜ]{1,4}\.)?(?:\d+\.){1,4}\s*/u, "")
    .replace(/^\d*\.?\s*(?:[ÜU]N[İI]TE|ÖĞRENME ALANI)\s*:\s*/iu, "")
    .replace(/^SUB-THEMES?:\s*/i, "")
    .replace(/\*+$/, "")
    .trim();
  // Kaynakta kapanmamış parantez ("… (DİNLEME/İZLEME") tamamlanır.
  const balanced = (cleaned.match(/\(/g)?.length ?? 0) > (cleaned.match(/\)/g)?.length ?? 0) ? `${cleaned})` : cleaned;
  return titleCase(balanced);
}

/** Koddaki ünite parçası (FB.7.4.1 → "4", ENG.5.2.L1 → "2"); ünite parçası olmayan kodlarda (T.D.5.3) boş. */
function unitPartOf(code: string, grade: number): string {
  const match = new RegExp(`(?:^|[.A-ZÇĞİÖŞÜ])${grade}\\.([A-Z]{0,2}\\d{1,2})\\.`).exec(code);
  return match ? match[1] : "";
}

function topicNames(row: Map<ColumnRole, string[]>, unitName: string): string[] {
  const pick = (role: ColumnRole) => (row.get(role) ?? []).map((value) => squash(value)).filter(Boolean);
  const text = pick("text");
  const topic = pick("topic");
  const content = pick("content").filter((value) => oneLine(value).length <= 120 && !value.trim().startsWith("*"));
  const source = text[0] ?? topic[0] ?? content[0];
  if (!source) return [unitName];
  // Bir hücrede alt alta yazılmış birden fazla konu olabilir ("Asal Sayılar\nBir Doğal Sayının Çarpanları").
  const names = source.split("\n").map(cleanName).filter((name) => name.length > 2);
  return names.length > 0 ? names : [unitName];
}

/**
 * Kaynaktaki yazım hatalı kodları onarır: sayfadaki baskın önekin sonu olan
 * bir önek ("B.5.1.2" ↔ "SB.5.1.2") aynı gövdeli geçerli bir koda işaret
 * ediyorsa veriler birleştirilir ve konulardaki referanslar düzeltilir.
 */
function repairTruncatedCodes(outcomes: Map<string, CurriculumOutcome>, units: CurriculumUnit[]) {
  const prefixOf = (code: string) => /^[^\d]*?(?=[.\s]?\d)/u.exec(code)?.[0].replace(/\.$/, "") ?? "";
  const counts = new Map<string, number>();
  for (const code of outcomes.keys()) counts.set(prefixOf(code), (counts.get(prefixOf(code)) ?? 0) + 1);
  const aliases = new Map<string, string>();
  for (const code of outcomes.keys()) {
    const prefix = prefixOf(code);
    for (const [other, count] of counts) {
      if (other === prefix || !other.endsWith(prefix) || count <= (counts.get(prefix) ?? 0)) continue;
      const target = other + code.slice(prefix.length);
      if (outcomes.has(target)) aliases.set(code, target);
    }
  }
  for (const [alias, target] of aliases) {
    const from = outcomes.get(alias)!;
    const to = outcomes.get(target)!;
    if (from.text.length > to.text.length) to.text = from.text;
    to.components = uniq([...to.components, ...from.components]);
    to.sdb = dedupeTags([...to.sdb, ...from.sdb]);
    to.values = dedupeTags([...to.values, ...from.values]);
    to.literacy = dedupeTags([...to.literacy, ...from.literacy]);
    to.assessment = uniq([...to.assessment, ...from.assessment]);
    outcomes.delete(alias);
  }
  for (const unit of units) {
    for (const topic of unit.topics) topic.outcomeCodes = uniq(topic.outcomeCodes.map((code) => aliases.get(code) ?? code));
  }
}

/** Aynı kodlu etiketlere tüm dosyalarda en sık geçen yazımı uygular (kaynaktaki kesik/farklı yazımları giderir). */
function normalizeTagLabels(grades: CurriculumGradeData[]) {
  const votes = new Map<string, Map<string, number>>();
  // İngilizce programı etiketleri İngilizce yazar; diller ayrı oylanır.
  const keyOf = (grade: CurriculumGradeData, code: string) => `${grade.subjectId === "ingilizce" ? "en" : "tr"}:${code}`;
  const all = grades.flatMap((grade) =>
    Object.values(grade.outcomes).flatMap((outcome) =>
      [...outcome.sdb, ...outcome.values, ...outcome.literacy].map((tag) => ({ tag, key: keyOf(grade, tag.code) }))
    )
  );
  for (const { tag, key } of all) {
    const byLabel = votes.get(key) ?? new Map<string, number>();
    byLabel.set(tag.label, (byLabel.get(tag.label) ?? 0) + 1);
    votes.set(key, byLabel);
  }
  const canonical = new Map(
    [...votes].map(([code, byLabel]) => [code, [...byLabel].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[0][0]])
  );
  for (const { tag, key } of all) tag.label = canonical.get(key) ?? tag.label;
}

interface SheetResult {
  data: CurriculumGradeData;
  warnings: string[];
}

function parseSheet(sheet: ExcelJS.Worksheet, fileName: string, subject: string): SheetResult | undefined {
  const warnings: string[] = [];
  const title = oneLine(cellText(sheet.getRow(1).getCell(1)));
  const grade = detectGrade(sheet.name, title);
  if (!grade) return undefined;

  // Başlık satırı: öğrenme çıktısı / kazanım sütununu içeren ilk satır; alt başlık satırı varsa onu da al.
  const OUTCOME_HEADER = /[ÖO]ĞRENME [ÇC]IKTI|KAZANIM|LEARNING OUTCOME|LEARNING SKILLS/;
  let headerRow = 0;
  for (let r = 1; r <= Math.min(8, sheet.rowCount); r += 1) {
    const texts: string[] = [];
    sheet.getRow(r).eachCell({ includeEmpty: false }, (cell) => texts.push(upper(cellText(cell))));
    if (texts.some((value) => OUTCOME_HEADER.test(value))) {
      headerRow = r;
      break;
    }
  }
  if (!headerRow) return undefined;
  const headerRows = [headerRow];
  const next = sheet.getRow(headerRow + 1);
  const nextTexts: string[] = [];
  next.eachCell({ includeEmpty: false }, (cell) => nextTexts.push(cellText(cell)));
  if (nextTexts.length > 0 && nextTexts.every((value) => findOutcomeCodes(value, grade).length === 0) && nextTexts.some((v) => /^(AY|MONTH)$/i.test(oneLine(v)))) {
    headerRows.push(headerRow + 1);
  }

  const columnCount = sheet.columnCount;
  const roles = new Map<number, ColumnRole>();
  for (let c = 1; c <= columnCount; c += 1) {
    const role = classifyColumn(headerRows.map((r) => cellText(sheet.getRow(r).getCell(c))));
    if (role) roles.set(c, role);
  }
  const roleSet = new Set(roles.values());
  if (!roleSet.has("outcome")) return undefined;
  const program: CurriculumProgram = roleSet.has("sdb") || roleSet.has("values") ? "tymm" : "onceki";

  const outcomes = new Map<string, CurriculumOutcome>();
  const units: CurriculumUnit[] = [];
  const unitById = new Map<string, CurriculumUnit>();

  const getOutcome = (code: string): CurriculumOutcome => {
    let outcome = outcomes.get(code);
    if (!outcome) {
      outcome = { code, text: "", components: [], sdb: [], values: [], literacy: [], assessment: [] };
      outcomes.set(code, outcome);
    }
    return outcome;
  };

  const firstDataRow = headerRows[headerRows.length - 1] + 1;
  for (let r = firstDataRow; r <= sheet.rowCount; r += 1) {
    const row = new Map<ColumnRole, string[]>();
    sheet.getRow(r).eachCell({ includeEmpty: false }, (cell, c) => {
      const role = roles.get(c);
      const value = cellText(cell);
      if (!role || !value.trim()) return;
      row.set(role, [...(row.get(role) ?? []), value]);
    });

    // Öğrenme çıktıları: aynı satırda birden çok sütun ve hücre içinde birden çok kod olabilir.
    const rowCodes: string[] = [];
    for (const cell of uniq(row.get("outcome") ?? [])) {
      for (const { code, body } of splitByCodes(cell, grade)) {
        const { title: text, components } = splitComponents(body);
        const outcome = getOutcome(code);
        if (text.length > outcome.text.length) outcome.text = text;
        outcome.components = uniq([...outcome.components, ...components]);
        rowCodes.push(code);
      }
    }
    const codes = uniq(rowCodes);
    if (codes.length === 0) continue; // oryantasyon, tekrar, tatil, laboratuvar güvenliği gibi satırlar

    // Süreç bileşenleri / kazanım açıklaması: kodla başlıyorsa koda, değilse satırdaki tek çıktıya bağlanır.
    for (const cell of uniq(row.get("process") ?? [])) {
      const parts = splitByCodes(cell, grade);
      if (parts.length > 0) {
        for (const { code, body } of parts) {
          if (!outcomes.has(code)) continue;
          const { title, components } = splitComponents(body);
          const outcome = getOutcome(code);
          outcome.components = uniq([...outcome.components, ...(components.length > 0 ? components : [title])]);
        }
      } else if (codes.length === 1) {
        const { title, components } = splitComponents(squash(cell));
        const outcome = getOutcome(codes[0]);
        outcome.components = uniq([...outcome.components, ...(components.length > 0 ? components : [title])]);
      }
    }

    const sdb = (row.get("sdb") ?? []).flatMap((cell) => parseTags(cell, "sdb"));
    const values = (row.get("values") ?? []).flatMap((cell) => parseTags(cell, "values"));
    const literacy = (row.get("literacy") ?? []).flatMap((cell) => parseTags(cell, "literacy"));
    // Hücre içindeki satır sonları çoğunlukla görsel kaydırmadır; yalnızca madde işaretli hücreler maddelere bölünür.
    const assessment = uniq(
      (row.get("assessment") ?? [])
        .flatMap((cell) => {
          const text = squash(cell);
          return /(^|\n)\s*[*•-]/.test(text) ? text.split(/(?:^|\n)\s*[*•-]\s*/) : [text];
        })
        .map((line) => oneLine(line))
        .filter((line) => line.length > 2 && line.length <= 1200)
    );
    for (const code of codes) {
      const outcome = getOutcome(code);
      outcome.sdb = dedupeTags([...outcome.sdb, ...sdb]);
      outcome.values = dedupeTags([...outcome.values, ...values]);
      outcome.literacy = dedupeTags([...outcome.literacy, ...literacy]);
      outcome.assessment = uniq([...outcome.assessment, ...assessment]);
    }

    // Ünite → konu → çıktı ağacı. Ünite geçiş haftalarında bir satırda iki ünite ve iki konu alt alta yazılır;
    // satırlar kodlardaki ünite parçasına göre (FB.7.3.x → 3. ünite) sırayla eşleştirilir.
    const unitLines = squash(row.get("unit")?.[0] ?? "").split("\n").map(cleanName).filter(Boolean);
    const topicLines = topicNames(row, cleanName(row.get("unit")?.[0] ?? "") || "Genel");
    const codeGroups = [...new Set(codes.map((code) => unitPartOf(code, grade)))].map((part) =>
      codes.filter((code) => unitPartOf(code, grade) === part)
    );
    const assignments: { unitName: string; topics: string[]; codes: string[] }[] =
      unitLines.length > 1 && codeGroups.length === unitLines.length
        ? unitLines.map((unitName, i) => ({
            unitName,
            topics: topicLines.length === unitLines.length ? [topicLines[i]] : topicLines,
            codes: codeGroups[i],
          }))
        : // Tek ünitenin adı hücrede iki satıra kaydırılmış olabilir ("… DÜŞÜNME\nVE DEĞİŞİMLER").
          [{ unitName: cleanName(oneLine(row.get("unit")?.[0] ?? "")) || "Genel", topics: topicLines, codes }];

    for (const assignment of assignments) {
      const unitId = slug(assignment.unitName) || `unite-${units.length + 1}`;
      let unit = unitById.get(unitId);
      if (!unit) {
        unit = { id: unitId, name: assignment.unitName, topics: [] };
        unitById.set(unitId, unit);
        units.push(unit);
      }
      for (const name of assignment.topics) {
        const topicName = name === cleanName(row.get("unit")?.[0] ?? "") ? assignment.unitName : name;
        const topicId = `${unitId}--${slug(topicName)}`;
        let topic: CurriculumTopic | undefined = unit.topics.find((item) => item.id === topicId);
        if (!topic) {
          topic = { id: topicId, name: topicName, outcomeCodes: [] };
          unit.topics.push(topic);
        }
        topic.outcomeCodes = uniq([...topic.outcomeCodes, ...assignment.codes]);
      }
    }
  }

  repairTruncatedCodes(outcomes, units);

  for (const outcome of outcomes.values()) {
    if (!outcome.text) warnings.push(`${outcome.code}: metin bulunamadı`);
  }
  const subjectId = slug(subject);
  return {
    warnings,
    data: {
      id: `${subjectId}-${grade}`,
      subject,
      subjectId,
      grade,
      program,
      source: { file: fileName, sheet: sheet.name.trim() },
      units,
      outcomes: Object.fromEntries([...outcomes.entries()].sort(([a], [b]) => a.localeCompare(b, "tr", { numeric: true }))),
    },
  };
}

// ---------------------------------------------------------------- çalıştır

async function main() {
  const files = readdirSync(SOURCE_DIR).filter((file) => file.toLowerCase().endsWith(".xlsx") && !file.startsWith("~$"));
  rmSync(OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const parsed: SheetResult[] = [];
  for (const file of files) {
    const subject = detectSubject(file);
    if (!subject) {
      console.warn(`⚠ Ders adı algılanamadı, atlandı: ${file}`);
      continue;
    }
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(SOURCE_DIR, file));
    for (const sheet of workbook.worksheets) {
      const result = parseSheet(sheet, file.normalize("NFC"), subject);
      if (!result) {
        console.warn(`⚠ ${file} / "${sheet.name}": öğrenme çıktısı sütunu bulunamadı, atlandı.`);
        continue;
      }
      if (parsed.some((item) => item.data.id === result.data.id)) {
        console.warn(`⚠ ${result.data.id} birden fazla sekmede var; ilk sekme kullanıldı ("${sheet.name}" atlandı).`);
        continue;
      }
      parsed.push(result);
    }
  }

  normalizeTagLabels(parsed.map((item) => item.data));

  const index: CurriculumIndexEntry[] = [];
  for (const { data, warnings } of parsed) {
      const topicCount = data.units.reduce((sum, unit) => sum + unit.topics.length, 0);
      const outcomeCount = Object.keys(data.outcomes).length;
      writeFileSync(path.join(OUTPUT_DIR, `${data.id}.json`), `${JSON.stringify(data, null, 1)}\n`);
      index.push({
        id: data.id,
        subject: data.subject,
        subjectId: data.subjectId,
        grade: data.grade,
        program: data.program,
        unitCount: data.units.length,
        topicCount,
        outcomeCount,
      });
    console.log(
      `✓ ${data.id.padEnd(44)} ${data.program.padEnd(6)} ünite ${String(data.units.length).padStart(2)}  konu ${String(topicCount).padStart(3)}  çıktı ${String(outcomeCount).padStart(3)}` +
        (warnings.length ? `  (${warnings.length} uyarı: ${warnings.slice(0, 3).join("; ")})` : "")
    );
  }

  index.sort((a, b) => a.subject.localeCompare(b.subject, "tr") || a.grade - b.grade);
  writeFileSync(path.join(OUTPUT_DIR, "index.json"), `${JSON.stringify(index, null, 1)}\n`);

  // Sunucu tarafı kayıt: her JSON'u statik içe aktarır (Next.js paketleyicisi için açık yollar).
  const identifiers = index.map((entry) => `c_${entry.id.replace(/-/g, "_")}`);
  const registry = [
    "// Bu dosya scripts/parse-all-curricula.ts tarafından üretilir; elle düzenlemeyin.",
    'import type { CurriculumGradeData } from "@/types/curriculum";',
    "",
    ...index.map((entry, i) => `import ${identifiers[i]} from "./${entry.id}.json";`),
    "",
    "export const CURRICULUM_REGISTRY: Record<string, CurriculumGradeData> = {",
    ...index.map((entry, i) => `  "${entry.id}": ${identifiers[i]} as CurriculumGradeData,`),
    "};",
    "",
  ].join("\n");
  writeFileSync(path.join(OUTPUT_DIR, "registry.ts"), registry);
  console.log(`\n${index.length} sınıf düzeyi yazıldı → ${path.relative(ROOT, OUTPUT_DIR)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
