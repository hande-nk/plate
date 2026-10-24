import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";


export const metadata: Metadata = {
  title: "Plate",
  description: "A progress-first food journal for the Tufts meal plan.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Plate", statusBarStyle: "default" },
};

export const viewport: Viewport = { viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistSans.variable}>
        <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
