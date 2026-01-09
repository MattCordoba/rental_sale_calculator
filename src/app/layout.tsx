import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rental Sale Calculator",
  description:
    "Compare your current rental to a new property and decide if a sale improves cash flow.",
  applicationName: "Rental Sale Calculator",
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
        {children}
      </body>
    </html>
  );
}
