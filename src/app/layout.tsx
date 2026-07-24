import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/shared/components/providers";
import { PwaRegister } from "@/shared/components/pwa-register";
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
  title: {
    default: "OficinaPro — Gestão de Oficinas Mecânicas",
    template: "%s · OficinaPro",
  },
  description:
    "SaaS completo para gestão de oficinas mecânicas de carros e motos: ordens de serviço, estoque, financeiro, agenda e muito mais.",
  appleWebApp: {
    capable: true,
    title: "OficinaPro",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#e9681c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
          <PwaRegister />
        </Providers>
      </body>
    </html>
  );
}
