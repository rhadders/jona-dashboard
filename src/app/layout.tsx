import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

// Jona design system: Jost voor de interface, Lora voor de koppen. Self-hosted
// via next/font/local: de woff2-bestanden staan in ./fonts (uit Fontsource, SIL
// OFL), zodat de build niet van Google Fonts afhangt. Per Unicode-subset één
// familie; `tailwind.config.ts` zet ze achter elkaar, zodat de browser per
// teken terugvalt op de volgende.
const jost = localFont({
  src: "./fonts/jost-latin-wght-normal.woff2",
  weight: "400 600",
  variable: "--font-sans",
  adjustFontFallback: false,
});
const jostExt = localFont({
  src: "./fonts/jost-latin-ext-wght-normal.woff2",
  weight: "400 600",
  variable: "--font-sans-ext",
  preload: false,
});
const lora = localFont({
  src: [
    { path: "./fonts/lora-latin-wght-normal.woff2", weight: "400 500", style: "normal" },
    { path: "./fonts/lora-latin-wght-italic.woff2", weight: "400 500", style: "italic" },
  ],
  variable: "--font-serif",
  adjustFontFallback: false,
});
const loraExt = localFont({
  src: [
    { path: "./fonts/lora-latin-ext-wght-normal.woff2", weight: "400 500", style: "normal" },
    { path: "./fonts/lora-latin-ext-wght-italic.woff2", weight: "400 500", style: "italic" },
  ],
  variable: "--font-serif-ext",
  preload: false,
});
const fontVariables = [jost, jostExt, lora, loraExt].map((font) => font.variable).join(" ");

export const metadata: Metadata = {
  title: { default: "Jona Dashboard", template: "%s · Jona Dashboard" },
  description: "Omzet, gebruik en gezondheid van de Jona-tools op één plek",
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }] },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#04202f" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <body className={`${fontVariables} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="jona-dashboard-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
