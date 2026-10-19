// 서비스 규모 점검 (읽기 전용, anon 키) — CLAUDE.md '성능 단계 2' 전환 시점 판단용.
// 실행: node scripts/check-scale.mjs
// 마이페이지 운영자 '서비스 규모' 상자와 같은 기준(src/lib/feed.ts getFeedScale)으로 계산한다.
import { readFileSync } from 'node:fs'

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const get = (k) => env.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '')
const URL_ = get('NEXT_PUBLIC_SUPABASE_URL')
const KEY = get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }

const FEED_CACHE_LIMIT = 2 * 1024 * 1024 // Next 데이터 캐시 항목 한도
const GROUP_PAGE_BOOK_LIMIT = 1000 // 그룹 더보기 한 번에 보내는 카드 수 기준
const SITEMAP_URL_LIMIT = 50_000 // 구글 sitemap 파일 1개 한도
const LABELS = ['씨앗', '새싹', '꽃잎', '열매', '나무', '어른']

async function keyset(view, select, key) {
  const rows = []
  for (let after = null; ; ) {
    const q = `${URL_}/rest/v1/${view}?select=${select}&order=${key}&limit=1000` + (after ? `&${key}=gt.${encodeURIComponent(after)}` : '')
    const res = await fetch(q, { headers: H })
    if (!res.ok) throw new Error(`${view} ${res.status} ${await res.text()}`)
    const page = await res.json()
    if (page.length === 0) return rows
    rows.push(...page)
    after = page[page.length - 1][key]
  }
}

async function count(table, filter = '') {
  const res = await fetch(`${URL_}/rest/v1/${table}?select=*&limit=1${filter}`, { headers: { ...H, Prefer: 'count=exact' } })
  return Number(res.headers.get('content-range')?.split('/')[1] ?? NaN)
}

const t0 = Date.now()
const rows = await keyset('book_feed_cards', '*', 'book_id')
const fetchMs = Date.now() - t0
const tags = await (await fetch(`${URL_}/rest/v1/operator_tags?select=id,name,tag_category,sort_order&is_active=eq.true`, { headers: H })).json()

// 앱의 캐시 페이로드(PublicFeed)와 같은 모양으로 만들어 크기를 잰다
const cards = rows.map((r) => {
  const opN = new Set(r.op_topics), cats = new Set(r.op_categories)
  const topics = [...r.op_topics]; for (const c of r.custom_topics) if (!cats.has(c) && !opN.has(c)) topics.push(c)
  return {
    bookId: r.book_id, isbn: r.book_key ?? '', title: r.title ?? '(제목 없음)', cover: r.cover_image_url,
    recordCount: r.record_count, recommendUserCount: r.recommend_count, reaction: r.reaction ?? 2, density: r.density,
    groups: LABELS.filter((g) => g in r.group_post_counts), topics, latestCreatedAt: r.latest_created_at,
    publishedDate: r.published_date, bookmarkCount: r.bookmark_count, bookmarkedByMe: false, isBoardBook: r.is_board_book,
  }
})
const groupRecordCounts = {}
for (const r of rows) for (const [g, c] of Object.entries(r.group_post_counts)) groupRecordCounts[g] = (groupRecordCounts[g] ?? 0) + c
const cacheSize = JSON.stringify(JSON.stringify({ operatorTags: tags, cards, groupRecordCounts })).length
const perGroup = LABELS.map((g) => ({ g, n: cards.filter((c) => c.groups.includes(g)).length }))
const largest = perGroup.reduce((a, b) => (b.n > a.n ? b : a))
const sitemapBooks = (await keyset('sitemap_books', 'book_key', 'book_key')).length
const posts = await count('posts', '&hidden_at=is.null')

const lines = [
  ['피드 캐시 크기', cacheSize, FEED_CACHE_LIMIT, `${Math.round(cacheSize / 1024)}KB / 2MB`],
  [`가장 큰 시기(${largest.g})`, largest.n, GROUP_PAGE_BOOK_LIMIT, `${largest.n}권 / ${GROUP_PAGE_BOOK_LIMIT}권`],
  ['sitemap URL', sitemapBooks + 1, SITEMAP_URL_LIMIT, `${sitemapBooks + 1}개 / ${SITEMAP_URL_LIMIT}개`],
]
console.log(`기록 ${posts}건 · 피드 책 ${cards.length}권 · 피드 조회 ${fetchMs}ms (${Math.ceil(rows.length / 1000) || 1}페이지)\n`)
let worst = 0
for (const [name, v, limit, text] of lines) {
  const r = v / limit; worst = Math.max(worst, r)
  const mark = r >= 0.9 ? '🔴' : r >= 0.7 ? '🟡' : '🟢'
  console.log(`${mark} ${name}: ${text} (${Math.round(r * 100)}%)`)
}
console.log('\n시기별 책 수:', perGroup.map((x) => `${x.g} ${x.n}`).join(' · '))
console.log(worst >= 0.9 ? '\n→ 🔴 전환 작업 필요 (CLAUDE.md [성능 단계 2])' : worst >= 0.7 ? '\n→ 🟡 전환 준비 권장 (CLAUDE.md [성능 단계 2])' : '\n→ 🟢 여유 있음')
