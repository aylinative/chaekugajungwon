-- ============================================================
-- 책육아정원 — 데이터베이스 스키마 (재해 복구용 백업)
-- ============================================================
-- 목적: Supabase 프로젝트가 삭제되어 새로 만들 때 이 파일 하나로
--       12개 테이블 + 운영자 태그 시드를 재생성하기 위한 스크립트.
--
-- 사용법(새 프로젝트 기준):
--   1) Supabase 대시보드 → SQL Editor 에 이 파일 전체 붙여넣고 실행
--   2) 이어서 supabase/rls_policies.sql 실행 (RLS 정책)
--
-- 안전장치: 모든 테이블은 CREATE TABLE IF NOT EXISTS 라서
--           기존 프로젝트에 실행해도 데이터를 덮어쓰지 않는다.
--           (단, 이미 존재하는 테이블의 컬럼/제약은 변경하지 않음)
--
-- ⚠️ 이 파일은 CLAUDE.md 13.3의 문서화된 구조를 기준으로 재구성한 것이라,
--    실제 운영 DB와 세부 타입이 100% 일치한다는 보장은 없다. 스키마를 콘솔에서
--    바꿨다면 이 파일도 함께 갱신할 것.
-- ============================================================

-- uuid 생성 함수 (Supabase는 기본 활성화되어 있으나 안전하게 명시)
create extension if not exists "pgcrypto";

-- ---------- users (auth.users와 1:1) ----------
create table if not exists public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  kakao_id    varchar not null,
  nickname    text,
  is_operator boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------- children (아이 정보) ----------
create table if not exists public.children (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  label      text default '아이',
  birth_date date not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_children_user on public.children (user_id);

-- ---------- books (공용 책 카탈로그) ----------
-- aladin_item_id: 실제로는 ISBN13 저장. 같은 책 재사용을 위해 UNIQUE.
create table if not exists public.books (
  id              uuid primary key default gen_random_uuid(),
  aladin_item_id  varchar not null unique,
  title           text,
  author          text,
  publisher       text,
  published_date  date,
  cover_image_url text,
  aladin_url      text,
  is_out_of_print boolean not null default false,
  fetched_at      timestamptz not null default now()
);

-- ---------- operator_tags (운영자 주제 태그) ----------
create table if not exists public.operator_tags (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  tag_category text,
  is_active    boolean not null default true,
  created_by   uuid references public.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

-- ---------- posts (추천 게시물 본체) ----------
create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  book_id      uuid not null references public.books (id) on delete restrict,
  reread       boolean not null default false,
  text_density smallint not null check (text_density between 1 and 5),
  content      text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_posts_user on public.posts (user_id);
create index if not exists idx_posts_book on public.posts (book_id);
create index if not exists idx_posts_created on public.posts (created_at desc);

-- ---------- post_groups (추천 그룹: 한글 라벨만 허용) ----------
create table if not exists public.post_groups (
  post_id    uuid not null references public.posts (id) on delete cascade,
  group_name text not null check (group_name in ('씨앗','새싹','봄꽃','사과','나무','어른')),
  primary key (post_id, group_name)
);

-- ---------- post_tags (주제 태그: 운영자태그 또는 커스텀태그) ----------
-- chk_tag_type: 운영자태그면 tag_id 있고 custom_tag NULL / 커스텀이면 반대.
create table if not exists public.post_tags (
  id              uuid primary key default gen_random_uuid(),
  post_id         uuid not null references public.posts (id) on delete cascade,
  tag_id          uuid references public.operator_tags (id) on delete cascade,
  custom_tag      text,
  is_operator_tag boolean not null,
  constraint chk_tag_type check (
    (is_operator_tag and tag_id is not null and custom_tag is null)
    or (not is_operator_tag and tag_id is null and custom_tag is not null)
  )
);
create index if not exists idx_post_tags_post on public.post_tags (post_id);
create index if not exists idx_post_tags_tag on public.post_tags (tag_id);

-- ---------- post_images (게시물 사진, 최대 3장) ----------
create table if not exists public.post_images (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  image_url  text not null,
  sort_order smallint not null default 0
);
create index if not exists idx_post_images_post on public.post_images (post_id);

-- ---------- post_children (게시물 ↔ 아이 태그) ----------
create table if not exists public.post_children (
  post_id  uuid not null references public.posts (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  primary key (post_id, child_id)
);

-- ---------- likes (좋아요) ----------
create table if not exists public.likes (
  user_id    uuid not null references public.users (id) on delete cascade,
  post_id    uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index if not exists idx_likes_post on public.likes (post_id);

-- ---------- bookmarks (북마크/저장) ----------
create table if not exists public.bookmarks (
  user_id    uuid not null references public.users (id) on delete cascade,
  post_id    uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

-- ---------- comments (댓글) ----------
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.users (id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_comments_post on public.comments (post_id);

-- ============================================================
-- 운영자 태그 시드 (확정 23개, CLAUDE.md 8.1)
-- 이미 있는 이름은 건너뛰어 재실행해도 중복되지 않음.
-- ============================================================
insert into public.operator_tags (name, is_active)
select v.name, true
from (values
  ('가족'), ('친구'), ('계절'), ('명절/기념일'),
  ('인성/감정/회복탄력성'), ('다양성'), ('공룡'), ('동물'),
  ('식물'), ('곤충'), ('음식'), ('생활습관'),
  ('색깔'), ('잠자리독서'), ('똥/방귀'), ('말놀이/수놀이'),
  ('몸/신체'), ('기관'), ('탈것'), ('캐릭터'),
  ('보드북'), ('조작북'), ('병풍/팝업책')
) as v(name)
where not exists (
  select 1 from public.operator_tags o where o.name = v.name
);
