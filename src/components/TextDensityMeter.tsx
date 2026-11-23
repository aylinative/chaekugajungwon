import { densityHint } from '@/lib/density'

// 글밥량 표시 — 별점(★) 대신 중립 게이지(5칸 단색). '글 적음—글 많음' 방향 라벨은 쓰지 않고,
// 바 아래에 현재 단계 문구(1~2단어 등)를 '색칠된 마지막 칸' 위치에 정렬해 스펙트럼상 위치를 보여준다.
// 이유: 글밥량은 품질이 아니라 글 양이며, 그림책에서 '글 적음'은 열등이 아니라 어린 아이용 특성.
// 단색(main) 사용 — 방향=품질 인상 방지.
const SEG_STEP_REM = 1.375 // 칸 폭 w-5(1.25rem) + gap-0.5(0.125rem)

export default function TextDensityMeter({ value }: { value: number }) {
  const filled = Math.max(0, Math.min(5, value))
  // 부연 문구를 마지막으로 색칠된 칸의 왼쪽 아래에 정렬 (1단계=첫 칸 아래)
  const left = filled > 0 ? (filled - 1) * SEG_STEP_REM : 0
  // 문구는 자리를 차지하게(떠 있지 않게) — 4·5단계 문구가 막대보다 길어 옆 '우리 아이 반응' 칩과 겹치던 문제(2026.11.23, 카카오 브라우저).
  // 이제 문구 길이만큼 이 표시의 폭이 늘어나 옆 요소가 그만큼 오른쪽으로 밀린다.
  return (
    <span className="inline-block align-middle">
      <span className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`h-1.5 w-5 rounded-full ${i <= filled ? 'bg-main' : 'bg-main/15'}`}
          />
        ))}
      </span>
      <span
        className="mt-1 block whitespace-nowrap text-[10px] leading-none text-text/40"
        style={{ paddingLeft: `${left}rem` }}
      >
        {densityHint(value)}
      </span>
    </span>
  )
}
