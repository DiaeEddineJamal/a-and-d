import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Yurt Arcade",
  description: "A multiplayer arcade portal from Lmongolyan.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en"><body>{children}</body></html>
  );
}
