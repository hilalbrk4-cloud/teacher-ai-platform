/**
 * Server-only. Slayt görseli arama: Unsplash (UNSPLASH_ACCESS_KEY varsa,
 * fotoğraflar için) → Wikimedia Commons (anahtarsız, lisanslı, atıflı).
 * Unsplash Source (anahtarsız rastgele görsel) servisi kapatıldığı için
 * kullanılmaz. Sonuçlar bellekte önbelleğe alınır.
 */
import { getUnsplashAccessKey } from "@/lib/ai/config";
import type { SlideImage, SlideVisualType } from "@/types/presentation";

const USER_AGENT = "EduPilot/0.1 (educational slide preview; server-side image search)";
const TIMEOUT_MS = 8_000;
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_LIMIT = 300;
/** Okul ortamı için kaba güvenlik süzgeci (başlık/açıklama). */
const BLOCKLIST = /\b(nude|naked|nudity|sex|sexual|porn|erotic|corpse|gore|genital|breast|lingerie|bikini)\b/i;

/** Görseli ayırt etmeyen genel kelimeler (ilgililik puanına katılmaz). */
const GENERIC_TERMS = new Set(["diagram", "labeled", "labelled", "photo", "image", "close", "picture", "illustration", "the", "and", "with"]);

/** Taranmış kitap/dergi sayfaları (Internet Archive aktarımları): slayt görseli olarak uygun değil. */
const SCANNED_PAGE = /journal|bulletin|catalogue|catalog|annual report|proceedings|transactions|\(\d{8,}\)|thumbnail\.jpg/i;

const cache = new Map<string, { at: number; images: SlideImage[] }>();

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

async function fetchJson(url: string, headers: Record<string, string>): Promise<unknown> {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

interface CommonsPage {
  title?: string;
  index?: number;
  imageinfo?: {
    thumburl?: string;
    thumbwidth?: number;
    thumbheight?: number;
    width?: number;
    mime?: string;
    descriptionurl?: string;
    extmetadata?: Record<string, { value?: string }>;
  }[];
}

async function searchCommons(keyword: string, fileType: "bitmap" | "drawing"): Promise<SlideImage[]> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: `${keyword} filetype:${fileType}`,
    gsrnamespace: "6",
    gsrlimit: "20",
    prop: "imageinfo",
    iiprop: "url|mime|size|extmetadata",
    iiurlwidth: "1280",
    origin: "*",
  });
  const data = (await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`, { "User-Agent": USER_AGENT })) as {
    query?: { pages?: Record<string, CommonsPage> };
  };
  // Etiketli şemalarda dil sırası: Türkçe (…_tr.svg) > İngilizce/dilsiz > diğer diller (…_fr, _uk…).
  const languageRank = (title = "") => {
    const lang = /[_\- ]([a-z]{2})(?:[_\- ]\d+)?\.(?:svg|png|jpe?g)$/i.exec(title)?.[1]?.toLowerCase();
    return lang === "tr" ? 0 : !lang || lang === "en" ? 1 : 2;
  };
  // İlgililik: arama teriminin içerik kelimeleri dosya adında (2 puan) ve açıklamada (1 puan) aranır;
  // hiç eşleşmeyen sonuçlar (Commons aramasının gevşek eşleşmeleri) elenir.
  const terms = keyword.split(" ").filter((term) => term.length >= 3 && !GENERIC_TERMS.has(term));
  // Üç ve daha fazla içerik kelimesinde en az ikisi eşleşmeli ("Tumor_Cells" gibi tek kelimelik rastlantıları eler).
  const minHits = terms.length >= 3 ? 2 : 1;
  const relevance = (page: CommonsPage) => {
    const title = (page.title ?? "").toLowerCase().replace(/[_\-.]/g, " ");
    const description = stripHtml(page.imageinfo?.[0]?.extmetadata?.ImageDescription?.value ?? "").toLowerCase();
    let score = 0;
    let hits = 0;
    for (const term of terms) {
      const points = title.includes(term) ? 2 : description.includes(term) ? 1 : 0;
      score += points;
      if (points > 0) hits += 1;
    }
    return { score, hits };
  };
  const pages = Object.values(data.query?.pages ?? {})
    .filter((page) => !SCANNED_PAGE.test(page.title ?? ""))
    .map((page) => ({ page, ...relevance(page) }))
    .filter(({ hits }) => terms.length === 0 || hits >= minHits)
    .sort((a, b) => b.score - a.score || languageRank(a.page.title) - languageRank(b.page.title) || (a.page.index ?? 0) - (b.page.index ?? 0))
    .map(({ page }) => page);
  const images: SlideImage[] = [];
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info?.thumburl || !info.mime) continue;
    if (!/^image\/(jpeg|png|svg\+xml)$/.test(info.mime)) continue;
    if (info.mime !== "image/svg+xml" && (info.width ?? 0) < 600) continue;
    const description = stripHtml(info.extmetadata?.ImageDescription?.value ?? "");
    if (BLOCKLIST.test(`${page.title ?? ""} ${description}`)) continue;
    images.push({
      url: info.thumburl,
      width: info.thumbwidth ?? 1280,
      height: info.thumbheight ?? 720,
      source: "wikimedia",
      credit: {
        author: stripHtml(info.extmetadata?.Artist?.value ?? "Wikimedia Commons").slice(0, 80) || "Wikimedia Commons",
        // Lisans alanı boş gelebilir; atıfta her zaman bir kaynak adı görünsün.
        license: stripHtml(info.extmetadata?.LicenseShortName?.value ?? "") || "Wikimedia Commons",
        pageUrl: info.descriptionurl ?? "https://commons.wikimedia.org",
      },
    });
    if (images.length >= 6) break;
  }
  return images;
}

async function searchUnsplash(keyword: string, accessKey: string): Promise<SlideImage[]> {
  const params = new URLSearchParams({ query: keyword, per_page: "6", orientation: "landscape", content_filter: "high" });
  const data = (await fetchJson(`https://api.unsplash.com/search/photos?${params}`, {
    Authorization: `Client-ID ${accessKey}`,
    "Accept-Version": "v1",
  })) as { results?: { width: number; height: number; urls: { regular: string }; links: { html: string }; user: { name: string } }[] };
  return (data.results ?? []).map((photo) => ({
    url: photo.urls.regular,
    width: photo.width,
    height: photo.height,
    source: "unsplash" as const,
    credit: { author: photo.user.name, license: "Unsplash License", pageUrl: `${photo.links.html}?utm_source=edupilot&utm_medium=referral` },
  }));
}

/** Slayt görsel adayları (en fazla 6). İkon slaytlarında görsel aranmaz. */
export async function searchSlideImages(keyword: string, type: SlideVisualType): Promise<SlideImage[]> {
  if (type === "icon_badge") return [];
  const cacheKey = `${type}:${keyword}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.images;

  let images: SlideImage[] = [];
  const unsplashKey = getUnsplashAccessKey();
  try {
    if (type === "photo" && unsplashKey) images = await searchUnsplash(keyword, unsplashKey);
    if (images.length === 0) images = await searchCommons(keyword, type === "diagram_placeholder" ? "drawing" : "bitmap");
    // Şema bulunamazsa fotoğraf, fotoğraf bulunamazsa kısaltılmış terimle bir kez daha denenir.
    if (images.length === 0 && type === "diagram_placeholder") images = await searchCommons(keyword, "bitmap");
    if (images.length === 0 && keyword.split(" ").length > 2) {
      images = await searchCommons(keyword.split(" ").slice(0, 2).join(" "), type === "diagram_placeholder" ? "drawing" : "bitmap");
    }
  } catch (error) {
    console.warn(`[EduPilot] Slide image search failed for "${keyword}":`, error instanceof Error ? error.message : error);
    return [];
  }
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
  cache.set(cacheKey, { at: Date.now(), images });
  return images;
}
