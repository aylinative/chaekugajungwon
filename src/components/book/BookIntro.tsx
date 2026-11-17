'use client'

import { useState } from 'react'

// 책 정보 카드 안 '책 소개 2줄 + 더보기' + 출처 표기 (2026.11.17, A안)
// - 소개는 검색처 원문 그대로(요약·문장 변경 없음 — 예스24 약관 '왜곡 가공 금지'), 화면에서 2줄로 자르기만.
// - 더보기 = 그 자리에서 펼침(외부로 나가지 않음). 아주 긴 소개는 500자에서 끊고 예스24 전체 보기 링크.
// - 출처 '도서 DB 제공: 예스24'는 예스24에서 온 책에만, 소개 아래 오른쪽(구분선 위 = 책 정보 묶음의 끝).
//   아래 추천·저장·공유는 우리 기능이라 출처와 섞이지 않게 구분선 아래에 둔다.
const EXPANDED_MAX = 500

export default function BookIntro({
  description,
  sourceUrl,
  fromYes24,
}: {
  description: string | null
  sourceUrl: string | null
  fromYes24: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const text = (description ?? '').trim()
  if (!text && !fromYes24) return null

  const long = text.length > EXPANDED_MAX
  // 모바일 카드 폭에서 한 줄 ≈ 28자 — 두 줄 안에 들어가는 짧은 소개는 '더보기'를 숨긴다
  const fitsTwoLines = text.length <= 56
  const shown = expanded && long ? `${text.slice(0, EXPANDED_MAX)}…` : text

  return (
    <div className="mt-3">
      {text && (
        <div className="text-xs leading-relaxed text-text/55">
          <p className={expanded ? 'whitespace-pre-line' : 'line-clamp-2'}>{shown}</p>
          {!fitsTwoLines && (
            <div className="mt-0.5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className="py-0.5 text-text/45 underline underline-offset-2"
              >
                {expanded ? '접기' : '더보기'}
              </button>
              {expanded && long && fromYes24 && sourceUrl && (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-0.5 text-main underline underline-offset-2"
                >
                  예스24에서 전체 보기 ›
                </a>
              )}
            </div>
          )}
        </div>
      )}
      {fromYes24 && (
        <p className="mt-1 text-right text-[11px] text-text/35">도서 DB 제공: 예스24</p>
      )}
    </div>
  )
}
