import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import SkyBackground from "./components/SkyBackground";
import HeadingDecoder from "./components/HeadingDecoder";
import AceMark from "./components/AceMark";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
  fallback: ["Inter", "ui-sans-serif", "sans-serif"],
});

const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
  fallback: ["ui-sans-serif", "-apple-system", "sans-serif"],
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const metadata: Metadata = {
  title: "Team ACE — OD Tracker",
  description: "On-Duty request tracker for Team ACE, VIT Vellore.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#030405",
  colorScheme: "dark",
};

// Runs before first paint: play the ACE intro once per browser session
// (and never under reduced motion). See AceMark.tsx.
const introScript = `try{if(!sessionStorage.getItem("aceIntro")&&!matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.setAttribute("data-ace-intro","");sessionStorage.setItem("aceIntro","1")}}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: introScript }} />
      </head>
      <body>
        <SkyBackground />
        <AceMark />
        <HeadingDecoder />
        {children}
      </body>
    </html>
  );
}
