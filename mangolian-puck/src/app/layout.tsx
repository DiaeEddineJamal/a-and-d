import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mangolian Puck",
  description: "Air hockey for two: same screen, against the CPU, or online with a room code.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en"><body>{children}</body></html>
  );
}
