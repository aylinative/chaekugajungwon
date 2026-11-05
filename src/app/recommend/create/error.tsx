'use client'

// 기록하기 화면에서 그리는 중 오류가 나면 빈 화면 대신 오류 내용을 보여 준다
// (2026.11.06 진단: 휴대폰·운영자 계정 빈 화면 제보 — 원인 확인용, 확인 후에도 남겨 둬도 무해)
export default function RecordError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen bg-bg px-6 pt-10 text-xs text-text/60">
      <div className="mx-auto max-w-sm rounded-2xl bg-surface p-4 shadow-sm">
        <p className="text-sm font-medium text-text">기록하기 화면에서 오류가 났어요</p>
        <p className="mt-2 break-all text-red-500">
          {error.name}: {error.message}
        </p>
        {error.digest && <p className="mt-1 text-text/40">코드: {error.digest}</p>}
        <p className="mt-2 text-text/40">이 화면을 캡처해서 알려 주세요.</p>
        <button type="button" onClick={reset} className="mt-3 rounded-full bg-main px-4 py-1.5 text-white">
          다시 시도
        </button>
      </div>
    </main>
  )
}
