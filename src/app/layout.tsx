import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HIBIKI",
  description: "ambient space for rest",
  metadataBase: new URL("https://hibiki.rest"),

  icons: {
    icon: "/favicon.png",
    apple: "/apple-icon.png",
  },

  openGraph: {
    title: "HIBIKI",
    description: "ambient space for rest",
    url: "https://hibiki.rest",
    siteName: "HIBIKI",
    images: [
      {
        url: "/ogp.png",
        width: 1200,
        height: 630,
        alt: "HIBIKI - ambient space for rest",
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "HIBIKI",
    description: "ambient space for rest",
    images: ["/ogp.png"],
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HIBIKI",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          name="apple-mobile-web-app-capable"
          content="yes"
        />

        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}