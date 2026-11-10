import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk } from "next/font/google";
import { ServiceWorker } from "@/components/service-worker";
import { ScrollThumb } from "@/components/shell/scroll-thumb";
import { ThemeSync } from "@/components/theme";
import "./globals.css";

const hanken = Hanken_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "fintrace", template: "%s · fintrace" },
  description: "Personal envelope budgeting by pay cycle.",
  appleWebApp: { title: "fintrace", statusBarStyle: "default" },
};

// Kraft, so the browser bar continues the band. resizes-content keeps the Save buttons above the
// keyboard on Android.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ead3b5" },
    { media: "(prefers-color-scheme: dark)", color: "#4a3d2f" },
  ],
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

// Runs while the HTML parses, so a theme chosen in Settings applies before first paint.
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${hanken.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <ScrollThumb />
        <ThemeSync />
        <ServiceWorker />
      </body>
    </html>
  );
}
