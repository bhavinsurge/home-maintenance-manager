import type { Metadata } from "next";
import { Outfit, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Homestead Keep | Home Maintenance Manager",
  description:
    "Track household assets, warranties, recurring maintenance, and service history.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${sourceSans.variable} antialiased`}>
        <div
          style={
            {
              ["--font-display" as string]: "var(--font-outfit), sans-serif",
              ["--font-body" as string]: "var(--font-source), sans-serif",
            } as React.CSSProperties
          }
        >
          {children}
        </div>
      </body>
    </html>
  );
}
