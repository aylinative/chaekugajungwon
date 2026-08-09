-- 기록 사진 저장용 Storage 버킷 + RLS (2026.08)
-- public 버킷: 누구나 URL로 읽기. 업로드/삭제는 본인 폴더({user_id}/...)만.
-- 파일 경로 규칙: post-images/{auth.uid}/{uuid}.{ext}

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

-- 업로드: 로그인 사용자가 자기 폴더에만
drop policy if exists post_images_insert on storage.objects;
create policy post_images_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 삭제: 본인 폴더만
drop policy if exists post_images_delete on storage.objects;
create policy post_images_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 읽기: 누구나 (public 버킷 — 피드/상세에서 표시)
drop policy if exists post_images_select on storage.objects;
create policy post_images_select on storage.objects
  for select
  using (bucket_id = 'post-images');
