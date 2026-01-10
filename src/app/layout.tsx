import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Lupin Real Estate Tools",
  description:
    "Decision-ready calculators for real estate planning, starting with the rental sale model.",
  applicationName: "Lupin Real Estate Tools",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/icons/icon-192.png" }, { url: "/icons/icon-512.png" }],
    apple: [{ url: "/icons/icon-180.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0f1a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
