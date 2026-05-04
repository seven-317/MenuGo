import type { Metadata } from "next";
import { Geist_Mono, Karla, Playfair_Display_SC } from "next/font/google";
import "./globals.css";

const karla = Karla({
  subsets: ["latin"],
  variable: "--font-menu-body",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const playfair = Playfair_Display_SC({
  subsets: ["latin"],
  variable: "--font-menu-display",
  weight: ["400", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-menu-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "MenuGo",
    template: "%s · MenuGo",
  },
  description:
    "餐廳 QR Code 線上點餐練習專題：掃碼瀏覽菜單、匿名下單，店家即時接單。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-Hant"
      className={`${karla.variable} ${playfair.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className={`${karla.className} min-h-full flex flex-col`}>
        {children}
      </body>
    </html>
  );
}
