import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lmongolyan Chefs",
  description: "A co-op cooking game for two: same screen, with a CPU chef, or online with a room code.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en"><body>{children}</body></html>
  );
}
