-- 샘플 데이터 전체 삭제 (seed_sample.sql의 역순 — 배포 전 반드시 실행)
delete from bookmarks where user_id::text like 'aaaaaaaa-%';
delete from likes where user_id::text like 'aaaaaaaa-%';
delete from comments where user_id::text like 'aaaaaaaa-%';
delete from posts where user_id::text like 'aaaaaaaa-%';
delete from books where id::text like 'bbbbbbbb-%';
delete from users where id::text like 'aaaaaaaa-%';
