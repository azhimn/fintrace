import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "fintrace",
    short_name: "fintrace",
    description: "Personal envelope budgeting by pay cycle.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6f7fb",
    theme_color: "#ead3b5",
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Record",
        short_name: "Record",
        description: "Record a transaction",
        url: "/record",
        icons: [{ src: "/icons/record-96.png", sizes: "96x96", type: "image/png" }],
      },
    ],
  };
}
