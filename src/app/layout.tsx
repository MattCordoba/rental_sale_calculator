import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rental Sale Calculator",
  description:
    "Compare your current rental to a new property and decide if a sale improves cash flow.",
  applicationName: "Rental Sale Calculator",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png" },
      { url: "/icons/icon-512.png" },
      { url: "/icons/icon-192-maskable.png", type: "image/png", sizes: "192x192", purpose: "maskable" },
      { url: "/icons/icon-512-maskable.png", type: "image/png", sizes: "512x512", purpose: "maskable" },
    ],
    apple: "/icons/icon-180.png",
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
      <body className={`${manrope.variable} ${spaceGrotesk.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
