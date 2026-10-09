import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, VT323 } from "next/font/google";
import "./globals.css";

// the A&D portal's type: Fraunces headings, IBM Plex Mono labels, VT323 for the LCD readouts
const serif = Fraunces({ subsets: ["latin"], axes: ["opsz"], variable: "--font-serif", display: "swap" });
const plex = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex", display: "swap" });
const term = VT323({ subsets: ["latin"], weight: "400", variable: "--font-term", display: "swap" });

export const metadata: Metadata = {
  title: "A&D Chefs",
  description: "A co-op cooking game for two: same screen, with a CPU chef, or online with a room code.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${serif.variable} ${plex.variable} ${term.variable}`}><body>{children}</body></html>
  );
}
