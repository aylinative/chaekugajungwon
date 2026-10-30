// docs/taxonomy CSV → 마이그레이션 SQL 초안 생성 (읽기만, 결과는 scratchpad에 저장)
const fs = require('fs')
const D = require('path').join(__dirname, '../../docs/taxonomy/') + '/'
const OUT = require('path').join(__dirname, '../../supabase/')
function parse(line){const o=[];let c='',q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(q){if(ch=='"'&&line[i+1]=='"'){c+='"';i++}else if(ch=='"')q=false;else c+=ch}else if(ch=='"')q=true;else if(ch==','){o.push(c);c=''}else c+=ch}o.push(c);return o}
const csv = (f) => fs.readFileSync(D + f, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim().split('\n').slice(1).map(parse)
const lit = (s) => (s == null || s === '' ? 'null' : "'" + String(s).replace(/'/g, "''") + "'")
const arr = (s) => (s ? 'array[' + s.split('|').map(lit).join(',') + ']::text[]' : "'{}'::text[]")

const tax = csv('aliases_v1.csv')
const slugs = new Set(tax.map((r) => r[0]))
const topicOf = Object.fromEntries(tax.filter((r) => r[1] === '세부').map((r) => [r[0], tax.find((t) => t[1] === '주제' && t[3] === r[3])[0]]))

// 1) 새 분류 값 (slug, level, 큰 분류, 표시 이름, 상위 slug, 칩예시, 검색별칭, 소개매칭어, 소개제외어, 정렬)
const taxValues = tax.map((r, i) => `  (${lit(r[0])}, ${lit(r[1] === '주제' ? 'topic' : 'detail')}, ${lit(r[2])}, ${lit(r[1] === '주제' ? r[3] : r[4])}, ${lit(r[1] === '세부' ? topicOf[r[0]] : null)}, ${lit(r[6])}, ${arr(r[7])}, ${arr(r[8])}, ${arr(r[9])}, ${i + 1})`).join(',\n')

// 2) 기존 태그 처리 (mapping_v1.csv)
const map = csv('mapping_v1.csv')
const keepActions = ['이름변경', '이동', '그대로', '세부로 이동']
const mapValues = map.map((r) => {
  let action = r[4], slug = r[8], cat = r[5]
  if (r[2] === '친척' || r[2] === '숨은그림찾기') { action = '보존(큰분류 연결)'; slug = '' } // 통합 대상이지만 연결 이동 없음(0건 / #1만 재분류)
  const keep = keepActions.includes(action)
  if (keep && !slugs.has(slug)) throw new Error('mapping slug 없음: ' + r[2] + ' ' + slug)
  return `  (${lit(r[2])}, ${lit(keep ? slug : 'legacy-' + r[0])}, ${keep}, ${lit(cat || null)}, ${lit(action)})`
}).join(',\n')
const mappedSlugs = map.filter((r) => keepActions.includes(r[4]) ).map((r) => r[8])
if (new Set(mappedSlugs).size !== mappedSlugs.length) throw new Error('같은 slug로 이름변경 2건')

// 3) 재분류 추가 (post_id, slug) — 'A+B'는 주제+세부 둘 다
const adds = []
const pushIds = (post, ids, src) => { for (const part of ids.split(' / ').map((s) => s.trim()).filter(Boolean)) for (const s of part.split('+')) {
  if (!slugs.has(s)) throw new Error(`${src} 없는 slug: ${s}`); adds.push([post, s]) } }
for (const r of csv('reclassify_insung_v1.csv')) pushIds(r[1], r[7], 'insung#' + r[0])
for (const r of csv('reclassify_legacy_v1.csv')) pushIds(r[1], r[6], 'legacy#' + r[0])

const addValues = adds.map(([p, s]) => `  (${lit(p)}::uuid, ${lit(s)})`).join(',\n')
// 재분류로 떼는 연결 (post_id, 개편 후 slug)
const legacy = csv('reclassify_legacy_v1.csv')
const del = [[legacy.find((r) => r[0] === '41')[1], 'play-character'], [legacy.find((r) => r[0] === '42')[1], 'play-character'], [legacy.find((r) => r[0] === '49')[1], 'play-toybook']]
const delValues = del.map(([p, s]) => `  (${lit(p)}::uuid, ${lit(s)})`).join(',\n')

// 피드 뷰: supabase/add_feed_views.sql의 정의를 그대로 가져와 op_slugs 열을 추가 (create or replace — 끝에 열 추가만)
const viewSrc = fs.readFileSync(require('path').join(D, '../../supabase/add_feed_views.sql'), 'utf8').replace(/\r\n/g, '\n')
const vStart = viewSrc.indexOf('create view public.book_feed_cards'), vEnd = viewSrc.indexOf('-- ---------- 2)')
if (vStart < 0 || vEnd < 0 || !viewSrc.includes('as op_slugs')) throw new Error('add_feed_views.sql 뷰 정의를 찾지 못함')
const viewSql = viewSrc.slice(vStart, vEnd).trim().replace('create view', 'create or replace view')

const topics = tax.filter((r) => r[1] === '주제').length, details = tax.length - topics
const sql = `-- =====================================================================
-- 주제 태그 개편 v2 마이그레이션 (docs/taxonomy 기준, 자동 생성 초안)
-- 실행: Supabase SQL Editor에서 전체를 한 번에. begin~commit 한 트랜잭션이라
--       중간에 오류(검증 실패 포함)가 나면 전부 되돌아간다.
-- 선행: operator_tags, post_tags CSV 백업
-- =====================================================================
begin;

-- 0) DB 안 백업 (되돌리기용). RLS를 켜서 API로는 안 보이게 (정책 없음 = 접근 불가)
create table if not exists public.operator_tags_bak_20261028 as select * from public.operator_tags;
create table if not exists public.post_tags_bak_20261028 as select * from public.post_tags;
alter table public.operator_tags_bak_20261028 enable row level security;
alter table public.post_tags_bak_20261028 enable row level security;

-- 0-1) 실행 전 연결 수 기록
create temp table _before as select count(*) as post_tags_n from public.post_tags;

-- 1) operator_tags: 컬럼 추가 (기존 컬럼 유지, tag_category = 큰 분류 이름)
alter table public.operator_tags
  add column if not exists slug           text,
  add column if not exists level          text not null default 'topic',
  add column if not exists parent_id      uuid references public.operator_tags (id),
  add column if not exists chip_example   text,
  add column if not exists search_aliases text[] not null default '{}',
  add column if not exists intro_keywords text[] not null default '{}',
  add column if not exists intro_excludes text[] not null default '{}';
alter table public.operator_tags drop constraint if exists operator_tags_level_check;
alter table public.operator_tags add constraint operator_tags_level_check check (level in ('topic', 'detail'));

-- 2) post_tags: 출처 (운영자만 보는 값). 기존 행은 전부 'legacy'
alter table public.post_tags add column if not exists source text not null default 'legacy';
alter table public.post_tags drop constraint if exists post_tags_source_check;
alter table public.post_tags add constraint post_tags_source_check
  check (source in ('recommend', 'others', 'all', 'legacy', 'reclassify'));

-- 3) 새 분류 (aliases_v1.csv ${tax.length}행: 주제 ${topics} + 세부 ${details})
create temp table _tax (slug text, level text, category text, name text, parent_slug text,
  chip text, search text[], intro text[], excl text[], ord int) on commit drop;
insert into _tax values
${taxValues};

-- 4) 기존 태그 처리 (mapping_v1.csv 37행). keep=true → 새 태그로 이어 씀(연결 유지), false → 숨김 보존
create temp table _map (old_name text, slug text, keep boolean, category text, action text) on commit drop;
insert into _map values
${mapValues};

-- 4-1) 매핑표의 기존 태그가 DB에 모두 있는지 (이름이 다르면 중단)
do $$ declare missing text; begin
  select string_agg(m.old_name, ', ') into missing from _map m
   where not exists (select 1 from public.operator_tags o where o.name = m.old_name);
  if missing is not null then raise exception '매핑표에 있는데 DB에 없는 태그: %', missing; end if;
end $$;

-- 4-2) 이어 쓰는 기존 태그: slug만 먼저 붙임 (이름·속성은 5)에서 일괄)
update public.operator_tags o set slug = m.slug
  from _map m where o.name = m.old_name and m.keep;

-- 4-3) 숨김 보존: 큰 분류만 연결, 고를 수 없게
update public.operator_tags o
   set slug = m.slug, is_active = false, level = 'topic', tag_category = m.category, sort_order = 1000
  from _map m where o.name = m.old_name and not m.keep;

-- 5) 새 분류 행: 있으면 갱신, 없으면 추가
update public.operator_tags o
   set name = t.name, level = t.level, tag_category = t.category, chip_example = t.chip,
       search_aliases = t.search, intro_keywords = t.intro, intro_excludes = t.excl,
       sort_order = t.ord, is_active = true
  from _tax t where o.slug = t.slug;
insert into public.operator_tags (slug, name, level, tag_category, chip_example, search_aliases,
                                  intro_keywords, intro_excludes, sort_order, is_active)
select t.slug, t.name, t.level, t.category, t.chip, t.search, t.intro, t.excl, t.ord, true
  from _tax t where not exists (select 1 from public.operator_tags o where o.slug = t.slug);

-- 6) 세부 → 상위 주제 연결
update public.operator_tags d set parent_id = p.id
  from _tax t join public.operator_tags p on p.slug = t.parent_slug
 where d.slug = t.slug and t.level = 'detail';

-- 7) 이후 규칙: slug 유일, 세부는 상위 필수·주제는 상위 없음
create unique index if not exists operator_tags_slug_key on public.operator_tags (slug);
alter table public.operator_tags drop constraint if exists operator_tags_parent_check;
alter table public.operator_tags add constraint operator_tags_parent_check check (
  (level = 'topic' and parent_id is null) or (level = 'detail' and parent_id is not null));

-- 8) 운영자 재분류 (DECISIONS 2장 예외: reclassify_insung_v1 22건 + reclassify_legacy_v1 53건)
create temp table _add (post_id uuid, slug text) on commit drop;
insert into _add values
${addValues};
insert into public.post_tags (post_id, tag_id, is_operator_tag, source)
select distinct a.post_id, o.id, true, 'reclassify'
  from _add a join public.operator_tags o on o.slug = a.slug
 where exists (select 1 from public.posts p where p.id = a.post_id)
   and not exists (select 1 from public.post_tags pt where pt.post_id = a.post_id and pt.tag_id = o.id);

-- 8-1) 재분류로 떼는 연결 (캐릭터 책 아님 2건, 토이북 아님 1건)
create temp table _del (post_id uuid, slug text) on commit drop;
insert into _del values
${delValues};
delete from public.post_tags pt using _del d, public.operator_tags o
 where o.slug = d.slug and pt.post_id = d.post_id and pt.tag_id = o.id;

-- 9) 검증 — 하나라도 틀리면 전체 되돌림
do $$ declare n int; m int; begin
  select count(*) into n from public.operator_tags where is_active and level = 'topic';
  if n <> ${topics} then raise exception '활성 주제 수 % (기대 ${topics})', n; end if;
  select count(*) into n from public.operator_tags where is_active and level = 'detail';
  if n <> ${details} then raise exception '활성 세부 수 % (기대 ${details})', n; end if;
  select count(*) into n from public.operator_tags where slug is null;
  if n > 0 then raise exception 'slug 없는 태그 %개 (매핑표에 없는 기존 태그)', n; end if;
  select count(*) into n from public.operator_tags where tag_category is null;
  if n > 0 then raise exception '큰 분류 없는 태그 %개', n; end if;
  select count(*) into n from public.post_tags;
  select post_tags_n into m from _before;
  if n < m - ${del.length} then raise exception '연결 수 감소: % → %', m, n; end if;
  select count(*) into n from _add a where not exists (select 1 from public.posts p where p.id = a.post_id);
  if n > 0 then raise exception '재분류 대상 기록 %건이 DB에 없음', n; end if;
end $$;

-- 9-1) 피드 뷰에 태그 slug 열(op_slugs) 추가 — 주제·큰 분류 필터와 표시가 slug 기준으로 바뀜
${viewSql}
grant select on public.book_feed_cards to anon, authenticated;

-- 10) 주제 제안 (Part 2 '찾는 주제가 없나요?') — 새 테이블이라 기존 데이터에 영향 없음
create table if not exists public.topic_suggestions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  book_id    uuid references public.books (id) on delete set null,
  text       text not null check (char_length(text) between 1 and 30),
  normalized text not null,
  status     text not null default 'pending' check (status in ('pending', 'added', 'declined')),
  created_at timestamptz not null default now(),
  unique (user_id, normalized)
);
alter table public.topic_suggestions enable row level security;
drop policy if exists topic_suggestions_insert_own on public.topic_suggestions;
drop policy if exists topic_suggestions_operator on public.topic_suggestions;
-- 본인 것만 넣기 / 보기·상태 변경은 운영자만 (일반 사용자는 조회 불가)
create policy topic_suggestions_insert_own on public.topic_suggestions for insert
  with check (user_id = auth.uid());
create policy topic_suggestions_operator on public.topic_suggestions for all
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_operator))
  with check (exists (select 1 from public.users u where u.id = auth.uid() and u.is_operator));

drop table _before;
commit;
`
fs.writeFileSync(OUT + 'taxonomy_v2_migration.sql', sql)
console.log('saved', 'tax', tax.length, 'map', map.length, 'adds', adds.length, 'dels', del.length, 'lines', sql.split('\n').length)
