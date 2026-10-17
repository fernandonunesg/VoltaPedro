import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pedro Dias: Vai Chegar Quando? — O bolão oficial do atraso",
  description: "Crie um evento, compartilhe o link e deixe a galera apostar: o Pedro vai chegar no horário ou 4h depois? Bolão satírico e em tempo real.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FBBF24",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-amber-50 text-stone-900 antialiased font-sans">{children}</body>
    </html>
  );
}
