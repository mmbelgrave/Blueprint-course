import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppProvider } from "@/lib/app-state";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "The Made Real Blueprint — Portugal Edition",
  description: "Make a clear picture of the life you really want, with an AI partner next to you.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
