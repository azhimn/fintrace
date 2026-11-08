import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk } from "next/font/google";
import { ServiceWorker } from "@/components/service-worker";
import { ScrollThumb } from "@/components/shell/scroll-thumb";
import "./globals.css";

const hanken = Hanken_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "fintrace", template: "%s · fintrace" },
  description: "Personal envelope budgeting by pay cycle.",
  appleWebApp: { title: "fintrace", statusBarStyle: "default" },
};

// Kraft, so the browser bar continues the band. resizes-content keeps the Save buttons above the
// keyboard on Android.
export const viewport: Viewport = { themeColor: "#ead3b5", viewportFit: "cover", interactiveWidget: "resizes-content" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${hanken.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <ScrollThumb />
        <ServiceWorker />
      </body>
    </html>
  );
}
