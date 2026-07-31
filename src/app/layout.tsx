import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppTitleProvider from "@/lib/AppTitleContext";
import { getAppTitle } from "@/lib/appSettings";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: await getAppTitle(),
    description: "A modular tracking system for small learning communities",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appTitle = await getAppTitle();
  return (
    <html lang="id">
      <body className={inter.variable + " font-sans bg-metro-bg text-metro-text"}>
        <AppTitleProvider title={appTitle}>{children}</AppTitleProvider>
      </body>
    </html>
  );
}
