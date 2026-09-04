// iOS PWA 네이티브 실행 스플래시 — apple-touch-startup-image.
// iOS는 홈 화면 앱 실행 시 이 이미지를 그대로 보여준다(HTML 렌더 전). 기기 해상도별 <link>가 필요.
// 이미지는 public/splash/에 생성(scripts로 sharp 렌더): 크림 배경 + 로고 + '책육아정원'.
// Android는 manifest short_name으로 이름이 자동 노출되므로 별도 이미지 불필요.
// React가 <link>를 <head>로 hoist한다.

// [cssW, cssH, dpr] 세로(portrait) — public/splash 생성 스크립트와 동일 목록
const DEVICES: [number, number, number][] = [
  [320, 568, 2],
  [375, 667, 2],
  [414, 736, 3],
  [375, 812, 3],
  [414, 896, 2],
  [414, 896, 3],
  [390, 844, 3],
  [428, 926, 3],
  [393, 852, 3],
  [430, 932, 3],
  [402, 874, 3],
  [440, 956, 3],
]

export default function AppleSplashLinks() {
  return (
    <>
      {DEVICES.map(([cw, ch, dpr]) => {
        const w = cw * dpr
        const h = ch * dpr
        const media = `(device-width: ${cw}px) and (device-height: ${ch}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`
        return (
          <link
            key={`${w}x${h}`}
            rel="apple-touch-startup-image"
            media={media}
            href={`/splash/apple-splash-${w}-${h}.png`}
          />
        )
      })}
    </>
  )
}
