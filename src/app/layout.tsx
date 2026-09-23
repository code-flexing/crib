import type { Metadata, Viewport } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import { NetworkMonitor } from "@/components/network/NetworkMonitor";
import { PWAProvider } from "@/components/pwa/PWAProvider";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SafeCrib",
  description:
    "SafeCrib is a student accommodation trust and verification platform, currently under development.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFFFFF",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${dmSans.variable}`}>
      <body className={`${dmSans.className} bg-safecrib-white font-sans text-safecrib-black antialiased`}>
        <PWAProvider>
          <Analytics />
          <NetworkMonitor />
          {children}
          <InstallPrompt />
        </PWAProvider>
      </body>
    </html>
  );
}
