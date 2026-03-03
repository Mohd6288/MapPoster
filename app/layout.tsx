import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MapToPoster by Mohammed Alkhalifa",
  description:
    "Create beautiful, high-resolution map posters of any city in the world. A project by Mohammed Alkhalifa from Dammam, Saudi Arabia.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
