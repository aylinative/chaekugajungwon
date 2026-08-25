-- 글밥량에 '글 없는 그림책'(text_density=0) 추가 (2026.08.26)
-- 기존 CHECK(1~5)를 0~5로 완화. 0 = 글 없는 그림책(난이도 바 채움 없음).
alter table posts drop constraint if exists posts_text_density_check;
alter table posts
  add constraint posts_text_density_check check (text_density >= 0 and text_density <= 5);
