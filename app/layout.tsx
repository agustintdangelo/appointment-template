import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  DM_Sans,
  Fraunces,
  Inter,
  Lora,
  Manrope,
  Playfair_Display,
  Space_Grotesk,
} from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  fallback: ["Avenir Next", "Segoe UI", "Helvetica Neue", "sans-serif"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  fallback: ["Avenir Next", "Segoe UI", "Helvetica Neue", "sans-serif"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  fallback: ["Avenir Next", "Segoe UI", "Helvetica Neue", "sans-serif"],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  fallback: ["Avenir Next", "Segoe UI", "Helvetica Neue", "sans-serif"],
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
  fallback: ["Iowan Old Style", "Palatino Linotype", "Book Antiqua", "Georgia", "serif"],
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair-display",
  display: "swap",
  fallback: ["Iowan Old Style", "Palatino Linotype", "Book Antiqua", "Georgia", "serif"],
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant-garamond",
  display: "swap",
  weight: ["400", "500", "600", "700"],
  fallback: ["Iowan Old Style", "Palatino Linotype", "Book Antiqua", "Georgia", "serif"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  fallback: ["Iowan Old Style", "Palatino Linotype", "Book Antiqua", "Georgia", "serif"],
});

export const metadata: Metadata = {
  title: {
    default: "Appointment Template",
    template: "%s | Appointment Template",
  },
  description:
    "Reusable appointment-booking template for service businesses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`h-full antialiased ${inter.variable} ${manrope.variable} ${dmSans.variable} ${spaceGrotesk.variable} ${lora.variable} ${playfairDisplay.variable} ${cormorantGaramond.variable} ${fraunces.variable}`}
    >
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
