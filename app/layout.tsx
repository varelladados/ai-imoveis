import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AÍ! Imóveis",
  description: "Seu buscador definitivo de imóveis. Conte o que procura e a busca se ajusta na conversa.",
  icons: { icon: [{ url: "/icone.svg", type: "image/svg+xml" }, { url: "/icone-192.png", sizes: "192x192", type: "image/png" }], apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }] },
  appleWebApp: { capable: true, title: "AÍ! Imóveis", statusBarStyle: "default" },
};
export const viewport: Viewport = {
  width: "device-width", initialScale: 1,
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f7f5ef" }, { media: "(prefers-color-scheme: dark)", color: "#121714" }],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body><div className="moldura">{children}</div></body>
    </html>
  );
}
