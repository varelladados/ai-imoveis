import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AÍ! Imóveis",
    short_name: "AÍ! Imóveis",
    description: "Seu buscador definitivo de imóveis.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f5ef",
    theme_color: "#0e6b4f",
    lang: "pt-BR",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icone.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icone-mascara-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icone-mascara.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
