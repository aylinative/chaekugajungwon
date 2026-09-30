import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Splash from "@/components/Splash";
import AppleSplashLinks from "@/components/AppleSplashLinks";

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

// 사이트 대표 설명 — meta description·OG·JSON-LD 공용(단일 소스).
const siteDescription =
  "우리 아이가 진짜 좋아한 그림책을 월령·연령별로 기록하고 아이가 좋아할 그림책을 추천받는 커뮤니티. 전집 말고 단행본 한 권도 충분한 책육아.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "책육아정원",
    template: "%s",
  },
  description: siteDescription,
  openGraph: {
    type: "website",
    siteName: "책육아정원",
    title: "책육아정원",
    description: siteDescription,
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
  },
  // iOS 홈 화면 앱(standalone) — 상태바 스타일·앱 이름, 전화번호 자동링크 비활성
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "책육아정원",
  },
  formatDetection: { telephone: false },
  // manifest는 app/manifest.ts가 자동으로 <link rel="manifest"> 주입 (중복 방지 위해 수동 추가 안 함)
};

// 뷰포트 — iOS 입력 포커스 줌 방지(maximumScale=1) + 핀치줌/페이지 밀림 방지(userScalable=false),
// 노치까지 꽉 채움(viewportFit=cover), 브라우저 테마색(포인트 컬러).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#E08F5B",
};

// 구조화 데이터(JSON-LD) — '책육아정원 = 이 웹서비스'임을 검색엔진·AI에 명시(엔티티 통합).
// 신생 도메인이라 이름 검색 시 옛 SNS 모임 글로 요약되는 것을 새 서비스로 학습시키는 신호.
// ※ sameAs(공식 SNS 프로필 URL)는 확보 시 Organization에 추가하면 엔티티 연결이 더 강해짐.
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "책육아정원",
    url: siteUrl,
    description: siteDescription,
    inLanguage: "ko-KR",
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "책육아정원",
    url: siteUrl,
    logo: `${siteUrl}/icon-512.png`,
    description: siteDescription,
    // 공식 SNS — '이 계정 = 책육아정원(서비스)' 엔티티 연결(옛 모임 글과 서비스 통합 신호)
    sameAs: ["https://www.threads.com/@bookstore.workingmom"],
  },
];

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
      <body className="min-h-full bg-bg text-text">
        {/* 검색엔진용 구조화 데이터 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* iOS PWA(설치형) 네이티브 실행 스플래시(로고+서비스명 이미지) — React가 <head>로 hoist */}
        <AppleSplashLinks />
        {/* 인앱 스플래시 — 브라우저 접속의 로딩 화면(설치형 PWA는 네이티브가 있어 Splash가 스스로 생략) */}
        <Splash />
        {/* 모바일 웹 — 콘텐츠 영역을 430px로 제한하고 가운데 정렬(넓은 화면에서 폰 폭 유지) */}
        <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
