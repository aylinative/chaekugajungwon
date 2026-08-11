import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 배포 도메인 확정 전까지 env로 주입(없으면 localhost). OG 이미지의 절대 URL 기준.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "책육아정원",
    template: "%s",
  },
  description: "○○개월 아이가 실제로 좋아한 그림책. 월령별 추천 커뮤니티.",
  openGraph: {
    type: "website",
    siteName: "책육아정원",
    title: "책육아정원",
    description: "○○개월 아이가 실제로 좋아한 그림책. 월령별 추천 커뮤니티.",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-text">{children}</body>
    </html>
  );
}
