import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { readFile } from 'fs/promises'
import path from 'path'
import { TOPICS_CACHE_TAG } from '@/lib/cacheTags'
import type { TaxTag, TaxonomyData } from '@/lib/topics'

// 기록하기 화면의 주제 목록(큰 분류·주제·세부·매칭어). 화면을 열 때 한 번만 부른다.
// 하루 캐시(태그 'topics') — 운영자 태그 변경 시 revalidateTopics()로 즉시 만료.

interface TagRow {
  id: string
  slug: string
  level: 'topic' | 'detail'
  parent_id: string | null
  tag_category: string | null
  name: string
  chip_example: string | null
  intro_keywords: string[] | null
  intro_excludes: string[] | null
  sort_order: number
}

function anon() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

const getTaxonomy = unstable_cache(
  async (): Promise<TaxonomyData> => {
    const sb = anon()
    const { data, error } = await sb
      .from('operator_tags')
      .select('id, slug, level, parent_id, tag_category, name, chip_example, intro_keywords, intro_excludes, sort_order')
      .eq('is_active', true)
    if (error) throw error // 실패는 캐시하지 않음
    const rows = (data ?? []) as TagRow[]
    const slugById = new Map(rows.map((r) => [r.id, r.slug]))
    const tags: TaxTag[] = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      level: r.level,
      category: r.tag_category ?? '',
      name: r.name,
      parent: r.parent_id ? slugById.get(r.parent_id) ?? null : null,
      chip: r.chip_example ?? '',
      intro: r.intro_keywords ?? [],
      excl: r.intro_excludes ?? [],
      order: r.sort_order,
    }))

    return { tags, preview: false }
  },
  ['topics-v2'],
  { revalidate: 86400, tags: [TOPICS_CACHE_TAG] }
)

// 개발용 미리보기: DB 개편(supabase/taxonomy_v2_migration.sql) 전에는 새 컬럼이 없어 조회가 실패한다.
// 로컬 개발에서만 별칭 사전 CSV로 대신 응답해 화면을 미리 확인한다. 저장은 막는다(preview=true).
async function previewFromCsv(): Promise<TaxonomyData> {
  const raw = await readFile(path.join(process.cwd(), 'docs/taxonomy/aliases_v1.csv'), 'utf8')
  const parse = (line: string) => {
    const o: string[] = []
    let c = ''
    let q = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (q) {
        if (ch === '"' && line[i + 1] === '"') { c += '"'; i++ } else if (ch === '"') q = false
        else c += ch
      } else if (ch === '"') q = true
      else if (ch === ',') { o.push(c); c = '' } else c += ch
    }
    o.push(c)
    return o
  }
  const rows = raw.replace(/^﻿/, '').replace(/\r\n/g, '\n').trim().split('\n').slice(1).map(parse)
  const split = (s: string) => (s ? s.split('|') : [])
  const topicSlug = new Map(rows.filter((r) => r[1] === '주제').map((r) => [r[3], r[0]]))
  const tags: TaxTag[] = rows.map((r, i) => ({
    id: null,
    slug: r[0],
    level: r[1] === '주제' ? 'topic' : 'detail',
    category: r[2],
    name: r[1] === '주제' ? r[3] : r[4],
    parent: r[1] === '세부' ? topicSlug.get(r[3]) ?? null : null,
    chip: r[6],
    intro: split(r[8]),
    excl: split(r[9]),
    order: i + 1,
  }))
  return { tags, preview: true }
}

export async function GET() {
  try {
    return NextResponse.json(await getTaxonomy())
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json(await previewFromCsv())
    }
    console.error('Topics load error:', error)
    return NextResponse.json({ error: '주제 목록을 불러오지 못했어요.' }, { status: 500 })
  }
}
