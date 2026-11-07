import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-sans", axes: ["wdth"] });

export const metadata: Metadata = {
  title: { default: "fintrace", template: "%s · fintrace" },
  description: "Personal envelope budgeting by pay cycle.",
};

export const viewport: Viewport = { themeColor: "#104f29" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
