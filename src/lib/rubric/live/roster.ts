import type { LiveStudent } from "@/lib/rubric/live/types";

const HEADER_WORDS = /^(s\.?\s?no|sıra|no|numara|öğrenci\s?no|okul\s?no|ad[ıi]?|soyad[ıi]?|ad[ıi]?\s?soyad[ıi]?|cinsiyet[i]?|sınıf[ı]?|şube)$/iu;
const GENDER = /^(kız|erkek|k|e)$/iu;
const NUMBER = /^\d{1,6}$/;

function titleCaseName(value: string): string {
  // e-Okul adları BÜYÜK HARFLE verir; okunaklılık için Türkçe kurallarıyla başlık biçimine çevrilir.
  if (/\p{Ll}/u.test(value)) return value;
  return value
    .toLocaleLowerCase("tr-TR")
    .split(" ")
    .map((word) => word.charAt(0).toLocaleUpperCase("tr-TR") + word.slice(1))
    .join(" ");
}

/**
 * e-Okul'dan veya Excel'den yapıştırılan sınıf listesini ayrıştırır.
 * Desteklenen satırlar: "Ahmet Yılmaz", "123 Ahmet Yılmaz", "Ahmet Yılmaz 123",
 * sekme/; /, ile ayrılmış sütunlar ("1⇥123⇥AHMET⇥YILMAZ⇥Erkek"). Başlık
 * satırları, cinsiyet sütunu ve boş satırlar atlanır; iki sayı varsa ilki
 * sıra no, ikincisi okul no kabul edilir. Aynı öğrenci iki kez eklenmez.
 */
export function parseRoster(text: string): LiveStudent[] {
  const students: LiveStudent[] = [];
  const seen = new Set<string>();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const tokens = (/[\t;]/.test(line) ? line.split(/[\t;]/) : line.includes(",") ? line.split(",") : line.split(/\s+/))
      .map((cell) => cell.trim())
      .filter(Boolean);
    if (tokens.every((token) => HEADER_WORDS.test(token) || GENDER.test(token))) continue; // başlık satırı

    const numbers = tokens.filter((token) => NUMBER.test(token));
    const nameParts = tokens.filter((token) => !NUMBER.test(token) && !GENDER.test(token) && !HEADER_WORDS.test(token));
    const name = titleCaseName(nameParts.join(" ").replace(/\s+/g, " ").trim());
    if (name.length < 2 || !/\p{L}/u.test(name)) continue;
    const no = numbers.length >= 2 ? numbers[1] : numbers[0];

    const key = `${no ?? ""}|${name.toLocaleLowerCase("tr-TR")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // Kimlik sıradan bağımsızdır: liste yeniden yapıştırılınca veya araya öğrenci eklenince puanlar eşleşmeye devam eder.
    students.push({ id: `st-${no ?? "x"}-${name.toLocaleLowerCase("tr-TR").replace(/\s+/g, "-")}`, name, ...(no ? { no } : {}) });
  }
  return students;
}
