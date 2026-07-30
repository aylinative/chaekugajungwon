-- ============================================================
-- 책육아정원 RLS(Row Level Security) 정책
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행.
-- 재실행해도 안전하도록 각 정책을 drop 후 재생성(idempotent).
--
-- 기본 원칙:
--  - 커뮤니티 서비스이므로 게시물/책/댓글/좋아요는 "누구나 읽기(select)" 허용.
--  - 쓰기(insert/update/delete)는 "본인 소유"만 허용 (auth.uid() 기준).
--  - 아이 정보(children)·북마크(bookmarks)는 개인정보이므로 "본인만 읽기"까지 제한.
--  - operator_tags 쓰기는 운영자(users.is_operator)만.
-- ============================================================

-- ---------- users ----------
alter table public.users enable row level security;
drop policy if exists users_select_all  on public.users;
drop policy if exists users_insert_self on public.users;
drop policy if exists users_update_self on public.users;
create policy users_select_all  on public.users for select using (true);
create policy users_insert_self on public.users for insert with check (id = auth.uid());
create policy users_update_self on public.users for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------- children (개인정보: 본인만) ----------
alter table public.children enable row level security;
drop policy if exists children_select_own on public.children;
drop policy if exists children_insert_own on public.children;
drop policy if exists children_update_own on public.children;
drop policy if exists children_delete_own on public.children;
create policy children_select_own on public.children for select using (user_id = auth.uid());
create policy children_insert_own on public.children for insert with check (user_id = auth.uid());
create policy children_update_own on public.children for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy children_delete_own on public.children for delete using (user_id = auth.uid());

-- ---------- books (공용 카탈로그: 누구나 읽기, 로그인 사용자면 등록) ----------
alter table public.books enable row level security;
drop policy if exists books_select_all  on public.books;
drop policy if exists books_insert_auth on public.books;
drop policy if exists books_update_auth on public.books;
create policy books_select_all  on public.books for select using (true);
create policy books_insert_auth on public.books for insert with check (auth.uid() is not null);
create policy books_update_auth on public.books for update using (auth.uid() is not null) with check (auth.uid() is not null);

-- ---------- posts ----------
alter table public.posts enable row level security;
drop policy if exists posts_select_all on public.posts;
drop policy if exists posts_insert_own on public.posts;
drop policy if exists posts_update_own on public.posts;
drop policy if exists posts_delete_own on public.posts;
create policy posts_select_all on public.posts for select using (true);
create policy posts_insert_own on public.posts for insert with check (user_id = auth.uid());
create policy posts_update_own on public.posts for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy posts_delete_own on public.posts for delete using (user_id = auth.uid());

-- ---------- 게시물 하위 테이블 (post_groups / post_tags / post_images / post_children) ----------
-- 누구나 읽기, 쓰기는 "해당 게시물이 본인 것일 때"만.
alter table public.post_groups enable row level security;
drop policy if exists post_groups_select_all on public.post_groups;
drop policy if exists post_groups_write_own  on public.post_groups;
create policy post_groups_select_all on public.post_groups for select using (true);
create policy post_groups_write_own on public.post_groups for all
  using (exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()));

alter table public.post_tags enable row level security;
drop policy if exists post_tags_select_all on public.post_tags;
drop policy if exists post_tags_write_own  on public.post_tags;
create policy post_tags_select_all on public.post_tags for select using (true);
create policy post_tags_write_own on public.post_tags for all
  using (exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()));

alter table public.post_images enable row level security;
drop policy if exists post_images_select_all on public.post_images;
drop policy if exists post_images_write_own  on public.post_images;
create policy post_images_select_all on public.post_images for select using (true);
create policy post_images_write_own on public.post_images for all
  using (exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()));

alter table public.post_children enable row level security;
drop policy if exists post_children_select_all on public.post_children;
drop policy if exists post_children_write_own  on public.post_children;
create policy post_children_select_all on public.post_children for select using (true);
create policy post_children_write_own on public.post_children for all
  using (exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()));

-- ---------- likes (누구나 카운트 읽기, 본인 것만 추가/삭제) ----------
alter table public.likes enable row level security;
drop policy if exists likes_select_all on public.likes;
drop policy if exists likes_write_own  on public.likes;
create policy likes_select_all on public.likes for select using (true);
create policy likes_write_own on public.likes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- bookmarks (개인정보: 본인만) ----------
alter table public.bookmarks enable row level security;
drop policy if exists bookmarks_all_own on public.bookmarks;
create policy bookmarks_all_own on public.bookmarks for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- comments (누구나 읽기, 본인 것만 작성/삭제) ----------
alter table public.comments enable row level security;
drop policy if exists comments_select_all on public.comments;
drop policy if exists comments_insert_own on public.comments;
drop policy if exists comments_delete_own on public.comments;
create policy comments_select_all on public.comments for select using (true);
create policy comments_insert_own on public.comments for insert with check (user_id = auth.uid());
create policy comments_delete_own on public.comments for delete using (user_id = auth.uid());

-- ---------- operator_tags (누구나 읽기, 운영자만 쓰기) ----------
alter table public.operator_tags enable row level security;
drop policy if exists operator_tags_select_all      on public.operator_tags;
drop policy if exists operator_tags_write_operator  on public.operator_tags;
create policy operator_tags_select_all on public.operator_tags for select using (true);
create policy operator_tags_write_operator on public.operator_tags for all
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_operator))
  with check (exists (select 1 from public.users u where u.id = auth.uid() and u.is_operator));
