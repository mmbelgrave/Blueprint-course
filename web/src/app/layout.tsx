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

/*
 * Light or dark, decided before the first pixel is drawn. It has to run here,
 * ahead of everything, or the page would show light for a moment and then
 * blink to dark. Kept tiny and in one piece on purpose; the same rules, in
 * readable form, are in src/lib/theme.ts.
 */
const THEME_SCRIPT = `try{var c=localStorage.getItem("blueprint:theme");
if(c!=="light"&&c!=="dark"&&c!=="system")c="system";
var d=c==="dark"||(c==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);
if(d)document.documentElement.dataset.theme="dark";}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
