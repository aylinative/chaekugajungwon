// 주제 태그 개편 — 배포 직후 확인 (읽기 전용, anon 키). 실행: node scripts/taxonomy/check-taxonomy.mjs
// DB(마이그레이션 결과) + 실서비스 API(새 코드 배포 여부)를 함께 본다. ✅/❌로 표시.
import { readFileSync } from 'fs'

const env = readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
const get = (k) => env.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '')
const URL_ = get('NEXT_PUBLIC_SUPABASE_URL')
const KEY = get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
const SITE = process.argv[2] || get('NEXT_PUBLIC_SITE_URL') || 'https://bookgardening.co.kr'
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const db = async (p) => {
  const r = await fetch(`${URL_}/rest/v1/${p}`, { headers: H })
  const body = await r.json()
  if (!r.ok) throw new Error(`${p}: ${body.message || r.status}`)
  return body
}
let fails = 0
const check = (ok, label, detail = '') => {
  if (!ok) fails++
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ' — ' + detail : ''}`)
}

console.log(`■ DB (마이그레이션 결과)`)
const tags = await db('operator_tags?select=id,slug,name,level,parent_id,tag_category,is_active&limit=1000').catch((e) => {
  console.log('❌ 마이그레이션 전이에요 (operator_tags.slug 없음) — supabase/taxonomy_v2_migration.sql을 먼저 실행하세요')
  console.log('   ' + e.message)
  process.exit(1)
})
const active = tags.filter((t) => t.is_active)
check(active.filter((t) => t.level === 'topic').length === 56, '활성 주제 56개', `${active.filter((t) => t.level === 'topic').length}개`)
check(active.filter((t) => t.level === 'detail').length === 43, '활성 세부 43개', `${active.filter((t) => t.level === 'detail').length}개`)
check(tags.every((t) => t.slug), '모든 태그에 slug')
check(tags.every((t) => t.tag_category), '모든 태그에 큰 분류')
const links = await db('post_tags?select=post_id,tag_id,source&limit=10000')
const bySource = links.reduce((m, l) => ((m[l.source] = (m[l.source] || 0) + 1), m), {})
check((bySource.legacy || 0) === 231, '개편 전 연결(legacy) 231건 (234 − 뗀 3)', `${bySource.legacy || 0}건`)
check((bySource.reclassify || 0) > 0, '재분류 연결(reclassify) 생김', `${bySource.reclassify || 0}건`)
// 개편 전 연결(legacy)만 셈 — 재분류로 새로 붙은 연결은 제외
const count = (name) => {
  const t = tags.find((x) => x.name === name)
  return t ? links.filter((l) => l.tag_id === t.id && l.source === 'legacy').length : -1
}
const hiddenExpect = { '인성·감정·마음': 22, '몸·건강': 13, 동물: 19, '명절·기념일·전통': 4, '말놀이·수놀이': 13, 숨은그림찾기: 2, 친척: 0 }
for (const [n, v] of Object.entries(hiddenExpect)) {
  const t = tags.find((x) => x.name === n)
  check(t && !t.is_active && count(n) === v, `숨김 보존 '${n}' 연결 ${v}건`, t ? `${count(n)}건, ${t.is_active ? '보임' : '숨김'}` : '없음')
}
const sea = tags.find((t) => t.slug === 'nature-place-sea')
check(sea && count('바다') === 3, "옛 '바다' → 바다·산·숲 › 바다 (3건 유지)", `${count('바다')}건`)
check(count('토이북') === 9, "옛 '형태가재밌는북' → 토이북 (개편 전 연결 10 − 뽀뽀 1 = 9건)", `${count('토이북')}건`)
const fruit = tags.find((t) => t.slug === 'things-food-fruit')
const food = tags.find((t) => t.slug === 'things-food')
check(fruit && fruit.parent_id === food?.id, "'과일'이 '음식'의 세부")
const view = await db('book_feed_cards?select=op_slugs&limit=1').catch((e) => e)
check(Array.isArray(view), '피드 뷰에 op_slugs 열', Array.isArray(view) ? '' : String(view.message))
const sug = await db('topic_suggestions?select=id&limit=1').catch((e) => e)
check(Array.isArray(sug), '제안 테이블(topic_suggestions) 생김', Array.isArray(sug) ? '' : String(sug.message))

console.log(`\n■ 실서비스 (${SITE}) — 새 코드 배포 여부`)
const topics = await fetch(`${SITE}/api/topics`).then((r) => r.json()).catch(() => null)
check(topics && topics.preview === false && topics.tags?.length === 99, '/api/topics: 주제 99개, 미리보기 아님', topics ? `${topics.tags?.length}개, preview=${topics.preview}` : '응답 없음 (배포 전?)')
const search = await fetch(`${SITE}/api/search/topics?q=${encodeURIComponent('공룡')}`).then((r) => r.json()).catch(() => null)
check(search && Array.isArray(search.groups), "/api/search/topics?q=공룡 응답", search ? `묶음 ${search.groups.length}개` : '응답 없음')
const home = await fetch(`${SITE}/?cat=${encodeURIComponent('동물')}`, { redirect: 'manual' }).then((r) => r.status).catch(() => 0)
check(home === 200 || home === 307 || home === 302, '홈 ?cat=동물 열림', `HTTP ${home}`)

console.log(fails === 0 ? '\n모두 통과 🎉' : `\n❌ ${fails}개 실패 — 위 항목 확인`)
process.exit(fails ? 1 : 0)
