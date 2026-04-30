import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";

import { cookies } from "next/headers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Balcão Rápido",
  description: "Sistema de vendas de alta performance",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const theme = cookieStore.get('accessibility_settings')?.value || 'dark';
  const themeClass = theme === 'sunlight' ? 'sunlight-mode' : '';

  return (
    <html lang="pt-BR" className={themeClass}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased ${themeClass}`}>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
