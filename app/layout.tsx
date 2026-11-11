import type { Metadata } from "next";
import { Anton, Inter } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Requirements Studio",
  description:
    "Turn a rough product idea into requirements and a technical spec your team, or an AI coding tool, can build from. Send it straight to Azure DevOps.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${inter.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
