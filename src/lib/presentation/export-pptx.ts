import type { Presentation, Slide, SlideIcon, SlideImage } from "@/types/presentation";

/** PowerPoint'te lucide ikonları yerine aynı anlamdaki emoji kullanılır. */
const ICON_EMOJI: Record<SlideIcon, string> = {
  microscope: "🔬",
  leaf: "🌿",
  flask: "🧪",
  atom: "⚛️",
  sun: "☀️",
  globe: "🌍",
  lightbulb: "💡",
  users: "👥",
  book: "📘",
  calculator: "🧮",
  ruler: "📏",
  map: "🗺️",
  landmark: "🏛️",
  music: "🎵",
  heart: "❤️",
  question: "❓",
  target: "🎯",
  puzzle: "🧩",
  zap: "⚡",
  droplet: "💧",
};

const W = 13.333;
const H = 7.5;
const FONT = "Segoe UI";
const INK = "0F172A";
const MUTED = "475569";
const ACCENT = "6366F1";

export function presentationFileName(presentation: Pick<Presentation, "subject" | "topic">): string {
  const part = (value: string) => value.trim().replace(/[\\/:*?"<>|.]+/g, "").replace(/\s+/g, "_") || "Ders";
  return `${part(presentation.subject)}_${part(presentation.topic)}_Sunum.pptx`;
}

/**
 * WebP/AVIF gibi biçimleri JPEG'e çevirir: eski PowerPoint sürümleri (2016/2019, okullarda yaygın)
 * WebP gösteremez ve Wikimedia tarayıcıya çoğu küçük resmi WebP olarak gönderir.
 */
async function toJpegBlob(blob: Blob): Promise<Blob> {
  if (blob.type === "image/jpeg" || blob.type === "image/png") return blob;
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (!context) return blob;
  context.fillStyle = "#ffffff"; // saydam şemalar beyaz zeminde kalsın
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return new Promise((resolve) => canvas.toBlob((jpeg) => resolve(jpeg ?? blob), "image/jpeg", 0.9));
}

async function toDataUrl(url: string): Promise<string | undefined> {
  try {
    const response = await fetch(url, { referrerPolicy: "no-referrer" });
    if (!response.ok) return undefined;
    const blob = await toJpegBlob(await response.blob());
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : undefined);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

/** Görseli kutuya oranını bozmadan sığdırır (PowerPoint görseli kırpmaz). */
function fit(image: SlideImage, box: { x: number; y: number; w: number; h: number }) {
  const ratio = image.width / image.height || 16 / 9;
  let w = box.w;
  let h = w / ratio;
  if (h > box.h) {
    h = box.h;
    w = h * ratio;
  }
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}

function notesFor(slide: Slide, image: SlideImage | undefined, outcomes: Map<string, string>): string {
  return [
    `Öğretmen sorusu: ${slide.teacherNote}`,
    slide.activityPrompt ? `Etkinlik (2 dk): ${slide.activityPrompt}` : undefined,
    slide.outcomeCodes.length > 0 ? `Öğrenme çıktısı: ${slide.outcomeCodes.map((code) => `${code} ${outcomes.get(code) ?? ""}`.trim()).join("; ")}` : undefined,
    image ? `Görsel: ${image.credit.author} · ${image.credit.license} · ${image.credit.pageUrl}` : `Görsel arama terimi: ${slide.visual.searchKeyword}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Sunumu PowerPoint olarak indirir (tarayıcıda). Seçili görseller gömülür;
 * öğretmen sorusu, etkinlik ve kaynak bilgisi konuşmacı notlarına yazılır.
 * pptxgenjs yalnızca düğmeye basıldığında yüklenir.
 */
export async function downloadPresentationPptx(
  presentation: Presentation,
  imageFor: (slideNumber: number) => SlideImage | undefined
): Promise<string> {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = presentation.title;
  pptx.subject = `${presentation.subject} · ${presentation.gradeLevel} · ${presentation.topic}`;
  pptx.company = "EduPilot";
  const outcomes = new Map(presentation.curriculum?.outcomes.map((outcome) => [outcome.code, outcome.text]) ?? []);

  const images = await Promise.all(
    presentation.slides.map(async (slide) => {
      const image = imageFor(slide.slideNumber);
      return image ? { image, data: await toDataUrl(image.url) } : undefined;
    })
  );

  presentation.slides.forEach((slide, index) => {
    const s = pptx.addSlide();
    const picked = images[index];
    const image = picked?.data ? picked.image : undefined;
    s.addNotes(notesFor(slide, image, outcomes));

    const credit = (box: { x: number; y: number; w: number; h: number }, dark: boolean) => {
      if (!image) return;
      s.addText(`Görsel: ${image.credit.author} · ${image.credit.license}`, {
        x: box.x + 0.1, y: box.y + box.h - 0.32, w: box.w - 0.2, h: 0.28,
        fontFace: FONT, fontSize: 8, color: dark ? "E2E8F0" : MUTED, align: "right",
      });
    };
    const visual = (box: { x: number; y: number; w: number; h: number }, background: string) => {
      s.addShape(pptx.ShapeType.rect, { ...box, fill: { color: background }, line: { color: background } });
      if (image && picked?.data) {
        s.addImage({ data: picked.data, ...fit(image, { x: box.x + 0.15, y: box.y + 0.15, w: box.w - 0.3, h: box.h - 0.3 }) });
      } else {
        const size = Math.min(box.w, box.h) * 0.42;
        s.addShape(pptx.ShapeType.ellipse, {
          x: box.x + (box.w - size) / 2, y: box.y + (box.h - size) / 2 - 0.3, w: size, h: size,
          fill: { color: ACCENT }, line: { color: ACCENT },
        });
        s.addText(ICON_EMOJI[slide.visual.icon], {
          x: box.x + (box.w - size) / 2, y: box.y + (box.h - size) / 2 - 0.3, w: size, h: size,
          fontSize: Math.round(size * 30), align: "center", valign: "middle",
        });
      }
    };
    const bullets = (box: { x: number; y: number; w: number; h: number }, color: string, fontSize = 20) => {
      if (slide.bullets.length === 0) return;
      s.addText(
        slide.bullets.map((bullet) => ({ text: bullet, options: { bullet: { indent: 18 }, paraSpaceAfter: 10 } })),
        { ...box, fontFace: FONT, fontSize, color, valign: "top" }
      );
    };
    const caption = (box: { x: number; y: number; w: number; h: number }, dark: boolean) =>
      s.addText(`❓ ${slide.visual.caption}`, {
        ...box, fontFace: FONT, fontSize: 14, bold: true, color: dark ? "FFFFFF" : INK, valign: "middle",
        fill: { color: dark ? "0F172A" : "FFFFFF", transparency: dark ? 35 : 10 }, margin: 8,
      });
    const footer = () =>
      s.addText(`${slide.slideNumber} / ${presentation.slides.length}`, {
        x: W - 1.3, y: H - 0.45, w: 1.1, h: 0.3, fontFace: FONT, fontSize: 9, color: "94A3B8", align: "right",
      });

    if (slide.layout === "hero-visual") {
      s.background = { color: INK };
      visual({ x: 0, y: 0, w: W, h: H }, INK);
      s.addShape(pptx.ShapeType.rect, { x: 0, y: H * 0.5, w: W, h: H * 0.5, fill: { color: INK, transparency: 25 }, line: { color: INK, transparency: 100 } });
      s.addText(`${presentation.subject} · ${presentation.gradeLevel}`.toLocaleUpperCase("tr-TR"), {
        x: 0.6, y: H * 0.5 + 0.25, w: 8, h: 0.4, fontFace: FONT, fontSize: 12, bold: true, color: "CBD5E1", charSpacing: 2,
      });
      s.addText(slide.title, { x: 0.6, y: H * 0.5 + 0.65, w: 11, h: 1.3, fontFace: FONT, fontSize: 44, bold: true, color: "FFFFFF", valign: "middle" });
      caption({ x: 0.6, y: H * 0.5 + 2.05, w: 9, h: 0.6 }, true);
      bullets({ x: 0.6, y: H * 0.5 + 2.75, w: 11, h: 0.6 }, "E2E8F0", 16);
      credit({ x: 0, y: 0, w: W, h: H }, true);
      return;
    }

    if (slide.layout === "activity-timer") {
      s.background = { color: "FFFBEB" };
      s.addText("⏱ 2 dakikalık görev", {
        x: 0.6, y: 0.6, w: 3.2, h: 0.5, fontFace: FONT, fontSize: 14, bold: true, color: INK,
        fill: { color: "FBBF24" }, align: "center", valign: "middle", rectRadius: 0.25, shape: pptx.ShapeType.roundRect,
      });
      s.addText(slide.title, { x: 0.6, y: 1.3, w: 7.8, h: 1.2, fontFace: FONT, fontSize: 34, bold: true, color: INK, valign: "middle" });
      s.addText(slide.activityPrompt ?? "", {
        x: 0.6, y: 2.7, w: 7.8, h: 2.2, fontFace: FONT, fontSize: 22, bold: true, color: INK, valign: "middle",
        fill: { color: "FFFFFF" }, line: { color: "E2E8F0" }, margin: 14, rectRadius: 0.2, shape: pptx.ShapeType.roundRect,
      });
      bullets({ x: 0.6, y: 5.1, w: 7.8, h: 1.8 }, MUTED, 18);
      s.addShape(pptx.ShapeType.ellipse, { x: 9.2, y: 1.9, w: 3.2, h: 3.2, fill: { color: "FFFFFF" }, line: { color: "F59E0B", width: 8 } });
      s.addText("2:00", { x: 9.2, y: 1.9, w: 3.2, h: 3.2, fontFace: FONT, fontSize: 54, bold: true, color: INK, align: "center", valign: "middle" });
      s.addText(ICON_EMOJI[slide.visual.icon], { x: 10.2, y: 5.4, w: 1.2, h: 1, fontSize: 40, align: "center" });
      footer();
      return;
    }

    // split-right-image / split-left-image
    s.background = { color: "FFFFFF" };
    const imageLeft = slide.layout === "split-left-image";
    const textBox = { x: imageLeft ? W * 0.46 + 0.6 : 0.6, w: W * 0.54 - 1.2 };
    const imageBox = { x: imageLeft ? 0 : W * 0.54, y: 0, w: W * 0.46, h: H };
    s.addShape(pptx.ShapeType.rect, { x: textBox.x, y: 0.9, w: 0.9, h: 0.09, fill: { color: ACCENT }, line: { color: ACCENT } });
    s.addText(slide.title, { x: textBox.x, y: 1.2, w: textBox.w, h: 1.5, fontFace: FONT, fontSize: 34, bold: true, color: INK, valign: "middle" });
    bullets({ x: textBox.x, y: 3.0, w: textBox.w, h: 3.6 }, "334155", 22);
    visual(imageBox, slide.visual.type === "diagram_placeholder" ? "FFFFFF" : "F1F5F9");
    caption({ x: imageBox.x + 0.3, y: H - 1.35, w: imageBox.w - 0.6, h: 0.65 }, false);
    credit(imageBox, false);
    footer();
  });

  const fileName = presentationFileName(presentation);
  await pptx.writeFile({ fileName });
  return fileName;
}
