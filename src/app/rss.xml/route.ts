import { createClient } from '@supabase/supabase-js'

// 네이버 서치어드바이저 'RSS 제출'용 피드 — 새 기록이 달린 책 페이지를 빨리 수집하게 하는 신호.
// 책 1권 = 항목 1개(링크는 /book/[isbn], sitemap과 같은 단위). 최근 기록 순, 최대 50권.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export const revalidate = 3600

const MAX_ITEMS = 50

interface RssPostRow {
  created_at: string
  books: { book_key: string | null; title: string; author: string | null; publisher: string | null } | null
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const items: string[] = []

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (supabaseUrl && anonKey) {
    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await supabase
      .from('posts')
      .select('created_at, books(book_key, title, author, publisher)')
      .is('hidden_at', null)
      .order('created_at', { ascending: false })
      .limit(MAX_ITEMS * 4)
    if (error) console.error('rss fetch error:', error)

    const seen = new Set<string>()
    for (const row of (data as unknown as RssPostRow[] | null) ?? []) {
      const b = row.books
      if (!b?.book_key || seen.has(b.book_key)) continue
      seen.add(b.book_key)
      const link = `${SITE_URL}/book/${encodeURIComponent(b.book_key)}`
      const by = [b.author, b.publisher].filter(Boolean).join(' · ')
      const desc = `${by ? `${by} — ` : ''}아이와 함께 읽은 양육자의 책육아 기록과 추천 시기`
      items.push(
        `<item><title>${esc(`${b.title} - 그림책 추천`)}</title><link>${esc(link)}</link>` +
          `<guid isPermaLink="true">${esc(link)}</guid><description>${esc(desc)}</description>` +
          `<pubDate>${new Date(row.created_at).toUTCString()}</pubDate></item>`,
      )
      if (items.length >= MAX_ITEMS) break
    }
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0"><channel>` +
    `<title>책육아정원</title><link>${esc(SITE_URL)}</link>` +
    `<description>우리 아이가 진짜 좋아한 그림책을 월령·연령별로 기록하고 추천받는 책육아 커뮤니티</description>` +
    `<language>ko</language>` +
    items.join('') +
    `</channel></rss>`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}
