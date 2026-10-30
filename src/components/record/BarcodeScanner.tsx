'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// 책 뒤표지 바코드(EAN-13 = ISBN13, 978/979로 시작) 스캔 — 기록하기 책 검색용 (2026.10.30)
// - 브라우저에 바코드 인식 기능(BarcodeDetector)이 있으면 그걸 쓰고(안드로이드 크롬·삼성 인터넷),
//   없으면(아이폰 사파리 등) barcode-detector 라이브러리(ZXing wasm)로 대신 읽는다. 라이브러리는 이 화면을 열 때만 불러옴.
// - wasm은 외부 CDN이 아니라 우리 사이트(/zxing/)에서 내려준다 (scripts/copy-zxing-wasm.mjs)
// - 카메라는 HTTPS에서만 동작(로컬 localhost는 예외)
// - 2026.10.31 인식률 개선(아이패드에서 가까이 대야만 읽히던 문제): 안내 네모 영역만 잘라서 읽고(바코드가 크게 잡힘),
//   카메라 화질 1920×1080 요청 + 지원 기기는 계속 초점. 바코드가 네모 밖에 있을 때를 대비해 3번에 1번은 화면 전체도 읽음.

type Source = HTMLVideoElement | HTMLCanvasElement
interface Detector {
  detect: (source: Source) => Promise<{ rawValue: string }[]>
}

const ISBN_RE = /^97[89]\d{10}$/
const SCAN_INTERVAL_MS = 150
const CROP_MARGIN = 0.15 // 안내 네모보다 조금 넓게 잘라 가장자리 바코드도 포함

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

// 화면의 안내 네모 위치를 영상 원본 좌표로 바꿔 그 부분만 캔버스에 그린다 (영상은 object-cover로 잘려 보임)
function cropToGuide(video: HTMLVideoElement, guide: HTMLElement, canvas: HTMLCanvasElement): boolean {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) return false
  const vr = video.getBoundingClientRect()
  const gr = guide.getBoundingClientRect()
  const scale = Math.max(vr.width / vw, vr.height / vh)
  const offX = (vr.width - vw * scale) / 2
  const offY = (vr.height - vh * scale) / 2
  const mx = gr.width * CROP_MARGIN
  const my = gr.height * CROP_MARGIN
  const sx = Math.max(0, (gr.left - vr.left - mx - offX) / scale)
  const sy = Math.max(0, (gr.top - vr.top - my - offY) / scale)
  const sw = Math.min(vw - sx, (gr.width + mx * 2) / scale)
  const sh = Math.min(vh - sy, (gr.height + my * 2) / scale)
  if (sw < 10 || sh < 10) return false
  canvas.width = Math.round(sw)
  canvas.height = Math.round(sh)
  canvas.getContext('2d')?.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  return true
}

export default function BarcodeScanner({ onDetected, onClose }: { onDetected: (isbn: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const guideRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    let timer: ReturnType<typeof setTimeout> | null = null
    let stopped = false
    const canvas = document.createElement('canvas')
    const stop = () => {
      stopped = true
      if (timer) clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }

    ;(async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error(), { name: 'NotFoundError' })
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        })
        if (stopped) return stop()
        // 계속 초점(지원하는 기기만 — 안 되면 무시)
        const track = stream.getVideoTracks()[0]
        await track
          ?.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] })
          .catch(() => {})
        const video = videoRef.current!
        video.srcObject = stream
        await video.play()
        const detector = await createDetector()
        if (stopped) return
        setReady(true)
        let frame = 0
        const tick = async () => {
          if (stopped) return
          try {
            if (video.readyState >= 2) {
              frame++
              // 대부분은 안내 네모만 잘라서, 3번에 1번은 화면 전체
              const useCrop = frame % 3 !== 0 && guideRef.current && cropToGuide(video, guideRef.current, canvas)
              const found = (await detector.detect(useCrop ? canvas : video))
                .map((b) => b.rawValue)
                .find((v) => ISBN_RE.test(v))
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
            <div
              ref={guideRef}
              className="h-36 w-[80%] max-w-sm rounded-2xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
            />
            <p className="mt-4 px-6 text-center text-sm leading-relaxed text-white">
              {ready ? (
                <>
                  책 뒤표지 바코드가 네모를 가득 채우게
                  <br />
                  가까이 대 주세요
                </>
              ) : (
                '카메라를 켜는 중…'
              )}
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
