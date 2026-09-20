import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { InitialPageLoader } from "@/components/loading/InitialPageLoader";
import { NetworkMonitor } from "@/components/network/NetworkMonitor";
import { PWAProvider } from "@/components/pwa/PWAProvider";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
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
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="bg-safecrib-white font-sans text-safecrib-black antialiased">
        <PWAProvider>
          <InitialPageLoader />
          <NetworkMonitor />
          {children}
          <InstallPrompt />
        </PWAProvider>
      </body>
    </html>
  );
}
