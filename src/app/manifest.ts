import type { MetadataRoute } from "next";

/**
 * Manifesto PWA — permite instalar o OficinaPro na tela inicial (celular/desktop).
 * Next serve automaticamente em /manifest.webmanifest e injeta o <link>.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OficinaPro — Gestão de Oficinas",
    short_name: "OficinaPro",
    description:
      "Gestão completa de oficinas mecânicas: ordens de serviço, estoque, financeiro e agenda.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "pt-BR",
    background_color: "#0b0e14",
    theme_color: "#e9681c",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
