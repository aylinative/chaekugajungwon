import { densityHint } from '@/lib/density'

// 글밥량 표시 — 별점(★) 대신 중립 게이지(5칸) + 양끝 라벨('글 적음—글 많음') + 단계 부연.
// 이유: 글밥량은 품질이 아니라 글 양이며, 그림책에서 '글 적음'은 열등이 아니라
//       어린 아이용 특성이다. 별은 '평점=많을수록 좋음'으로 오독되므로 쓰지 않는다.
// 단색(main) 사용 — 방향=품질 인상을 주지 않기 위해.
export default function TextDensityMeter({ value }: { value: number }) {
  const filled = Math.max(0, Math.min(5, value))
  return (
    <span className="inline-flex flex-col gap-1 align-top">
      <span className="flex items-center gap-2">
        <span className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className={`h-1.5 w-5 rounded-full ${
                i <= filled ? 'bg-main' : 'bg-main/15'
              }`}
            />
          ))}
        </span>
        <span className="text-xs text-text/60">{densityHint(value)}</span>
      </span>
      <span className="flex w-[6.75rem] justify-between text-[10px] leading-none text-text/40">
        <span>글 적음</span>
        <span>글 많음</span>
      </span>
    </span>
  )
}
