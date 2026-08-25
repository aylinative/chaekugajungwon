import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

// 배포 시 NEXT_PUBLIC_SITE_URL을 실제 도메인으로 설정할 것 (절대 URL용)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

// 데이터가 쌓이므로 주기적으로 재생성 (책 페이지가 SEO 핵심 — 19.2)
export const revalidate = 3600

interface PostIsbnRow {
  created_at: string
  book: { book_key: string | null } | null
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
  ]

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) return staticRoutes

  // 기록(비숨김)이 있는 책만 색인 — 빈 책 페이지는 SEO 가치가 없음.
  // 인증 불필요(공개 읽기 RLS)라 쿠키 없는 anon 클라이언트 사용.
  const supabase = createClient(supabaseUrl, anonKey)
  const { data } = await supabase
    .from('posts')
    .select('created_at, book:books ( book_key )')
    .is('hidden_at', null)
    .order('created_at', { ascending: false })

  // isbn별 최신 기록일을 lastModified로 (같은 책의 첫 등장 = 최신)
  const latestByIsbn = new Map<string, string>()
  for (const row of (data ?? []) as unknown as PostIsbnRow[]) {
    const isbn = row.book?.book_key
    if (isbn && !latestByIsbn.has(isbn)) latestByIsbn.set(isbn, row.created_at)
  }

  const bookRoutes: MetadataRoute.Sitemap = [...latestByIsbn.entries()].map(
    ([isbn, lastMod]) => ({
      url: `${SITE_URL}/book/${encodeURIComponent(isbn)}`,
      lastModified: new Date(lastMod),
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  )

  return [...staticRoutes, ...bookRoutes]
}
