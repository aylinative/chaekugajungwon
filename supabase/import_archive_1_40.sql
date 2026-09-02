-- 아카이빙 1~40 임포트 (2026.09) — user=서점 다니는 워킹맘, 반응=재밌어했어요(2), content=null(나중 백필)
-- ⚠️ 먼저 add_topic_tags_2.sql + make_text_density_nullable.sql 실행 필요.

-- No1 굴러 굴러
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9791190300797','굴러 굴러','이승범','북극곰','2020-04-28','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F5351528%3Ftimestamp%3D20250322143314','https://search.daum.net/search?w=bookpage&bookId=5351528&q=%EA%B5%B4%EB%9F%AC+%EA%B5%B4%EB%9F%AC',false,true) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,3,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('배려·협력','배려·협력','똥·방귀') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('꽃잎'),('열매'),('나무'),('어른')) as g(gn);

-- No2 수박 수영장
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788936446819','수박 수영장','안녕달','창비','2023-01-12','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F533265%3Ftimestamp%3D20260514110927','https://search.daum.net/search?w=bookpage&bookId=533265&q=%EC%88%98%EB%B0%95+%EC%88%98%EC%98%81%EC%9E%A5',false,false) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,3,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('계절','과일') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('꽃잎'),('열매'),('나무'),('어른')) as g(gn);

-- No3 엄마, 잠깐만!
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9791170280088','엄마, 잠깐만','앙트아네트 포티스','한솔수북','2015-07-30','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F1610793%3Ftimestamp%3D20250531114429','https://search.daum.net/search?w=bookpage&bookId=1610793&q=%EC%97%84%EB%A7%88%2C+%EC%9E%A0%EA%B9%90%EB%A7%8C',false,false) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,3,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('엄마','감정·마음') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('꽃잎'),('열매'),('나무'),('어른')) as g(gn);

-- No4 옹기종기 냠냠
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788901105123','옹기종기 냠냠','심조원','호박꽃','2010-01-15','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F348459%3Ftimestamp%3D20260826111015','https://search.daum.net/search?w=bookpage&bookId=348459&q=%EC%98%B9%EA%B8%B0%EC%A2%85%EA%B8%B0+%EB%83%A0%EB%83%A0',false,true) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,2,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('계절') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('새싹'),('꽃잎')) as g(gn);

-- No5 조개껍데기를 찾으면
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9791192869339','조개껍데기를 찾으면','','피카주니어(FIKA JUNIOR)','2025-05-20','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F6910589%3Ftimestamp%3D20260625122249','https://search.daum.net/search?w=bookpage&bookId=6910589&q=%EC%A1%B0%EA%B0%9C%EA%BB%8D%EB%8D%B0%EA%B8%B0%EB%A5%BC+%EC%B0%BE%EC%9C%BC%EB%A9%B4',false,false) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,3,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('계절','바다') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('꽃잎'),('열매'),('나무'),('어른')) as g(gn);

-- No6 파랑 오리
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788956187501','파랑 오리','릴리아','킨더랜드','2018-01-02','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F727816%3Ftimestamp%3D20251112111043','https://search.daum.net/search?w=bookpage&bookId=727816&q=%ED%8C%8C%EB%9E%91+%EC%98%A4%EB%A6%AC',false,false) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,3,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('엄마') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('꽃잎'),('열매'),('나무'),('어른')) as g(gn);

-- No7 일하는 자동차 출동!
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788952784711','일하는 자동차 출동!','피터 시스','시공주니어','2017-05-15','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F646594%3Ftimestamp%3D20260314110554','https://search.daum.net/search?w=bookpage&bookId=646594&q=%EC%9D%BC%ED%95%98%EB%8A%94+%EC%9E%90%EB%8F%99%EC%B0%A8+%EC%B6%9C%EB%8F%99%21',false,false) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,3,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('탈것') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('꽃잎'),('열매'),('나무'),('어른')) as g(gn);

-- No8 부릉부릉 누구 생일?
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9791160949872','부릉부릉 누구 생일?','김정희','사계절','2022-12-07','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F6224889%3Ftimestamp%3D20251118152624','https://search.daum.net/search?w=bookpage&bookId=6224889&q=%EB%B6%80%EB%A6%89%EB%B6%80%EB%A6%89+%EB%88%84%EA%B5%AC+%EC%83%9D%EC%9D%BC%3F',false,true) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,1,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('말놀이·수놀이') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('씨앗'),('새싹')) as g(gn);

-- No9 안아줘
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9791126542086','안아 줘','홍영','동아','2019-10-15','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F5107472%3Ftimestamp%3D20260101152813','https://search.daum.net/search?w=bookpage&bookId=5107472&q=%EC%95%88%EC%95%84+%EC%A4%98',false,false) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,2,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('엄마') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('새싹'),('꽃잎'),('열매')) as g(gn);

-- No10 우리엄마
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788901047904','우리 엄마','앤서니 브라운','웅진주니어','2005-03-20','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F345101%3Ftimestamp%3D20260108111034','https://search.daum.net/search?w=bookpage&bookId=345101&q=%EC%9A%B0%EB%A6%AC+%EC%97%84%EB%A7%88',false,false) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,1,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('엄마') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('씨앗'),('새싹')) as g(gn);

-- No11 두드려 보아요!
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788971962015','두드려 보아요!','안나 클라라 티돌름','사계절','1993-12-01','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F993332%3Ftimestamp%3D20221025154509','https://search.daum.net/search?w=bookpage&bookId=993332&q=%EB%91%90%EB%93%9C%EB%A0%A4+%EB%B3%B4%EC%95%84%EC%9A%94%21',false,false) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,1,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('형태가재밌는북') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('씨앗')) as g(gn);

-- No12 Goodnight Moon (잘자요, 달님)
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788952782885','잘 자요, 달님','마거릿 와이즈 브라운','시공주니어','2017-03-15','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F646415%3Ftimestamp%3D20260313110909','https://search.daum.net/search?w=bookpage&bookId=646415&q=%EC%9E%98+%EC%9E%90%EC%9A%94%2C+%EB%8B%AC%EB%8B%98',false,false) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,1,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('잠자리독서') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('씨앗'),('새싹'),('꽃잎')) as g(gn);

-- No13 잘잘잘123
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788958282792','잘잘잘 123','이억배','사계절','2008-03-20','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F776497%3Ftimestamp%3D20260627110843','https://search.daum.net/search?w=bookpage&bookId=776497&q=%EC%9E%98%EC%9E%98%EC%9E%98+123',false,true) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,1,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('말놀이·수놀이') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('씨앗'),('새싹'),('꽃잎')) as g(gn);

-- No15 앗! 따끔!
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788955828566','앗! 따끔!','국지승','길벗어린이','2026-08-10','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F7273335%3Ftimestamp%3D20260807155859','https://search.daum.net/search?w=bookpage&bookId=7273335&q=%EC%95%97%21+%EB%94%B0%EB%81%94%21',false,false) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,2,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('몸·건강') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('새싹'),('꽃잎')) as g(gn);

-- No16 쏙쏙 봄이 와요
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788901106342','쏙쏙 봄이 와요','심조원','호박꽃','2010-03-16','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F348190%3Ftimestamp%3D20230919015059','https://search.daum.net/search?w=bookpage&bookId=348190&q=%EC%8F%99%EC%8F%99+%EB%B4%84%EC%9D%B4+%EC%99%80%EC%9A%94',false,true) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,1,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('계절','동물') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('씨앗'),('새싹'),('꽃잎')) as g(gn);

-- No17 무슨 줄일까?
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788953313040','무슨 줄일까','오무라 토모코','계림북스','2010-04-15','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F672542%3Ftimestamp%3D20250612113626','https://search.daum.net/search?w=bookpage&bookId=672542&q=%EB%AC%B4%EC%8A%A8+%EC%A4%84%EC%9D%BC%EA%B9%8C',false,false) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,2,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('동물','말놀이·수놀이') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('새싹'),('꽃잎'),('열매')) as g(gn);

-- No18 아빠한테 찰딱
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788943308193','아빠한테 찰딱','최정선','보림','2025-03-31','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F590257%3Ftimestamp%3D20260826111029','https://search.daum.net/search?w=bookpage&bookId=590257&q=%EC%95%84%EB%B9%A0%ED%95%9C%ED%85%8C+%EC%B0%B0%EB%94%B1',false,false) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,1,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('아빠') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('씨앗'),('새싹')) as g(gn);

-- No19 백만 년 동안 절대 말 안 해
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788901124438','백만 년 동안 절대 말 안 해','허은미','웅진주니어','2011-07-05','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F348845%3Ftimestamp%3D20250718110313','https://search.daum.net/search?w=bookpage&bookId=348845&q=%EB%B0%B1%EB%A7%8C+%EB%85%84+%EB%8F%99%EC%95%88+%EC%A0%88%EB%8C%80+%EB%A7%90+%EC%95%88+%ED%95%B4',false,false) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,null,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('감정·마음','엄마','아빠') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('열매')) as g(gn);

-- No20 빨리빨리라고 말하지 마세요
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788958073451','빨리빨리라고 말하지 마세요','마스다 미리','뜨인돌어린이','2011-10-10','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F772494%3Ftimestamp%3D20240619113412','https://search.daum.net/search?w=bookpage&bookId=772494&q=%EB%B9%A8%EB%A6%AC%EB%B9%A8%EB%A6%AC%EB%9D%BC%EA%B3%A0+%EB%A7%90%ED%95%98%EC%A7%80+%EB%A7%88%EC%84%B8%EC%9A%94',false,false) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,1,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('감정·마음','회복탄력성') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('씨앗'),('새싹'),('꽃잎')) as g(gn);

-- No21 무지개 물고기야 엄마가 지켜 줄게
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788952764270','무지개 물고기야 엄마가 지켜 줄게','마르쿠스 피스터','시공주니어','2012-04-10','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F645240%3Ftimestamp%3D20251227110848','https://search.daum.net/search?w=bookpage&bookId=645240&q=%EB%AC%B4%EC%A7%80%EA%B0%9C+%EB%AC%BC%EA%B3%A0%EA%B8%B0%EC%95%BC+%EC%97%84%EB%A7%88%EA%B0%80+%EC%A7%80%EC%BC%9C+%EC%A4%84%EA%B2%8C',false,false) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,null,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('잠자리독서') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('열매')) as g(gn);

-- No22 아기가 아장아장
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788955822618','아기가 아장아장','권사우','길벗어린이','2013-08-31','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F718342%3Ftimestamp%3D20240110164856','https://search.daum.net/search?w=bookpage&bookId=718342&q=%EC%95%84%EA%B8%B0%EA%B0%80+%EC%95%84%EC%9E%A5%EC%95%84%EC%9E%A5',false,true) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,2,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('말놀이·수놀이') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('새싹'),('꽃잎')) as g(gn);

-- No23 간질간질
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9791160940688','간질간질','서현','사계절','2017-04-25','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F1602656%3Ftimestamp%3D20240619113519','https://search.daum.net/search?w=bookpage&bookId=1602656&q=%EA%B0%84%EC%A7%88%EA%B0%84%EC%A7%88',false,false) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,1,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('아빠','몸놀이') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('씨앗'),('새싹')) as g(gn);

-- No24 종이아빠
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788901163635','종이 아빠','이지은','웅진주니어','2014-04-21','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F350278%3Ftimestamp%3D20250409113629','https://search.daum.net/search?w=bookpage&bookId=350278&q=%EC%A2%85%EC%9D%B4+%EC%95%84%EB%B9%A0',false,false) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,null,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('아빠') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('열매')) as g(gn);

-- No25 민들레는 민들레
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788998751074','민들레는 민들레','김장성','이야기꽃','2014-04-28','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F1507064%3Ftimestamp%3D20260410110608','https://search.daum.net/search?w=bookpage&bookId=1507064&q=%EB%AF%BC%EB%93%A4%EB%A0%88%EB%8A%94+%EB%AF%BC%EB%93%A4%EB%A0%88',false,false) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,2,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('계절','식물','감정·마음') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('새싹'),('꽃잎'),('열매')) as g(gn);

-- No26 나, 꽃으로 태어났어
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788949119076','나 꽃으로 태어났어','엠마 줄리아니','비룡소','2014-07-31','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F615774%3Ftimestamp%3D20260319110819','https://search.daum.net/search?w=bookpage&bookId=615774&q=%EB%82%98+%EA%BD%83%EC%9C%BC%EB%A1%9C+%ED%83%9C%EC%96%B4%EB%82%AC%EC%96%B4',false,false) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,2,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('계절','식물','형태가재밌는북') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('새싹'),('꽃잎'),('어른')) as g(gn);

-- No27 아기 토끼 하양이는 궁금해
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788949112565','아기 토끼 하양이는 궁금해!','케빈 헹크스','비룡소','2014-10-20','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F614406%3Ftimestamp%3D20251204110730','https://search.daum.net/search?w=bookpage&bookId=614406&q=%EC%95%84%EA%B8%B0+%ED%86%A0%EB%81%BC+%ED%95%98%EC%96%91%EC%9D%B4%EB%8A%94+%EA%B6%81%EA%B8%88%ED%95%B4%21',false,false) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,1,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('동물','감정·마음') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('씨앗'),('새싹'),('꽃잎')) as g(gn);

-- No28 아기 꽃이 펑!
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788958288565','아기 꽃이 펑!','황k','사계절','2021-03-05','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F776844%3Ftimestamp%3D20260408111134','https://search.daum.net/search?w=bookpage&bookId=776844&q=%EC%95%84%EA%B8%B0+%EA%BD%83%EC%9D%B4+%ED%8E%91%21',false,true) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,1,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('계절') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('씨앗'),('새싹'),('꽃잎')) as g(gn);

-- No29 오늘의 간식
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788959761845','오늘의 간식','와타나베 지나쓰','문학수첩리틀북','2015-11-09','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F813835%3Ftimestamp%3D20230906161516','https://search.daum.net/search?w=bookpage&bookId=813835&q=%EC%98%A4%EB%8A%98%EC%9D%98+%EA%B0%84%EC%8B%9D',false,true) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,2,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('형태가재밌는북') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('새싹'),('꽃잎')) as g(gn);

-- No30 빵빵! 무슨 일이야?
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788955823516','빵빵! 무슨 일이야?','오무라 토모코','길벗어린이','2016-05-25','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F719366%3Ftimestamp%3D20260609110737','https://search.daum.net/search?w=bookpage&bookId=719366&q=%EB%B9%B5%EB%B9%B5%21+%EB%AC%B4%EC%8A%A8+%EC%9D%BC%EC%9D%B4%EC%95%BC%3F',false,false) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,3,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('탈것') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('꽃잎'),('열매')) as g(gn);

-- No31 바닷속 생일 파티
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9791195641345','바닷속 생일 파티','질라사우레','후즈갓마이테일','2016-07-18','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F1662549%3Ftimestamp%3D20221011185025','https://search.daum.net/search?w=bookpage&bookId=1662549&q=%EB%B0%94%EB%8B%B7%EC%86%8D+%EC%83%9D%EC%9D%BC+%ED%8C%8C%ED%8B%B0',false,true) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,2,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('바다','동물','형태가재밌는북') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('새싹'),('꽃잎'),('열매')) as g(gn);

-- No32 이렇게 자 볼까? 저렇게 자 볼까?
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788943310639','이렇게 자 볼까? 저렇게 자 볼까?','이미애','보림','2016-12-31','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F590476%3Ftimestamp%3D20260815110905','https://search.daum.net/search?w=bookpage&bookId=590476&q=%EC%9D%B4%EB%A0%87%EA%B2%8C+%EC%9E%90+%EB%B3%BC%EA%B9%8C%3F+%EC%A0%80%EB%A0%87%EA%B2%8C+%EC%9E%90+%EB%B3%BC%EA%B9%8C%3F',false,true) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,3,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('잠자리독서') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('꽃잎')) as g(gn);

-- No33 고구마구마
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788956187372','고구마구마(반달 그림책)','사이다','반달(킨더랜드)','2017-02-27','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F727787%3Ftimestamp%3D20250905110402','https://search.daum.net/search?w=bookpage&bookId=727787&q=%EA%B3%A0%EA%B5%AC%EB%A7%88%EA%B5%AC%EB%A7%88%28%EB%B0%98%EB%8B%AC+%EA%B7%B8%EB%A6%BC%EC%B1%85%29',false,false) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,3,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('말놀이·수놀이','음식') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('꽃잎'),('열매')) as g(gn);

-- No34 놀아 줘!
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788901215839','놀아 줘!','제즈 앨버로우','웅진주니어','2017-07-14','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F351195%3Ftimestamp%3D20221107235204','https://search.daum.net/search?w=bookpage&bookId=351195&q=%EB%86%80%EC%95%84+%EC%A4%98%21',false,false) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,2,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('잠자리독서') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('새싹'),('꽃잎'),('열매')) as g(gn);

-- No35 소방차가 되었어
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788952761989','소방차가 되었어','피터 시스','시공주니어','2011-06-25','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F644981%3Ftimestamp%3D20250927110337','https://search.daum.net/search?w=bookpage&bookId=644981&q=%EC%86%8C%EB%B0%A9%EC%B0%A8%EA%B0%80+%EB%90%98%EC%97%88%EC%96%B4',false,false) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,3,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('탈것') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('꽃잎'),('열매')) as g(gn);

-- No37 변비책
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788967498801','변비책','천미진','키즈엠','2017-10-20','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F937173%3Ftimestamp%3D20260317110930','https://search.daum.net/search?w=bookpage&bookId=937173&q=%EB%B3%80%EB%B9%84%EC%B1%85',false,false) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,3,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('생활습관') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('꽃잎'),('열매'),('나무')) as g(gn);

-- No38 고양이 뒤에 누굴까?
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788965048695','고양이 뒤에 누굴까?','블루래빗 편집부','블루래빗','2017-08-10','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F910174%3Ftimestamp%3D20230226144915','https://search.daum.net/search?w=bookpage&bookId=910174&q=%EA%B3%A0%EC%96%91%EC%9D%B4+%EB%92%A4%EC%97%90+%EB%88%84%EA%B5%B4%EA%B9%8C%3F',false,true) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,1,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('동물') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('씨앗'),('새싹')) as g(gn);

-- No39 불곰에게 잡혀간 우리 아빠
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788992351638','불곰에게 잡혀간 우리 아빠','허은미','여유당','2018-01-25','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F1377151%3Ftimestamp%3D20250601113810','https://search.daum.net/search?w=bookpage&bookId=1377151&q=%EB%B6%88%EA%B3%B0%EC%97%90%EA%B2%8C+%EC%9E%A1%ED%98%80%EA%B0%84+%EC%9A%B0%EB%A6%AC+%EC%95%84%EB%B9%A0',false,false) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,null,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('엄마','아빠') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('열매'),('나무')) as g(gn);

-- No40 바다에 눈이 내리면?
with b as (insert into books (book_key,title,author,publisher,published_date,cover_image_url,source_url,is_out_of_print,is_board_book) values ('9788967499044','바다에 눈이 내리면?','김금향','키즈엠','2018-01-26','https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F938488%3Ftimestamp%3D20241120115102','https://search.daum.net/search?w=bookpage&bookId=938488&q=%EB%B0%94%EB%8B%A4%EC%97%90+%EB%88%88%EC%9D%B4+%EB%82%B4%EB%A6%AC%EB%A9%B4%3F',false,true) on conflict (book_key) do update set is_board_book=excluded.is_board_book returning id)
, p as (insert into posts (user_id,book_id,child_reaction,reread,text_density,content) select 'fdfc3043-c65e-44b6-8619-af417ff51922',b.id,2,false,2,null from b returning id)
, pt as (insert into post_tags (post_id,tag_id,is_operator_tag) select p.id,ot.id,true from p join operator_tags ot on ot.name in ('계절') and ot.is_active returning 1)
insert into post_groups (post_id,group_name) select p.id,gn from p cross join (values ('새싹')) as g(gn);
