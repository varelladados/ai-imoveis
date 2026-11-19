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
      { src: "/icone.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icone-mascara.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
