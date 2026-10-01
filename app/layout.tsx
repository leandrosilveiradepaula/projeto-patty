import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Projeto Patty",
  applicationName: "Corpo & Mente",
  description: "Aplicação web da Consultoria Corpo e Mente.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Corpo & Mente",
  },
  icons: {
    icon: {
      url: "/icon.svg",
      type: "image/svg+xml",
    },
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#003e1c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${plusJakartaSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
