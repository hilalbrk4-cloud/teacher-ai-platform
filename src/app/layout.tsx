import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { TooltipProvider } from "@/components/ui/tooltip";
import { defaultLocale } from "@/lib/i18n/config";
import { LocaleProvider } from "@/lib/i18n/locale-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EduPilot | Öğretmenler için Yapay Zekâ Çalışma Alanı",
  description:
    "Öğretmenlerin ders planlama, değerlendirme ve iletişimde zaman kazanmasını sağlayan yapay zekâ destekli çalışma alanı.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={defaultLocale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <LocaleProvider locale={defaultLocale}>
          <TooltipProvider>{children}</TooltipProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
