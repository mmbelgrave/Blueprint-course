import type { Metadata } from "next";
import { Hanken_Grotesk, Newsreader } from "next/font/google";
import { AppProvider } from "@/lib/app-state";
import "./globals.css";

// Brand type: Newsreader for meaning, Hanken Grotesk for mechanics.
const body = Hanken_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
const display = Newsreader({
  variable: "--font-display-face",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "The Made Real Blueprint — Portugal Edition",
  description: "Make a clear picture of the life you really want, with an AI partner next to you.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
