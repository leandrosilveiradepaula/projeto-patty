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
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/maskable-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
