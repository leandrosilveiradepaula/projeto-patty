import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Corpo & Mente",
    short_name: "Corpo&Mente",
    description:
      "Aplicativo da Consultoria Corpo e Mente para acompanhamento de clientes.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#effcf9",
    theme_color: "#003e1c",
    lang: "pt-BR",
    icons: [
      {
        src: "/pwa/icon-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/maskable-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
