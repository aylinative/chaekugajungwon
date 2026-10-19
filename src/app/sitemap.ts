import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

// 배포 시 NEXT_PUBLIC_SITE_URL을 실제 도메인으로 설정할 것 (절대 URL용)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

// 데이터가 쌓이므로 주기적으로 재생성 (책 페이지가 SEO 핵심 — 19.2)
export const revalidate = 3600

const PAGE_SIZE = 1000

interface SitemapBookRow {
  book_key: string
  last_modified: string
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
  ]

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) return staticRoutes

  // 기록(비숨김)이 있는 책만 색인 — 빈 책 페이지는 SEO 가치가 없음.
  // DB 뷰 sitemap_books가 책별 최신 기록일을 집계(행 수 = 책 수). 인증 불필요라 쿠키 없는 anon 클라이언트.
  // ※ 구글 sitemap 1개 파일 한도는 URL 50,000개 — 그 규모가 되면 generateSitemaps로 분할(Deferred TODO).
  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  // keyset: '마지막 book_key 다음부터 1,000건'씩 — 서버 행 제한·조회 중 변경에도 중복·누락 없음.
  const rows: SitemapBookRow[] = []
  let after: string | null = null
  for (let i = 0; i < 10_000; i++) {
    let q = supabase
      .from('sitemap_books')
      .select('book_key, last_modified')
      .order('book_key')
      .limit(PAGE_SIZE)
    if (after) q = q.gt('book_key', after)
    const { data, error } = await q
    if (error) {
      console.error('sitemap fetch error:', error)
      return staticRoutes
    }
    const page = (data as SitemapBookRow[] | null) ?? []
    if (page.length === 0) break
    rows.push(...page)
    after = page[page.length - 1].book_key
  }

  const bookRoutes: MetadataRoute.Sitemap = rows.map((r) => ({
    url: `${SITE_URL}/book/${encodeURIComponent(r.book_key)}`,
    lastModified: new Date(r.last_modified),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [...staticRoutes, ...bookRoutes]
}
