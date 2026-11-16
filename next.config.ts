import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  // 아이폰 유니버설 링크 확인 파일 — 애플이 읽는 고정 주소를 API로 연결 (src/app/api/apple-app-site-association)
  async rewrites() {
    return [
      {
        source: "/.well-known/apple-app-site-association",
        destination: "/api/apple-app-site-association",
      },
    ];
  },
};

export default nextConfig;
