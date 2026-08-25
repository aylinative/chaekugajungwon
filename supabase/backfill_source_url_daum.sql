-- 기존 books.source_url(알라딘 웹링크) → 카카오/다음 링크로 통일 백필 (2026.08.26)
-- 배포 전 1회 실행(Supabase SQL Editor). 카카오 target=isbn 조회로 생성. 9건.
-- ※ 알라딘 링크도 유효하나(웹페이지), 신규 기록(다음 링크)과의 일관성을 위해 통일.

update public.books set source_url = 'https://search.daum.net/search?w=bookpage&bookId=7253863&q=%EB%B3%B5%EC%88%AD%EC%95%84%EC%99%80+%EC%95%A0%EB%B2%8C%EB%A0%88' where book_key = '9788936429690'; -- 복숭아와 애벌레
update public.books set source_url = 'https://search.daum.net/search?w=bookpage&bookId=975158&q=%EB%8B%AC%EB%8B%98+%EC%95%88%EB%85%95' where book_key = '9788970940564'; -- 달님 안녕
update public.books set source_url = 'https://search.daum.net/search?w=bookpage&bookId=1664715&q=%EC%A7%84%EC%A0%95%ED%95%9C+%EC%9D%BC%EA%B3%B1+%EC%82%B4' where book_key = '9791196012656'; -- 진정한 일곱 살 - 개정판
update public.books set source_url = 'https://search.daum.net/search?w=bookpage&bookId=5140810&q=%EC%9E%A0%EC%9D%B4+%EC%98%A4%EB%8A%94+%EC%9D%B4%EC%95%BC%EA%B8%B0' where book_key = '9791196254056'; -- 잠이 오는 이야기
update public.books set source_url = 'https://search.daum.net/search?w=bookpage&bookId=6626084&q=%EC%96%B4%EB%96%A4+%EA%B5%AC%EB%A6%84' where book_key = '9791192869186'; -- 어떤 구름
update public.books set source_url = 'https://search.daum.net/search?w=bookpage&bookId=1617259&q=%EB%B6%80%EB%A6%89%EB%B6%80%EB%A6%89+%EC%B9%98%ED%8B%B0%EA%B0%80+%EA%B0%84%EB%8B%A4%21' where book_key = '9791185564210'; -- 부릉부릉 치티가 간다!
update public.books set source_url = 'https://search.daum.net/search?w=bookpage&bookId=1327561&q=%EC%82%AC%EB%9E%91%ED%95%B4+%EC%82%AC%EB%9E%91%ED%95%B4+%EC%82%AC%EB%9E%91%ED%95%B4' where book_key = '9788990794529'; -- 사랑해 사랑해 사랑해 (양장)
update public.books set source_url = 'https://search.daum.net/search?w=bookpage&bookId=590223&q=%EC%97%84%EB%A7%88%EB%A5%BC+%EC%9E%A0%EA%B9%90+%EC%9E%83%EC%96%B4%EB%B2%84%EB%A0%B8%EC%96%B4%EC%9A%94' where book_key = '9788943307622'; -- 엄마를 잠깐 잃어버렸어요 (보드북)
update public.books set source_url = 'https://search.daum.net/search?w=bookpage&bookId=6153853&q=%EB%8B%AC%ED%86%A0%EB%81%BC' where book_key = '9791165882044'; -- 달토끼 - 2023 문학나눔 선정도서
