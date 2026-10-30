// 책 제목·카카오 책 소개로 주제 찾기 (브라우저에서 처리, 서버 호출 없음 — DECISIONS 10장)
// - 소개매칭어는 2음절 이상만 (한 글자는 '이별'→'별'처럼 오류가 나서 검색 별칭에만 씀)
// - 소개제외어가 덮는 위치의 매칭은 무시 (예: 달 → '반달곰')
// - 제목에서 찾은 것이 소개보다 앞, 같은 곳이면 먼저 나온 순
// - 세부까지 맞으면 세부(화면에서 주제+세부 칩), 아니면 주제. 최대 3개 (2026.10.28 운영자)
// - 띄어쓰기는 지우지 않는다: 지우면 '이 모습'→'이모', '영등포 도림동'→'포도'처럼 단어 사이에서 엉뚱한 매칭이 생김
// - 매칭어 형식: '^말' = 제목에서만 / '말>세부slug+세부slug' = 맞으면 그 세부들을 한 칩으로 (예: 사계절 → 봄·여름·가을·겨울)
import type { TagIndex, TaxTag } from '@/lib/topics'

export const MATCH_LIMIT = 3

// 추천 칩 1개: 누르면 picks(주제 slug 또는 세부 slug들)를 한 번에 고르기/해제
export interface MatchItem {
  key: string
  topic: string // 주제 slug
  details: string[] // 세부 slug (비어 있으면 주제 칩)
}

// 소문자 + 연속 공백을 한 칸으로 (공백 자체는 유지)
const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase()

function firstValidHit(text: string, keyword: string, excludes: string[]): number {
  for (let from = 0; ; ) {
    const at = text.indexOf(keyword, from)
    if (at < 0) return -1
    const end = at + keyword.length
    const covered = excludes.some((ex) => {
      for (let i = text.indexOf(ex); i >= 0; i = text.indexOf(ex, i + 1)) {
        if (i <= at && i + ex.length >= end) return true
      }
      return false
    })
    if (!covered) return at
    from = at + 1
  }
}

interface Key {
  k: string
  titleOnly: boolean
  details: string[] | null // '>세부+세부' 형식이면 그 세부들
}

function parseKey(raw: string): Key {
  const [word, multi] = raw.split('>')
  return {
    k: norm(word.replace(/^\^/, '')),
    titleOnly: word.startsWith('^'),
    details: multi ? multi.split('+').map((s) => s.trim()).filter(Boolean) : null,
  }
}

export function matchTopics(tags: TaxTag[], idx: TagIndex, title: string, contents: string): MatchItem[] {
  const t = norm(title ?? '')
  const c = norm(contents ?? '')
  const hits: { topic: string; details: string[]; rank: number }[] = []
  for (const tag of tags) {
    const keys = tag.intro.map(parseKey).filter(({ k }) => [...k.replace(/ /g, '')].length >= 2)
    if (keys.length === 0) continue
    const excl = tag.excl.map(norm).filter(Boolean)
    const topic = tag.parent ?? tag.slug
    for (const key of keys) {
      let rank = firstValidHit(t, key.k, excl) // 제목: 0 ~
      if (rank < 0 && !key.titleOnly) {
        const inBody = firstValidHit(c, key.k, excl)
        if (inBody >= 0) rank = 100000 + inBody // 소개: 제목 뒤
      }
      if (rank < 0) continue
      const details = key.details?.filter((d) => idx.bySlug.get(d)?.parent === topic) ?? (tag.level === 'detail' ? [tag.slug] : [])
      hits.push({ topic, details, rank })
    }
  }
  hits.sort((a, b) => a.rank - b.rank)

  // 같은 주제는 칩 하나로: 처음 나온 순서 자리에, 세부가 있는 결과를 우선 (주제만 맞은 것보다 구체적)
  const out: MatchItem[] = []
  for (const h of hits) {
    const i = out.findIndex((o) => o.topic === h.topic)
    if (i < 0) {
      if (out.length >= MATCH_LIMIT) continue
      out.push({ key: h.topic + ':' + h.details.join('+'), topic: h.topic, details: h.details })
    } else if (out[i].details.length === 0 && h.details.length > 0) {
      out[i] = { key: h.topic + ':' + h.details.join('+'), topic: h.topic, details: h.details }
    }
  }
  return out
}
