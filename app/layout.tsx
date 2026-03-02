import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Map Poster",
  description: "Generate beautiful map posters of any city",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
