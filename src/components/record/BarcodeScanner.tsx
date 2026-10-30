'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// 책 뒤표지 바코드(EAN-13 = ISBN13, 978/979로 시작) 스캔 — 기록하기 책 검색용 (2026.10.30)
// - 브라우저에 바코드 인식 기능(BarcodeDetector)이 있으면 그걸 쓰고(안드로이드 크롬·삼성 인터넷),
//   없으면(아이폰 사파리 등) barcode-detector 라이브러리(ZXing wasm)로 대신 읽는다. 라이브러리는 이 화면을 열 때만 불러옴.
// - wasm은 외부 CDN이 아니라 우리 사이트(/zxing/)에서 내려준다 (scripts/copy-zxing-wasm.mjs)
// - 카메라는 HTTPS에서만 동작(로컬 localhost는 예외)

interface Detector {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>
}

const ISBN_RE = /^97[89]\d{10}$/
const SCAN_INTERVAL_MS = 200

async function createDetector(): Promise<Detector> {
  const Native = (globalThis as { BarcodeDetector?: { new (o: { formats: string[] }): Detector; getSupportedFormats?: () => Promise<string[]> } }).BarcodeDetector
  if (Native) {
    const formats = (await Native.getSupportedFormats?.().catch(() => [])) ?? []
    if (formats.includes('ean_13')) return new Native({ formats: ['ean_13'] })
  }
  const mod = await import('barcode-detector/ponyfill')
  mod.prepareZXingModule({
    overrides: {
      locateFile: (file: string, prefix: string) => (file.endsWith('.wasm') ? `/zxing/${file}` : prefix + file),
    },
  })
  return new mod.BarcodeDetector({ formats: ['ean_13'] }) as unknown as Detector
}

function cameraErrorMessage(err: unknown): string {
  const name = (err as { name?: string })?.name
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return '카메라 권한이 꺼져 있어요. 브라우저 설정에서 이 사이트의 카메라를 허용한 뒤 다시 눌러 주세요.'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return '사용할 수 있는 카메라를 찾지 못했어요.'
  return '카메라를 켜지 못했어요. 책 제목으로 검색해 주세요.'
}

export default function BarcodeScanner({ onDetected, onClose }: { onDetected: (isbn: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    let timer: ReturnType<typeof setTimeout> | null = null
    let stopped = false
    const stop = () => {
      stopped = true
      if (timer) clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }

    ;(async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error(), { name: 'NotFoundError' })
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        if (stopped) return stop()
        const video = videoRef.current!
        video.srcObject = stream
        await video.play()
        const detector = await createDetector()
        if (stopped) return
        setReady(true)
        const tick = async () => {
          if (stopped) return
          try {
            if (video.readyState >= 2) {
              const found = (await detector.detect(video)).map((b) => b.rawValue).find((v) => ISBN_RE.test(v))
              if (found) {
                navigator.vibrate?.(80)
                stop()
                onDetected(found)
                return
              }
            }
          } catch {
            // 프레임 하나 읽기 실패는 무시하고 다음 프레임
          }
          timer = setTimeout(tick, SCAN_INTERVAL_MS)
        }
        tick()
      } catch (err) {
        if (!stopped) setError(cameraErrorMessage(err))
        stop()
      }
    })()

    // 스캔 중 뒤 페이지 스크롤 막기
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      stop()
      document.body.style.overflow = prev
    }
    // onDetected는 열릴 때 한 번만 연결 — 다시 열면 새로 마운트됨
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-medium">바코드로 책 찾기</span>
        <button type="button" onClick={onClose} aria-label="닫기" className="flex h-11 w-11 items-center justify-center text-2xl text-white/80">
          ×
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
        {!error && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="h-32 w-72 rounded-2xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
            <p className="mt-4 px-6 text-center text-sm text-white">
              {ready ? '책 뒤표지의 바코드를 네모 안에 맞춰 주세요' : '카메라를 켜는 중…'}
            </p>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <p className="text-sm leading-relaxed text-white">{error}</p>
            <button type="button" onClick={onClose} className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-text">
              제목으로 검색하기
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
