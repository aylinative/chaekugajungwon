-- =====================================================================
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

-- 3) 새 분류 (aliases_v1.csv 99행: 주제 56 + 세부 43)
create temp table _tax (slug text, level text, category text, name text, parent_slug text,
  chip text, search text[], intro text[], excl text[], ord int) on commit drop;
insert into _tax values
  ('mind-feelings', 'topic', '마음·감정', '여러 가지 감정', null, '기쁨·슬픔·화·질투', array['감정','기분','기쁨','슬픔','무서움','두려움','행복','속상']::text[], array['감정','기분이','슬퍼','무서워','속상']::text[], '{}'::text[], 1),
  ('mind-feelings-anger', 'detail', '마음·감정', '화', 'mind-feelings', '화남·짜증·떼쓰기', array['화','화남','화나','화났','분노','짜증','떼','떼쓰기','성질']::text[], array['화가 나','화났','화를 내','화내','분노','짜증','떼쓰']::text[], '{}'::text[], 2),
  ('mind-feelings-jealousy', 'detail', '마음·감정', '질투', 'mind-feelings', '질투·샘·동생이 미워', array['질투','질투심','샘','시샘','샘나']::text[], array['질투','샘이 나','샘나','시샘']::text[], '{}'::text[], 3),
  ('mind-feelings-sel', 'detail', '마음·감정', '사회정서', 'mind-feelings', '감정 조절·감정 표현', array['사회정서','사회정서학습','SEL','감정 조절','감정조절','감정 표현','감정 코칭','감정코칭','정서']::text[], array['사회정서','감정 조절','감정조절','감정 표현','감정을 표현','감정코칭']::text[], '{}'::text[], 4),
  ('mind-love', 'topic', '마음·감정', '사랑·애착', null, '사랑해·안아줘·엄마 품', array['사랑','사랑해','애착','안아줘','포옹','뽀뽀','품']::text[], array['사랑','사랑해','안아 줘','안아줘','꼭 안','포옹','뽀뽀','애착']::text[], '{}'::text[], 5),
  ('mind-comfort', 'topic', '마음·감정', '위로·공감', null, '괜찮아·토닥토닥', array['위로','공감','괜찮아','토닥토닥','다독']::text[], array['위로','토닥','공감','괜찮아']::text[], '{}'::text[], 6),
  ('mind-self', 'topic', '마음·감정', '나다움·자신감', null, '나는 나·자존감', array['나다움','자존감','자신감','나는 나','있는 그대로','호기심']::text[], array['자존감','자신감','나다움','있는 그대로']::text[], '{}'::text[], 7),
  ('mind-resilience', 'topic', '마음·감정', '도전·회복탄력성', null, '다시 해보기·실수해도 괜찮아', array['도전','회복탄력성','실수','용기','포기','끈기','실패']::text[], array['도전','용기','실수해도','실패해도','포기하지','다시 해']::text[], '{}'::text[], 8),
  ('mind-farewell', 'topic', '마음·감정', '이별·죽음·인생', null, '헤어짐·하늘나라·인생', array['이별','죽음','헤어짐','하늘나라','그리움','상실','애도','무지개다리','인생','삶','살아간다는 것','나이 듦','일생']::text[], array['이별','헤어지','죽음','하늘나라','세상을 떠','그리움','무지개다리','인생','삶의','일생']::text[], '{}'::text[], 9),
  ('body-me', 'topic', '몸·생활', '내 몸', null, '손·발·얼굴·키', array['몸','신체','손','발','얼굴','키','배꼽','코','입','머리카락']::text[], array['내 몸','우리 몸','신체','배꼽','발가락','손가락','키가 크']::text[], '{}'::text[], 10),
  ('body-sick', 'topic', '몸·생활', '아플 때·병원', null, '감기·주사·치과', array['병원','아플 때','감기','주사','예방접종','치과','열','약','의사','간호사']::text[], array['병원','감기','주사','예방접종','치과','아파서','아픈 날']::text[], '{}'::text[], 11),
  ('body-habit', 'topic', '몸·생활', '생활습관', null, '잠·밥·양치·배변', array['생활습관','습관','기본생활','올바른 생활']::text[], array['습관']::text[], '{}'::text[], 12),
  ('body-habit-sleep', 'detail', '몸·생활', '잠', 'body-habit', '잠자리·잘 자', array['잠','잠자리','잘 자','자장자장','굿나잇','낮잠','밤잠','잠들기','잠자리독서']::text[], array['잘 자','잠자리','자장','잠들','낮잠','졸려','굿나잇','꿈나라']::text[], '{}'::text[], 13),
  ('body-habit-eat', 'detail', '몸·생활', '밥 먹기', 'body-habit', '편식·숟가락', array['밥 먹기','편식','식사','숟가락','골고루']::text[], array['편식','골고루 먹','밥 먹','숟가락']::text[], '{}'::text[], 14),
  ('body-habit-wash', 'detail', '몸·생활', '양치·씻기', 'body-habit', '이 닦기·목욕', array['양치','이 닦기','치카치카','목욕','손 씻기','씻기','세수','머리 감기']::text[], array['양치','이를 닦','이 닦','치카','목욕','손 씻','세수']::text[], '{}'::text[], 15),
  ('body-habit-potty', 'detail', '몸·생활', '배변', 'body-habit', '기저귀·변기', array['배변','배변훈련','기저귀','변기','쉬','응가','화장실']::text[], array['배변','기저귀','변기','응가','화장실','쉬야']::text[], '{}'::text[], 16),
  ('body-habit-tidy', 'detail', '몸·생활', '옷 입기·정리', 'body-habit', '옷 입기·정리정돈', array['옷 입기','정리','정리정돈','단추','신발 신기','혼자 입기']::text[], array['정리','정돈','옷을 입','혼자 입','단추','치우']::text[], '{}'::text[], 17),
  ('body-safety', 'topic', '몸·생활', '안전', null, '교통·불·성교육·유괴', array['안전','안전교육','위험','조심']::text[], array['안전','위험해']::text[], '{}'::text[], 18),
  ('body-safety-traffic', 'detail', '몸·생활', '교통안전', 'body-safety', '신호등·횡단보도·카시트', array['교통안전','길 건너기','신호등','횡단보도','카시트','안전벨트','찻길']::text[], array['교통안전','신호등','횡단보도','카시트','안전벨트','찻길']::text[], '{}'::text[], 19),
  ('body-safety-fire', 'detail', '몸·생활', '불조심', 'body-safety', '불조심·화재·소화기', array['불조심','화재','불','소화기','대피','화재 대피','소방훈련']::text[], array['불조심','화재','소화기','대피']::text[], '{}'::text[], 20),
  ('body-safety-sex', 'detail', '몸·생활', '성교육', 'body-safety', '내 몸은 소중해·몸의 경계', array['성교육','몸의 경계','내 몸은 소중해','소중한 내 몸','싫어요 말하기','좋은 손길','나쁜 손길']::text[], array['성교육','소중한 내 몸','내 몸은 소중','몸의 경계','나쁜 손길']::text[], '{}'::text[], 21),
  ('body-safety-stranger', 'detail', '몸·생활', '유괴', 'body-safety', '낯선 사람·길 잃음', array['유괴','낯선 사람','모르는 사람','납치','미아','길 잃음','길을 잃','실종']::text[], array['유괴','낯선 사람','모르는 사람','납치','미아','길을 잃']::text[], '{}'::text[], 22),
  ('family-mom', 'topic', '가족', '엄마', null, '엄마와 나·엄마 마음', array['엄마','어머니','우리 엄마']::text[], '{}'::text[], '{}'::text[], 23),
  ('family-dad', 'topic', '가족', '아빠', null, '아빠와 놀기·아빠 마음', array['아빠','아버지','우리 아빠']::text[], '{}'::text[], '{}'::text[], 24),
  ('family-siblings', 'topic', '가족', '형제자매', null, '동생·언니·형·누나·오빠', array['형제','자매','남매','동생','언니','형','누나','오빠','쌍둥이']::text[], array['동생이 생','동생','언니','누나','오빠','쌍둥이','형제','자매','남매']::text[], '{}'::text[], 25),
  ('family-grand', 'topic', '가족', '조부모·친척', null, '할머니·할아버지·이모·삼촌', array['할머니','할아버지','조부모','외할머니','친척','이모','고모','삼촌','사촌']::text[], array['외갓집','할머니 댁','할머니댁','할아버지 댁','할머니 집','할아버지 집','할머니와','할아버지와','할머니를 만나','할아버지를 만나']::text[], '{}'::text[], 26),
  ('world-friend', 'topic', '친구·세상', '친구', null, '사이좋게·다툼·화해', array['친구','우정','다툼','화해','사이좋게','갈등','관계']::text[], array['우정','화해','다툼','싸웠','단짝','새 친구']::text[], '{}'::text[], 27),
  ('world-kindness', 'topic', '친구·세상', '배려·협력', null, '나눔·양보·함께', array['배려','협력','나눔','양보','함께','공동체','도움','사회성']::text[], array['배려','양보','나눔','나누어','협력','힘을 합','도와주']::text[], '{}'::text[], 28),
  ('world-diversity', 'topic', '친구·세상', '다양성', null, '다른 생김새·장애·다른 나라', array['다양성','다름','차이','장애','다문화','다른 나라','세계','피부색','편견']::text[], array['다양성','다름','장애','다문화','편견','피부색','서로 다른']::text[], '{}'::text[], 29),
  ('world-school', 'topic', '친구·세상', '어린이집·유치원·학교', null, '첫 등원·입학·새 학기', array['어린이집','유치원','학교','초등학교','입학','새학기','새 학기','등원','선생님','적응']::text[], array['어린이집','유치원','학교','입학','새 학기','등원','선생님']::text[], '{}'::text[], 30),
  ('world-town', 'topic', '친구·세상', '우리 동네', null, '집·이사·가게·이웃·직업', array['동네','마을','집','이사','가게','시장','이웃','직업','소방관','경찰관','의사','택배','우체부']::text[], array['동네','이사','이웃','시장','가게','소방관','경찰관','우체부','택배','직업','마을']::text[], '{}'::text[], 31),
  ('world-trip', 'topic', '친구·세상', '여행·나들이', null, '캠핑·소풍·비행기 여행', array['여행','나들이','소풍','캠핑','휴가','방학','외출','크루즈','박물관']::text[], array['여행','나들이','소풍','캠핑','휴가','박물관']::text[], '{}'::text[], 32),
  ('animal-home', 'topic', '동물', '집·농장 동물', null, '강아지·고양이·소·닭', array['반려동물','농장','소','젖소','돼지','닭','병아리','오리','양','염소','말']::text[], array['반려동물','농장','젖소','송아지','돼지','꿀꿀','병아리','암탉','오리','염소','망아지']::text[], '{}'::text[], 33),
  ('animal-home-dog', 'detail', '동물', '강아지', 'animal-home', '강아지·멍멍이·반려견', array['강아지','개','멍멍이','멍멍','반려견','댕댕이']::text[], array['강아지','멍멍','반려견']::text[], '{}'::text[], 34),
  ('animal-home-cat', 'detail', '동물', '고양이', 'animal-home', '고양이·야옹이·반려묘', array['고양이','야옹이','야옹','냥이','반려묘']::text[], array['고양이','야옹','반려묘']::text[], '{}'::text[], 35),
  ('animal-forest', 'topic', '동물', '숲·들 동물', null, '토끼·곰·다람쥐·새', array['토끼','곰','다람쥐','여우','늑대','사슴','너구리','두더지','부엉이','올빼미','고슴도치','판다','참새','까치','새','새들','아기새','까마귀','비둘기','독수리','매','솔개','딱따구리','제비','꾀꼬리','뻐꾸기','종달새','종다리','박새','직박구리','동박새','물총새','꿩','까투리','백로','왜가리','황새','두루미','학','기러기','고니','백조','원앙','청둥오리','갈매기','펠리컨','홍학','플라밍고','공작','공작새','앵무새','잉꼬','카나리아','타조','벌새','큰부리새','철새']::text[], array['토끼','다람쥐','여우','늑대','사슴','너구리','두더지','부엉이','올빼미','고슴도치','판다','곰돌이','아기곰','반달곰','아기새','참새','까치','까마귀','비둘기','독수리','딱따구리','제비','꾀꼬리','뻐꾸기','두루미','기러기','백조','갈매기','앵무새','홍학','공작새','타조','철새']::text[], array['제비꽃','까치설날']::text[], 36),
  ('animal-savanna', 'topic', '동물', '초원·정글 동물', null, '사자·코끼리·기린·원숭이', array['사자','코끼리','기린','얼룩말','원숭이','하마','코뿔소','악어','호랑이','표범','동물원','정글','사파리']::text[], array['사자','코끼리','기린','얼룩말','원숭이','하마','코뿔소','악어','호랑이','표범','동물원','정글','사파리']::text[], '{}'::text[], 37),
  ('animal-cold', 'topic', '동물', '추운 곳 동물', null, '펭귄·북극곰·물개', array['펭귄','북극곰','물개','바다표범','순록','북극','남극']::text[], array['펭귄','북극곰','물개','바다표범','순록','북극','남극']::text[], '{}'::text[], 38),
  ('animal-sea', 'topic', '동물', '바다 동물', null, '물고기·고래·문어·게·조개', array['바다 동물','바다 생물','해양동물','해양생물','물고기','고래','돌고래','상어','문어','오징어','해파리','게','꽃게','조개','소라','불가사리','거북','바다거북','새우','가재']::text[], array['물고기','고래','돌고래','상어','문어','오징어','해파리','꽃게','조개','소라','불가사리','바다거북','새우','가재','해양']::text[], '{}'::text[], 39),
  ('animal-bug', 'topic', '동물', '곤충·벌레', null, '나비·개미·무당벌레·달팽이', array['곤충','벌레','나비','개미','벌','꿀벌','무당벌레','잠자리','매미','애벌레','달팽이','지렁이','거미','메뚜기','반딧불이']::text[], array['곤충','벌레','나비','개미','꿀벌','무당벌레','매미','애벌레','달팽이','지렁이','거미','메뚜기','반딧불']::text[], array['잠자리']::text[], 40),
  ('animal-dino', 'topic', '동물', '공룡', null, '티라노사우루스·화석', array['공룡','티라노','티라노사우루스','트리케라톱스','브라키오사우루스','화석','쥐라기','스테고사우루스','안킬로사우루스','벨로키랍토르','랩터','스피노사우루스','파키케팔로사우루스','파라사우롤로푸스','이구아노돈','디플로도쿠스','아파토사우루스','브론토사우루스','알로사우루스','기가노토사우루스','카르노타우루스','오비랍토르','프로토케라톱스','마이아사우라','람베오사우루스','에드몬토사우루스','테리지노사우루스','갈리미무스','딜로포사우루스','코리토사우루스','코리아노사우루스','부경고사우루스','익룡','프테라노돈','케찰코아틀루스','수장룡','플레시오사우루스','모사사우루스','어룡','백악기','트라이아스기','공룡알','고생물']::text[], array['공룡','티라노','사우루스','화석','쥐라기','케라톱스','랩터','익룡','수장룡','백악기','공룡알']::text[], '{}'::text[], 41),
  ('nature-plant', 'topic', '자연·계절', '식물', null, '꽃·나무·씨앗·텃밭', array['식물','꽃','나무','씨앗','새싹','텃밭','민들레','튤립','해바라기','열매','정원','화분']::text[], array['식물','씨앗','새싹','텃밭','민들레','튤립','해바라기','나무','꽃이 피','화분','정원']::text[], '{}'::text[], 42),
  ('nature-season', 'topic', '자연·계절', '계절·날씨', null, '봄·여름·가을·겨울·비·눈', array['계절','날씨','사계절']::text[], array['계절','날씨','사계절>nature-season-spring+nature-season-summer+nature-season-autumn+nature-season-winter']::text[], '{}'::text[], 43),
  ('nature-season-spring', 'detail', '자연·계절', '봄', 'nature-season', '벚꽃·새싹·꽃구경', array['봄','봄날','벚꽃','개나리','진달래','봄바람']::text[], array['봄날','봄이 오','봄바람','벚꽃','개나리','진달래']::text[], '{}'::text[], 44),
  ('nature-season-summer', 'detail', '자연·계절', '여름', 'nature-season', '물놀이·수박·더위', array['여름','물놀이','수박','더위','해수욕']::text[], array['여름','물놀이','수박','무더위','해수욕']::text[], '{}'::text[], 45),
  ('nature-season-autumn', 'detail', '자연·계절', '가을', 'nature-season', '낙엽·단풍·도토리', array['가을','낙엽','단풍','도토리','추수','허수아비']::text[], array['가을','낙엽','단풍','도토리','허수아비']::text[], '{}'::text[], 46),
  ('nature-season-winter', 'detail', '자연·계절', '겨울', 'nature-season', '눈사람·썰매·추위', array['겨울','눈사람','썰매','추위','겨울잠','눈싸움']::text[], array['겨울','눈사람','썰매','눈싸움','겨울잠','함박눈']::text[], '{}'::text[], 47),
  ('nature-season-weather', 'detail', '자연·계절', '비·눈·바람', 'nature-season', '비 오는 날·우산·무지개', array['비','비 오는 날','비오는날','장마','우산','빗방울','눈','눈 오는 날','함박눈','눈송이','바람','태풍','무지개','천둥']::text[], array['^비 오는','^비오는','^눈 오는','^눈오는','비가 오','빗방울','장마','우산','눈이 내','함박눈','눈송이','바람이 불','태풍','무지개','천둥','번개','소나기']::text[], '{}'::text[], 48),
  ('nature-sky', 'topic', '자연·계절', '하늘·우주', null, '달·별·해·구름·행성', array['하늘','우주','하늘 그림책']::text[], array['하늘','우주']::text[], array['하늘나라']::text[], 49),
  ('nature-sky-moon', 'detail', '자연·계절', '달', 'nature-sky', '달님·보름달·달빛', array['달','달님','보름달','반달','초승달','달빛','달나라','달토끼']::text[], array['달님','보름달','반달','초승달','달빛','달나라','달토끼','둥근 달']::text[], array['반달곰']::text[], 50),
  ('nature-sky-star', 'detail', '자연·계절', '별', 'nature-sky', '별님·별자리·밤하늘', array['별','별님','별빛','별자리','밤하늘','반짝반짝','별똥별']::text[], array['별님','별빛','별자리','밤하늘','별똥별']::text[], '{}'::text[], 51),
  ('nature-sky-space', 'detail', '자연·계절', '우주·행성', 'nature-sky', '로켓·행성·우주인', array['우주','행성','태양계','지구','화성','우주인','우주선','로켓']::text[], array['우주','행성','태양계','화성','우주인','우주선','우주비행사']::text[], '{}'::text[], 52),
  ('nature-sky-cloud', 'detail', '자연·계절', '구름', 'nature-sky', '뭉게구름·구름 모양·구름 위', array['구름','뭉게구름','먹구름','구름 모양','구름빵']::text[], array['구름','뭉게구름','먹구름']::text[], '{}'::text[], 53),
  ('nature-sky-sun', 'detail', '자연·계절', '해', 'nature-sky', '해님·햇빛·해돋이', array['해','해님','햇님','햇빛','태양','해돋이','일출','노을']::text[], array['해님','햇님','햇빛','태양','해돋이','노을']::text[], '{}'::text[], 54),
  ('nature-place', 'topic', '자연·계절', '바다·산·숲', null, '바다·산·숲·모래놀이', array['자연','강','계곡','호수','섬']::text[], array['계곡','호수']::text[], '{}'::text[], 55),
  ('nature-place-sea', 'detail', '자연·계절', '바다', 'nature-place', '바닷가·파도·갯벌', array['바다','바닷가','해변','파도','갯벌','조개껍데기','조개 줍기','해수욕장']::text[], array['바닷가','해변','파도','갯벌','조개껍데기']::text[], '{}'::text[], 56),
  ('nature-place-mountain', 'detail', '자연·계절', '산', 'nature-place', '등산·산꼭대기·뒷산', array['산','등산','산꼭대기','산길','뒷산','높은 산']::text[], array['등산','산꼭대기','산에 올','뒷산']::text[], '{}'::text[], 57),
  ('nature-place-forest', 'detail', '자연·계절', '숲', 'nature-place', '숲속·숲길·숲 놀이', array['숲','숲속','숲길','숲 놀이','숲 체험','숲유치원']::text[], array['숲속','숲에서','숲길','숲 놀이','숲으로']::text[], '{}'::text[], 58),
  ('nature-place-sand', 'detail', '자연·계절', '모래놀이', 'nature-place', '모래성·모래사장·삽과 양동이', array['모래','모래놀이','모래성','모래사장']::text[], array['모래놀이','모래성','모래사장']::text[], '{}'::text[], 59),
  ('nature-earth', 'topic', '자연·계절', '환경 지키기', null, '지구·쓰레기·재활용', array['환경','지구','쓰레기','재활용','분리수거','플라스틱','기후','오염','자연보호']::text[], array['환경 보호','환경을 지','환경오염','지구를 지','지구가 아','쓰레기','재활용','분리수거','플라스틱','기후 위기','기후 변화','오염']::text[], '{}'::text[], 60),
  ('nature-observe', 'topic', '자연·계절', '자연관찰·세밀화', null, '관찰·도감·세밀화', array['자연관찰','관찰','세밀화','도감','생태','자연 그림책']::text[], array['세밀화','도감','관찰','생태']::text[], '{}'::text[], 61),
  ('days-newyear', 'topic', '명절·기념일·전통', '설·새해', null, '떡국·세배·복주머니', array['설','설날','새해','떡국','세배','복주머니','까치설날','연날리기']::text[], array['설날','새해','떡국','세배','복주머니','연날리기']::text[], '{}'::text[], 62),
  ('days-chuseok', 'topic', '명절·기념일·전통', '추석', null, '송편·보름달·성묘', array['추석','한가위','송편','성묘','차례']::text[], array['추석','한가위','송편','성묘']::text[], '{}'::text[], 63),
  ('days-xmas', 'topic', '명절·기념일·전통', '크리스마스', null, '산타·선물·트리', array['크리스마스','성탄절','산타','산타클로스','루돌프','트리']::text[], array['크리스마스','성탄','산타','루돌프']::text[], '{}'::text[], 64),
  ('days-halloween', 'topic', '명절·기념일·전통', '할로윈', null, '호박·변장·사탕', array['할로윈','핼러윈','변장','유령','마녀']::text[], array['할로윈','핼러윈']::text[], '{}'::text[], 65),
  ('days-special', 'topic', '명절·기념일·전통', '특별한 날', null, '생일·기념일·공휴일', array['특별한 날','기념일','축하','기념']::text[], array['특별한 날','기념일']::text[], '{}'::text[], 66),
  ('days-special-birthday', 'detail', '명절·기념일·전통', '생일', 'days-special', '케이크·촛불·파티', array['생일','생일 축하','케이크','생일파티','돌잔치','돌잡이','촛불']::text[], array['생일','케이크','돌잔치','돌잡이']::text[], '{}'::text[], 67),
  ('days-special-day', 'detail', '명절·기념일·전통', '기념일', 'days-special', '어린이날·어버이날·결혼기념일', array['어린이날','어버이날','카네이션','가정의 달','스승의 날','결혼','결혼식','결혼기념일','웨딩']::text[], array['어린이날','어버이날','카네이션','결혼식','결혼기념일']::text[], '{}'::text[], 68),
  ('days-special-holiday', 'detail', '명절·기념일·전통', '공휴일', 'days-special', '삼일절·광복절·한글날', array['공휴일','국경일','빨간 날','대체공휴일','삼일절','3·1절','현충일','광복절','개천절','한글날','제헌절','부처님 오신 날','부처님오신날','석가탄신일','신정','태극기']::text[], array['공휴일','국경일','삼일절','현충일','광복절','개천절','부처님 오신 날','석가탄신일','태극기']::text[], '{}'::text[], 69),
  ('days-tradition', 'topic', '명절·기념일·전통', '전통·우리 것', null, '한복·한글·전통놀이·절기', array['전통','전래','한복','한글','한글날','전통놀이','윷놀이','제기차기','절기','동지','팥죽','단오','정월대보름','탈','풍습']::text[], array['전통','한복','한글','전통놀이','윷놀이','제기','절기','동지','팥죽','단오','대보름','풍습']::text[], '{}'::text[], 70),
  ('things-vehicle', 'topic', '탈것·음식·물건', '탈것', null, '자동차·기차·중장비·배', array['탈것','탈것 러버','교통기관','바퀴']::text[], array['탈것','교통']::text[], '{}'::text[], 71),
  ('things-vehicle-car', 'detail', '탈것·음식·물건', '자동차·버스', 'things-vehicle', '버스·택시·트럭·자전거', array['자동차','차','버스','택시','트럭','자전거','오토바이']::text[], array['자동차','버스','택시','트럭','자전거','오토바이']::text[], '{}'::text[], 72),
  ('things-vehicle-train', 'detail', '탈것·음식·물건', '기차·지하철', 'things-vehicle', '기차·열차·전철', array['기차','열차','지하철','전철','KTX','기찻길']::text[], array['기차','열차','지하철','전철','기찻길']::text[], '{}'::text[], 73),
  ('things-vehicle-heavy', 'detail', '탈것·음식·물건', '중장비·소방차', 'things-vehicle', '포크레인·소방차·구급차', array['중장비','중장비차','포크레인','굴착기','덤프트럭','레미콘','소방차','구급차','경찰차','믹서트럭','크레인','크레인카','견인차','레커차']::text[], array['중장비','포크레인','굴착기','덤프트럭','레미콘','소방차','구급차','경찰차','믹서트럭','크레인','견인차']::text[], '{}'::text[], 74),
  ('things-vehicle-plane', 'detail', '탈것·음식·물건', '비행기', 'things-vehicle', '비행기·헬리콥터·공항', array['비행기','헬리콥터','열기구','공항']::text[], array['비행기','헬리콥터','열기구','공항']::text[], '{}'::text[], 75),
  ('things-vehicle-ship', 'detail', '탈것·음식·물건', '배', 'things-vehicle', '보트·요트·크루즈', array['배','보트','요트','돛단배','여객선','크루즈','해적선','잠수함']::text[], array['보트','요트','돛단배','여객선','크루즈','해적선','잠수함','배를 타']::text[], '{}'::text[], 76),
  ('things-food', 'topic', '탈것·음식·물건', '음식', null, '과일·채소·빵·요리', array['음식','먹거리','요리','간식','초밥','김밥','국수','만두','떡','요리하기','요리사','요리 놀이']::text[], array['요리','김밥','초밥','국수','만두','요리사','요리 놀이']::text[], '{}'::text[], 77),
  ('things-food-fruit', 'detail', '탈것·음식·물건', '과일', 'things-food', '사과·딸기·바나나', array['과일','사과','딸기','바나나','수박','포도','복숭아','귤','열매']::text[], array['과일','사과','딸기','바나나','포도','복숭아']::text[], array['사과해','사과를 했','사과하','사과했']::text[], 78),
  ('things-food-veg', 'detail', '탈것·음식·물건', '채소', 'things-food', '당근·감자·브로콜리', array['채소','야채','당근','감자','고구마','양파','브로콜리','호박','가지','배추']::text[], array['채소','야채','당근','감자','고구마','양파','브로콜리','배추']::text[], '{}'::text[], 79),
  ('things-food-bread', 'detail', '탈것·음식·물건', '빵·간식', 'things-food', '빵·과자·아이스크림', array['빵','빵집','케이크','과자','사탕','아이스크림','쿠키','도넛','빵 굽기','베이킹','제빵']::text[], array['빵집','과자','사탕','아이스크림','쿠키','도넛','빵을 굽','베이킹','제빵']::text[], '{}'::text[], 80),
  ('things-objects', 'topic', '탈것·음식·물건', '생활 물건', null, '첫 낱말·옷·신발·장난감', array['사물','물건','첫 낱말','낱말','옷','신발','모자','가방','장난감','인형','컵','숟가락','생활도구','사물인지']::text[], array['낱말','사물','물건','장난감','인형','신발','가방','모자']::text[], '{}'::text[], 81),
  ('cog-words', 'topic', '말·인지', '말놀이·말배우기', null, '의성어·첫 말·끝말잇기', array['말놀이','말배우기','말놀이 그림책','의성어','의태어','흉내말','끝말잇기','첫 말','언어','동시','리듬','낱말']::text[], array['말놀이','의성어','의태어','흉내 내는 말','흉내말','끝말잇기','말배우기','동시']::text[], '{}'::text[], 82),
  ('cog-number', 'topic', '말·인지', '숫자·세기', null, '하나 둘 셋·더하기', array['숫자','수','수놀이','숫자 놀이','세기','하나 둘 셋','더하기','수학']::text[], array['숫자','수 세기','하나 둘','세어 보','수놀이','더하기']::text[], '{}'::text[], 83),
  ('cog-shape', 'topic', '말·인지', '모양·크기', null, '동그라미·네모·크다 작다', array['모양','도형','동그라미','세모','네모','크기','크다','작다','길다','짧다','비교']::text[], array['모양','도형','동그라미','세모','네모','크고 작','크기']::text[], '{}'::text[], 84),
  ('cog-color', 'topic', '말·인지', '색깔·초점책', null, '빨강·노랑·무지개·흑백 초점책', array['색깔','색','빨강','노랑','파랑','초록','무지개','알록달록','빨간색','주황','주황색','노란색','초록색','연두','연두색','파란색','하늘색','남색','보라','보라색','분홍','분홍색','핑크','하양','하얀색','흰색','검정','검은색','까만색','회색','갈색','금색','은색','흑백','무지개색','색 섞기','색깔 이름','초점책','흑백 초점책','흑백책','컬러 초점책']::text[], array['색깔','빨간색','노란색','파란색','알록달록','여러 가지 색','주황색','초록색','보라색','분홍색','하얀색','검은색','까만색','색깔 이름','색을 섞','초점책','흑백']::text[], '{}'::text[], 85),
  ('cog-time', 'topic', '말·인지', '시간·하루', null, '아침·밤·시계·요일', array['시간','하루','시계','아침','저녁','요일','일주일','어제','오늘','내일','시계 읽기','시계읽기','시계 보기','몇 시']::text[], array['시계','하루 동안','요일','일주일','몇 시','시계 읽기','시계를 보']::text[], '{}'::text[], 86),
  ('play-song', 'topic', '놀이·재미·상상', '노래·동요', null, '따라 부르기·리듬', array['노래','동요','노랫말','자장가','따라 부르기','리듬','챈트']::text[], array['동요','노래','노랫말','자장가']::text[], '{}'::text[], 87),
  ('play-body', 'topic', '놀이·재미·상상', '몸놀이', null, '따라 하기·간지럼·까꿍', array['몸놀이','따라 하기','행동','간지럼','까꿍','율동','체조','흉내']::text[], array['몸놀이','따라 해','따라 하','까꿍','간질','율동','체조']::text[], '{}'::text[], 88),
  ('play-funny', 'topic', '놀이·재미·상상', '웃음·유머', null, '엉뚱·반전·말장난', array['웃긴책','웃음','유머','엉뚱','반전','재미있는','말장난','코믹']::text[], array['유머','엉뚱','반전','폭소','배꼽 잡']::text[], '{}'::text[], 89),
  ('play-poop', 'topic', '놀이·재미·상상', '똥·방귀', null, '똥·방귀·코딱지', array['똥','방귀','응가','코딱지','트림','뿡']::text[], array['방귀','코딱지','똥이','똥을','똥 싸']::text[], '{}'::text[], 90),
  ('play-toybook', 'topic', '놀이·재미·상상', '토이북', null, '자석·스티커·팝업·숨은그림찾기', array['토이북','놀이책','활동책','숨은그림찾기','숨은그림','숨은 그림','자석책','자석','스티커북','스티커','플랩북','플랩','팝업북','팝업','조작북','사운드북','소리책','헝겊책','촉감책','병풍책','구멍책','거울책','목욕책','형태가 재밌는 책']::text[], array['토이북','놀이책','숨은그림','자석 놀이','자석책','스티커','플랩','팝업','사운드북','헝겊책','촉감책','병풍책','거울책']::text[], '{}'::text[], 91),
  ('play-interactive', 'topic', '놀이·재미·상상', '인터랙티브북', null, '누르기·흔들기·대답하기', array['인터랙티브','인터랙티브북','인터렉티브','인터렉티브북','참여형','참여형 그림책','상호작용','눌러 보세요','흔들어 보세요','두드려 보세요','책과 놀기']::text[], array['인터랙티브','인터렉티브','참여형','상호작용','눌러 보','흔들어 보','두드려 보','문질러 보','기울여 보']::text[], '{}'::text[], 92),
  ('play-character', 'topic', '놀이·재미·상상', '캐릭터', null, '폴리·카봇·타요·뽀로로·핑크퐁', array['캐릭터','캐릭터 그림책','캐릭터책','폴리','로보카 폴리','카봇','헬로카봇','타요','꼬마버스 타요','뽀로로','핑크퐁','아기상어','티니핑','캐치 티니핑','시크릿쥬쥬','콩순이','미피','페파피그','베이비버스','브레드이발소','띠띠뽀','코코몽','토마스']::text[], array['로보카 폴리','헬로카봇','꼬마버스 타요','뽀로로','핑크퐁','아기상어','티니핑','시크릿쥬쥬','콩순이','페파피그','띠띠뽀','코코몽','토마스와 친구들']::text[], '{}'::text[], 93),
  ('play-creative', 'topic', '놀이·재미·상상', '창의력', null, '다르게 보기·생각 놀이·착시', array['창의력','창의','창의성','상상력','생각 놀이','생각하기','다르게 보기','관점','착시','발상','정답 없는']::text[], array['창의력','창의성','상상력','다르게 보','생각해 보','착시','정답은 없']::text[], '{}'::text[], 94),
  ('play-fantasy', 'topic', '놀이·재미·상상', '상상·판타지', null, '괴물·마법·꿈·모험', array['상상','판타지','환상']::text[], '{}'::text[], '{}'::text[], 95),
  ('play-fantasy-monster', 'detail', '놀이·재미·상상', '괴물·도깨비', 'play-fantasy', '괴물·도깨비·유령', array['괴물','도깨비','유령','마녀','요괴','용','드래곤']::text[], array['괴물','도깨비','유령','마녀','드래곤']::text[], '{}'::text[], 96),
  ('play-fantasy-magic', 'detail', '놀이·재미·상상', '마법·신기한 일', 'play-fantasy', '마법·신기한 일·이상한 나라', array['마법','요술','신기한','마술','마법사','다른 세계','이상한 나라','상상 나라','비밀의 문','작아지','커지']::text[], array['마법','요술','마법사','신기한 일','이상한 나라','다른 세계','비밀의 문','작아져','커져','작아지','커지']::text[], '{}'::text[], 97),
  ('play-fantasy-dream', 'detail', '놀이·재미·상상', '꿈', 'play-fantasy', '꿈속·꿈나라', array['꿈','꿈나라','꿈속','잠든 사이']::text[], array['꿈속','꿈나라','꿈에서','꿈을 꾸']::text[], '{}'::text[], 98),
  ('play-fantasy-adventure', 'detail', '놀이·재미·상상', '모험·보물찾기', 'play-fantasy', '모험·탐험·보물섬', array['모험','탐험','보물','보물찾기','해적','보물섬','지도']::text[], array['모험','탐험','보물','해적','보물섬']::text[], '{}'::text[], 99);

-- 4) 기존 태그 처리 (mapping_v1.csv 37행). keep=true → 새 태그로 이어 씀(연결 유지), false → 숨김 보존
create temp table _map (old_name text, slug text, keep boolean, category text, action text) on commit drop;
insert into _map values
  ('나다움', 'mind-self', true, '마음·감정', '이름변경'),
  ('인성·감정·마음', 'legacy-2', false, '마음·감정', '보존(큰분류 연결)'),
  ('회복탄력성', 'mind-resilience', true, '마음·감정', '이름변경'),
  ('생활습관', 'body-habit', true, '몸·생활', '이동'),
  ('잠자리독서', 'body-habit-sleep', true, '몸·생활', '세부로 이동'),
  ('몸·건강', 'legacy-6', false, '몸·생활', '보존(큰분류 연결)'),
  ('아빠', 'family-dad', true, '가족', '그대로'),
  ('엄마', 'family-mom', true, '가족', '그대로'),
  ('형제자매', 'family-siblings', true, '가족', '그대로'),
  ('할머니·할아버지', 'family-grand', true, '가족', '이름변경'),
  ('친척', 'legacy-11', false, '가족', '보존(큰분류 연결)'),
  ('친구', 'world-friend', true, '친구·세상', '이동'),
  ('배려·협력', 'world-kindness', true, '친구·세상', '이동'),
  ('다양성', 'world-diversity', true, '친구·세상', '이동'),
  ('기관/학교', 'world-school', true, '친구·세상', '이름변경'),
  ('이별', 'mind-farewell', true, '마음·감정', '이름변경'),
  ('동물', 'legacy-17', false, '동물', '보존(큰분류 연결)'),
  ('공룡', 'animal-dino', true, '동물', '이동'),
  ('곤충', 'animal-bug', true, '동물', '이름변경'),
  ('식물', 'nature-plant', true, '자연·계절', '이동'),
  ('계절', 'nature-season', true, '자연·계절', '이름변경'),
  ('바다', 'nature-place-sea', true, '자연·계절', '세부로 이동'),
  ('과일', 'things-food-fruit', true, '탈것·음식·물건', '세부로 이동'),
  ('하늘·우주', 'nature-sky', true, '자연·계절', '이동'),
  ('채소', 'things-food-veg', true, '탈것·음식·물건', '세부로 이동'),
  ('탈것', 'things-vehicle', true, '탈것·음식·물건', '이동'),
  ('음식', 'things-food', true, '탈것·음식·물건', '이동'),
  ('색깔', 'cog-color', true, '말·인지', '이동'),
  ('명절·기념일·전통', 'legacy-29', false, '명절·기념일·전통', '보존(큰분류 연결)'),
  ('시간', 'cog-time', true, '말·인지', '이름변경'),
  ('말놀이·수놀이', 'legacy-31', false, '말·인지', '보존(큰분류 연결)'),
  ('똥·방귀', 'play-poop', true, '놀이·재미·상상', '이동'),
  ('캐릭터', 'play-character', true, '놀이·재미·상상', '이동'),
  ('생일', 'days-special-birthday', true, '명절·기념일·전통', '세부로 이동'),
  ('형태가재밌는북', 'play-toybook', true, '놀이·재미·상상', '이름변경'),
  ('몸놀이', 'play-body', true, '놀이·재미·상상', '이동'),
  ('숨은그림찾기', 'legacy-37', false, '놀이·재미·상상', '보존(큰분류 연결)');

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
  ('dec9883a-0019-4994-89cc-a0b6a03fa5d7'::uuid, 'mind-feelings'),
  ('dec9883a-0019-4994-89cc-a0b6a03fa5d7'::uuid, 'mind-self'),
  ('dec9883a-0019-4994-89cc-a0b6a03fa5d7'::uuid, 'nature-sky'),
  ('dec9883a-0019-4994-89cc-a0b6a03fa5d7'::uuid, 'nature-sky-cloud'),
  ('71e5ef9b-a621-49af-97df-ddbdabcc4575'::uuid, 'mind-feelings'),
  ('71e5ef9b-a621-49af-97df-ddbdabcc4575'::uuid, 'mind-love'),
  ('5fcd27ea-72bd-4afd-98c4-3611f8ad3409'::uuid, 'mind-feelings'),
  ('5fcd27ea-72bd-4afd-98c4-3611f8ad3409'::uuid, 'mind-resilience'),
  ('816aac8a-5a0b-43fb-972b-52d93455d3f0'::uuid, 'mind-feelings'),
  ('816aac8a-5a0b-43fb-972b-52d93455d3f0'::uuid, 'mind-self'),
  ('b841ceb8-5d5c-4a18-8f52-74341cf53351'::uuid, 'mind-feelings'),
  ('c16dd511-9163-4aa7-9210-e425374779ff'::uuid, 'mind-feelings'),
  ('c16dd511-9163-4aa7-9210-e425374779ff'::uuid, 'mind-comfort'),
  ('831fc8ce-b661-4960-9333-534eca4d9f78'::uuid, 'mind-feelings'),
  ('831fc8ce-b661-4960-9333-534eca4d9f78'::uuid, 'mind-self'),
  ('65429844-ea9d-4f44-9036-0cdbca9c604c'::uuid, 'mind-feelings'),
  ('65429844-ea9d-4f44-9036-0cdbca9c604c'::uuid, 'mind-comfort'),
  ('65429844-ea9d-4f44-9036-0cdbca9c604c'::uuid, 'mind-self'),
  ('c11e3ad5-1045-4c0a-ac67-08af6ee81219'::uuid, 'mind-feelings'),
  ('c11e3ad5-1045-4c0a-ac67-08af6ee81219'::uuid, 'mind-love'),
  ('c11e3ad5-1045-4c0a-ac67-08af6ee81219'::uuid, 'mind-self'),
  ('c11e3ad5-1045-4c0a-ac67-08af6ee81219'::uuid, 'days-special'),
  ('c11e3ad5-1045-4c0a-ac67-08af6ee81219'::uuid, 'days-special-birthday'),
  ('76c9d707-1341-4989-83af-bcd67835e7d0'::uuid, 'mind-feelings'),
  ('76c9d707-1341-4989-83af-bcd67835e7d0'::uuid, 'mind-love'),
  ('641687a5-f05b-4c06-b901-1a99515f1b4d'::uuid, 'mind-feelings'),
  ('641687a5-f05b-4c06-b901-1a99515f1b4d'::uuid, 'mind-love'),
  ('641687a5-f05b-4c06-b901-1a99515f1b4d'::uuid, 'family-mom'),
  ('904891fa-1f2e-4719-9f59-ed42a8926002'::uuid, 'mind-feelings'),
  ('06950b6e-02bd-4bf5-a507-85f46828b22e'::uuid, 'mind-feelings'),
  ('06950b6e-02bd-4bf5-a507-85f46828b22e'::uuid, 'world-friend'),
  ('b1a01d77-10c6-4d11-aeca-ef8357233efe'::uuid, 'mind-feelings'),
  ('b1a01d77-10c6-4d11-aeca-ef8357233efe'::uuid, 'things-food'),
  ('b1a01d77-10c6-4d11-aeca-ef8357233efe'::uuid, 'animal-home'),
  ('b1a01d77-10c6-4d11-aeca-ef8357233efe'::uuid, 'animal-forest'),
  ('372d9ec1-288f-4bd6-a52d-758fa9cc65be'::uuid, 'mind-feelings'),
  ('372d9ec1-288f-4bd6-a52d-758fa9cc65be'::uuid, 'family-siblings'),
  ('7cd2a7b1-6c66-4d6e-b9d7-32069d9f732b'::uuid, 'mind-feelings'),
  ('7cd2a7b1-6c66-4d6e-b9d7-32069d9f732b'::uuid, 'world-friend'),
  ('7cd2a7b1-6c66-4d6e-b9d7-32069d9f732b'::uuid, 'play-fantasy'),
  ('7cd2a7b1-6c66-4d6e-b9d7-32069d9f732b'::uuid, 'play-fantasy-adventure'),
  ('7cd2a7b1-6c66-4d6e-b9d7-32069d9f732b'::uuid, 'animal-sea'),
  ('7cd2a7b1-6c66-4d6e-b9d7-32069d9f732b'::uuid, 'nature-place'),
  ('602582fe-4198-4146-92ff-3057d413d3fe'::uuid, 'mind-feelings'),
  ('602582fe-4198-4146-92ff-3057d413d3fe'::uuid, 'mind-love'),
  ('602582fe-4198-4146-92ff-3057d413d3fe'::uuid, 'play-fantasy'),
  ('602582fe-4198-4146-92ff-3057d413d3fe'::uuid, 'play-fantasy-magic'),
  ('602582fe-4198-4146-92ff-3057d413d3fe'::uuid, 'things-food'),
  ('602582fe-4198-4146-92ff-3057d413d3fe'::uuid, 'things-food-bread'),
  ('602582fe-4198-4146-92ff-3057d413d3fe'::uuid, 'nature-sky'),
  ('602582fe-4198-4146-92ff-3057d413d3fe'::uuid, 'nature-sky-cloud'),
  ('649e5555-0302-42c6-a239-06d280d76e78'::uuid, 'mind-feelings'),
  ('649e5555-0302-42c6-a239-06d280d76e78'::uuid, 'world-kindness'),
  ('649e5555-0302-42c6-a239-06d280d76e78'::uuid, 'world-friend'),
  ('5fdd322b-41db-4a07-8903-7e63df06dbb3'::uuid, 'mind-feelings'),
  ('5fdd322b-41db-4a07-8903-7e63df06dbb3'::uuid, 'mind-love'),
  ('6039279f-b096-4e5b-a246-a13040fc8dbd'::uuid, 'mind-feelings'),
  ('6039279f-b096-4e5b-a246-a13040fc8dbd'::uuid, 'mind-love'),
  ('1d81ef8f-bef4-405c-95d3-2e4b036e0a55'::uuid, 'mind-feelings'),
  ('1d81ef8f-bef4-405c-95d3-2e4b036e0a55'::uuid, 'mind-self'),
  ('b7725147-1f59-4bf5-86d0-b2944212c4a6'::uuid, 'mind-feelings'),
  ('b7725147-1f59-4bf5-86d0-b2944212c4a6'::uuid, 'mind-comfort'),
  ('9d3ac6c5-1457-46a5-9d82-c3a8c01caae7'::uuid, 'animal-home'),
  ('9d3ac6c5-1457-46a5-9d82-c3a8c01caae7'::uuid, 'world-trip'),
  ('9d3ac6c5-1457-46a5-9d82-c3a8c01caae7'::uuid, 'play-toybook'),
  ('414e8c82-4588-41f4-b7a5-ec24f186e0e3'::uuid, 'animal-home'),
  ('414e8c82-4588-41f4-b7a5-ec24f186e0e3'::uuid, 'play-body'),
  ('66718726-4d73-424b-afcf-bba4bf158516'::uuid, 'animal-home'),
  ('4b6fff83-8476-498e-99f9-3481874e13c6'::uuid, 'animal-forest'),
  ('3f48d225-2558-4a45-b05d-fc35150c173a'::uuid, 'animal-home'),
  ('aa767d35-0679-4eca-a8ed-db5c10f8ec55'::uuid, 'animal-forest'),
  ('aa767d35-0679-4eca-a8ed-db5c10f8ec55'::uuid, 'animal-home'),
  ('aa767d35-0679-4eca-a8ed-db5c10f8ec55'::uuid, 'play-poop'),
  ('6e1b17c5-c0b9-449b-92a8-64918c715abf'::uuid, 'animal-forest'),
  ('6e1b17c5-c0b9-449b-92a8-64918c715abf'::uuid, 'days-chuseok'),
  ('6e1b17c5-c0b9-449b-92a8-64918c715abf'::uuid, 'nature-sky'),
  ('6e1b17c5-c0b9-449b-92a8-64918c715abf'::uuid, 'nature-sky-moon'),
  ('eb36440f-27c0-4e19-bfe2-f04ff028760d'::uuid, 'cog-number'),
  ('eb36440f-27c0-4e19-bfe2-f04ff028760d'::uuid, 'animal-forest'),
  ('eb36440f-27c0-4e19-bfe2-f04ff028760d'::uuid, 'animal-home'),
  ('eb36440f-27c0-4e19-bfe2-f04ff028760d'::uuid, 'animal-savanna'),
  ('3099a0e2-987e-44ec-9c85-dd1aa6027e20'::uuid, 'animal-forest'),
  ('3099a0e2-987e-44ec-9c85-dd1aa6027e20'::uuid, 'animal-savanna'),
  ('3099a0e2-987e-44ec-9c85-dd1aa6027e20'::uuid, 'cog-words'),
  ('3099a0e2-987e-44ec-9c85-dd1aa6027e20'::uuid, 'things-food'),
  ('3099a0e2-987e-44ec-9c85-dd1aa6027e20'::uuid, 'things-food-fruit'),
  ('d930e309-c42b-4ee7-8b97-9814c4b76270'::uuid, 'nature-season'),
  ('d930e309-c42b-4ee7-8b97-9814c4b76270'::uuid, 'nature-season-spring'),
  ('d930e309-c42b-4ee7-8b97-9814c4b76270'::uuid, 'nature-observe'),
  ('d930e309-c42b-4ee7-8b97-9814c4b76270'::uuid, 'animal-home'),
  ('d930e309-c42b-4ee7-8b97-9814c4b76270'::uuid, 'things-food'),
  ('d930e309-c42b-4ee7-8b97-9814c4b76270'::uuid, 'things-food-veg'),
  ('e50cc8fc-4181-4bbc-bdc1-c38bfba31bc3'::uuid, 'animal-sea'),
  ('816aac8a-5a0b-43fb-972b-52d93455d3f0'::uuid, 'animal-forest'),
  ('735af33e-3a9e-4125-87f0-15b57c7f4e5f'::uuid, 'play-body'),
  ('735af33e-3a9e-4125-87f0-15b57c7f4e5f'::uuid, 'animal-forest'),
  ('735af33e-3a9e-4125-87f0-15b57c7f4e5f'::uuid, 'animal-savanna'),
  ('735af33e-3a9e-4125-87f0-15b57c7f4e5f'::uuid, 'animal-home'),
  ('9da57952-8567-4d5e-a077-672333591352'::uuid, 'play-creative'),
  ('65ebb0b8-b2ee-4530-97e4-776730935913'::uuid, 'things-food'),
  ('65ebb0b8-b2ee-4530-97e4-776730935913'::uuid, 'things-food-bread'),
  ('99393d4d-3834-4c09-b859-3b97ecd5665a'::uuid, 'body-me'),
  ('99393d4d-3834-4c09-b859-3b97ecd5665a'::uuid, 'animal-forest'),
  ('b1a01d77-10c6-4d11-aeca-ef8357233efe'::uuid, 'animal-home'),
  ('b1a01d77-10c6-4d11-aeca-ef8357233efe'::uuid, 'things-food'),
  ('b1a01d77-10c6-4d11-aeca-ef8357233efe'::uuid, 'things-food-veg'),
  ('b1a01d77-10c6-4d11-aeca-ef8357233efe'::uuid, 'play-toybook'),
  ('aaaf152a-7578-474a-9543-71a51e5789ba'::uuid, 'body-me'),
  ('c02ea222-0a19-4466-a9a7-74f3cc779e52'::uuid, 'body-me'),
  ('10adb16b-842d-4d0d-bff2-8dc6046f0785'::uuid, 'body-me'),
  ('ecb4c184-4d9e-4f04-b128-cc06091c736f'::uuid, 'mind-farewell'),
  ('13adeb29-be5a-4d95-8cd2-9d146608704e'::uuid, 'body-habit'),
  ('13adeb29-be5a-4d95-8cd2-9d146608704e'::uuid, 'body-habit-eat'),
  ('e6af3eba-bd13-4dd7-b173-5ce17cbc912d'::uuid, 'body-sick'),
  ('13cc17cf-cae7-4db8-9649-347bd5807bba'::uuid, 'body-safety'),
  ('ab80d3a1-f291-498c-9bcc-e48bedbfdbb3'::uuid, 'body-safety'),
  ('95fb35f1-a655-41b3-9341-1d0a342c18bb'::uuid, 'days-special'),
  ('95fb35f1-a655-41b3-9341-1d0a342c18bb'::uuid, 'days-special-birthday'),
  ('662ec5d3-868a-420c-9df4-4bf2470b6006'::uuid, 'body-habit'),
  ('662ec5d3-868a-420c-9df4-4bf2470b6006'::uuid, 'body-habit-eat'),
  ('cd0efe8d-689d-424a-b885-e73031a54876'::uuid, 'body-habit'),
  ('cd0efe8d-689d-424a-b885-e73031a54876'::uuid, 'body-habit-eat'),
  ('e3dacd81-d132-43d3-9c1d-c1e08eea2f9e'::uuid, 'cog-shape'),
  ('0b03b07d-2020-4a8f-8175-d865bf8301c9'::uuid, 'cog-words'),
  ('c3223cd7-3ffc-4c63-8c14-acc673fecc8f'::uuid, 'days-special'),
  ('c3223cd7-3ffc-4c63-8c14-acc673fecc8f'::uuid, 'days-special-birthday'),
  ('c3223cd7-3ffc-4c63-8c14-acc673fecc8f'::uuid, 'things-vehicle'),
  ('c3223cd7-3ffc-4c63-8c14-acc673fecc8f'::uuid, 'cog-words'),
  ('1cdcbd58-f6c6-4763-9b46-de2d00f42a9d'::uuid, 'cog-words'),
  ('67329fc9-f10f-46a4-a834-f6c229ced4c8'::uuid, 'play-creative'),
  ('0cb1ff0f-029c-4c6f-8a63-0af015ae9f79'::uuid, 'cog-number'),
  ('5171cce6-c9c6-427d-bc16-c6fdcfac05f2'::uuid, 'animal-dino'),
  ('5171cce6-c9c6-427d-bc16-c6fdcfac05f2'::uuid, 'cog-words'),
  ('5171cce6-c9c6-427d-bc16-c6fdcfac05f2'::uuid, 'body-habit'),
  ('5171cce6-c9c6-427d-bc16-c6fdcfac05f2'::uuid, 'body-habit-sleep'),
  ('5171cce6-c9c6-427d-bc16-c6fdcfac05f2'::uuid, 'play-interactive'),
  ('a958d6ff-ef33-4884-a7f9-c461057cb843'::uuid, 'cog-number'),
  ('c4dfabf2-0e17-4bae-9b4b-f38b983bd904'::uuid, 'cog-number'),
  ('94056670-2a9a-4e5c-9f28-183b38a19241'::uuid, 'days-special'),
  ('94056670-2a9a-4e5c-9f28-183b38a19241'::uuid, 'days-special-birthday'),
  ('edb8f138-ef9f-4ca4-92be-3107cf706cdb'::uuid, 'days-chuseok'),
  ('edb8f138-ef9f-4ca4-92be-3107cf706cdb'::uuid, 'animal-forest'),
  ('edb8f138-ef9f-4ca4-92be-3107cf706cdb'::uuid, 'nature-sky'),
  ('edb8f138-ef9f-4ca4-92be-3107cf706cdb'::uuid, 'nature-sky-moon'),
  ('b34197df-d95b-4f04-87b9-ed4432ae7f5b'::uuid, 'body-me'),
  ('b34197df-d95b-4f04-87b9-ed4432ae7f5b'::uuid, 'days-tradition'),
  ('724c64c9-dcea-49d9-bea8-14e403dd125f'::uuid, 'mind-self'),
  ('91a2e1b3-6a06-4a31-83ba-4692ca21dda2'::uuid, 'animal-forest'),
  ('91a2e1b3-6a06-4a31-83ba-4692ca21dda2'::uuid, 'things-food'),
  ('91a2e1b3-6a06-4a31-83ba-4692ca21dda2'::uuid, 'things-food-bread'),
  ('9636750f-124e-4e9d-a805-74597c9ec170'::uuid, 'body-safety'),
  ('823da085-9f79-4aec-aa8c-7994ee2dc33d'::uuid, 'play-toybook'),
  ('823da085-9f79-4aec-aa8c-7994ee2dc33d'::uuid, 'play-creative'),
  ('823da085-9f79-4aec-aa8c-7994ee2dc33d'::uuid, 'cog-shape'),
  ('9ce709f7-8f67-4dd4-b7d9-fc0f551a00e7'::uuid, 'play-interactive'),
  ('01d8df1d-7631-479f-922e-ee2ef74504f2'::uuid, 'play-toybook'),
  ('01d8df1d-7631-479f-922e-ee2ef74504f2'::uuid, 'nature-plant'),
  ('01d8df1d-7631-479f-922e-ee2ef74504f2'::uuid, 'play-fantasy'),
  ('01d8df1d-7631-479f-922e-ee2ef74504f2'::uuid, 'play-fantasy-magic'),
  ('01d8df1d-7631-479f-922e-ee2ef74504f2'::uuid, 'play-interactive'),
  ('6e46cdec-8a78-445e-9afa-0da1a76c7d1c'::uuid, 'animal-sea'),
  ('91ff0d39-ce74-4796-9038-2effb9ff8df2'::uuid, 'cog-color'),
  ('91ff0d39-ce74-4796-9038-2effb9ff8df2'::uuid, 'play-creative'),
  ('91ff0d39-ce74-4796-9038-2effb9ff8df2'::uuid, 'mind-love'),
  ('173553ae-e5d4-45b3-b70b-410f0b1c2d98'::uuid, 'mind-love'),
  ('173553ae-e5d4-45b3-b70b-410f0b1c2d98'::uuid, 'family-mom'),
  ('173553ae-e5d4-45b3-b70b-410f0b1c2d98'::uuid, 'play-toybook'),
  ('6e32a532-f95f-45c9-b6d5-38a43f7013eb'::uuid, 'play-toybook'),
  ('6e32a532-f95f-45c9-b6d5-38a43f7013eb'::uuid, 'things-food'),
  ('6e32a532-f95f-45c9-b6d5-38a43f7013eb'::uuid, 'things-food-bread'),
  ('3c34ce26-c585-4f2d-b094-86c1779cbba7'::uuid, 'animal-home'),
  ('b8baaeaa-aa84-416b-94f4-303f7879b2ff'::uuid, 'things-vehicle'),
  ('b8baaeaa-aa84-416b-94f4-303f7879b2ff'::uuid, 'things-vehicle-heavy'),
  ('8f8d5702-8867-4791-a5db-5ca9d7afc2ac'::uuid, 'animal-sea');
insert into public.post_tags (post_id, tag_id, is_operator_tag, source)
select distinct a.post_id, o.id, true, 'reclassify'
  from _add a join public.operator_tags o on o.slug = a.slug
 where exists (select 1 from public.posts p where p.id = a.post_id)
   and not exists (select 1 from public.post_tags pt where pt.post_id = a.post_id and pt.tag_id = o.id);

-- 8-1) 재분류로 떼는 연결 (캐릭터 책 아님 2건, 토이북 아님 1건)
create temp table _del (post_id uuid, slug text) on commit drop;
insert into _del values
  ('724c64c9-dcea-49d9-bea8-14e403dd125f'::uuid, 'play-character'),
  ('91a2e1b3-6a06-4a31-83ba-4692ca21dda2'::uuid, 'play-character'),
  ('91ff0d39-ce74-4796-9038-2effb9ff8df2'::uuid, 'play-toybook');
delete from public.post_tags pt using _del d, public.operator_tags o
 where o.slug = d.slug and pt.post_id = d.post_id and pt.tag_id = o.id;

-- 9) 검증 — 하나라도 틀리면 전체 되돌림
do $$ declare n int; m int; begin
  select count(*) into n from public.operator_tags where is_active and level = 'topic';
  if n <> 56 then raise exception '활성 주제 수 % (기대 56)', n; end if;
  select count(*) into n from public.operator_tags where is_active and level = 'detail';
  if n <> 43 then raise exception '활성 세부 수 % (기대 43)', n; end if;
  select count(*) into n from public.operator_tags where slug is null;
  if n > 0 then raise exception 'slug 없는 태그 %개 (매핑표에 없는 기존 태그)', n; end if;
  select count(*) into n from public.operator_tags where tag_category is null;
  if n > 0 then raise exception '큰 분류 없는 태그 %개', n; end if;
  select count(*) into n from public.post_tags;
  select post_tags_n into m from _before;
  if n < m - 3 then raise exception '연결 수 감소: % → %', m, n; end if;
  select count(*) into n from _add a where not exists (select 1 from public.posts p where p.id = a.post_id);
  if n > 0 then raise exception '재분류 대상 기록 %건이 DB에 없음', n; end if;
end $$;

-- 9-1) 피드 뷰에 태그 slug 열(op_slugs) 추가 — 주제·큰 분류 필터와 표시가 slug 기준으로 바뀜
create or replace view public.book_feed_cards
with (security_invoker = true) as
select
  b.id                              as book_id,
  b.book_key,
  b.title,
  b.cover_image_url,
  b.published_date,
  coalesce(b.bookmark_count, 0)     as bookmark_count,
  coalesce(b.is_board_book, false)  as is_board_book,
  s.record_count,
  s.recommend_count,
  s.reaction,
  s.density,
  s.latest_created_at,
  s.group_post_counts,
  s.op_topics,
  s.op_categories,
  s.custom_topics,
  s.op_slugs
from public.books b
cross join lateral (
  select
    -- 기록 수(반응 무관, 숨김 제외)
    (select count(*)::int from public.posts p
      where p.book_id = b.id and p.hidden_at is null)                                   as record_count,
    -- 추천한 사람 수(user당 1행)
    (select count(*)::int from public.likes l where l.book_id = b.id)                  as recommend_count,
    -- 대표 반응 = 자격 기록 최빈값(동률이면 큰 값)
    (select p.child_reaction from public.posts p
      where p.book_id = b.id and p.hidden_at is null and p.child_reaction >= 2
      group by p.child_reaction
      order by count(*) desc, p.child_reaction desc limit 1)                            as reaction,
    -- 글밥량 대표값 = 전체 기록 최빈값(동률이면 큰 값), 없으면 0
    coalesce((select p.text_density from public.posts p
      where p.book_id = b.id and p.hidden_at is null and p.text_density is not null
      group by p.text_density
      order by count(*) desc, p.text_density desc limit 1), 0)                         as density,
    -- 최신 자격 기록 시각
    (select max(p.created_at) from public.posts p
      where p.book_id = b.id and p.hidden_at is null and p.child_reaction >= 2)         as latest_created_at,
    -- 시기별 자격 기록 수 {"꽃잎": 2, ...} — 키 = 이 책의 시기 합집합, 값 합산 = 시기별 누적 기록 수
    coalesce((select jsonb_object_agg(t.group_name, t.c) from (
      select pg.group_name, count(*)::int as c
      from public.posts p join public.post_groups pg on pg.post_id = p.id
      where p.book_id = b.id and p.hidden_at is null and p.child_reaction >= 2
      group by pg.group_name) t), '{}'::jsonb)                                          as group_post_counts,
    -- 운영자 태그명: 가장 최근 기록에 처음 등장한 순(같은 기록 안에서는 저장 순서 seq)
    coalesce((select array_agg(t.name order by t.last_seen desc, t.first_seq) from (
      select distinct on (ot.name) ot.name, p.created_at as last_seen, pt.seq as first_seq
      from public.posts p
      join public.post_tags pt on pt.post_id = p.id
      join public.operator_tags ot on ot.id = pt.tag_id
      where p.book_id = b.id and p.hidden_at is null and p.child_reaction >= 2
        and pt.is_operator_tag
      order by ot.name, p.created_at desc, pt.seq) t), '{}')                            as op_topics,
    -- 운영자 태그 카테고리(커스텀 태그 중복 제거용)
    coalesce((select array_agg(distinct ot.tag_category)
      from public.posts p
      join public.post_tags pt on pt.post_id = p.id
      join public.operator_tags ot on ot.id = pt.tag_id
      where p.book_id = b.id and p.hidden_at is null and p.child_reaction >= 2
        and pt.is_operator_tag and ot.tag_category is not null), '{}')                  as op_categories,
    -- 커스텀 태그: 가장 최근 기록에 처음 등장한 순(같은 기록 안에서는 저장 순서 seq)
    coalesce((select array_agg(t.custom_tag order by t.last_seen desc, t.first_seq) from (
      select distinct on (pt.custom_tag) pt.custom_tag, p.created_at as last_seen, pt.seq as first_seq
      from public.posts p join public.post_tags pt on pt.post_id = p.id
      where p.book_id = b.id and p.hidden_at is null and p.child_reaction >= 2
        and not pt.is_operator_tag and pt.custom_tag is not null
      order by pt.custom_tag, p.created_at desc, pt.seq) t), '{}')                      as custom_topics,
    -- 운영자 태그 slug(숨김 포함): 가장 최근 기록에 처음 등장한 순 — 주제·큰 분류 필터와 표시용(2026.10 주제 개편)
    coalesce((select array_agg(t.slug order by t.last_seen desc, t.first_seq) from (
      select distinct on (ot.slug) ot.slug, p.created_at as last_seen, pt.seq as first_seq
      from public.posts p
      join public.post_tags pt on pt.post_id = p.id
      join public.operator_tags ot on ot.id = pt.tag_id
      where p.book_id = b.id and p.hidden_at is null and p.child_reaction >= 2
        and pt.is_operator_tag and ot.slug is not null
      order by ot.slug, p.created_at desc, pt.seq) t), '{}')                            as op_slugs
) s
where exists (  -- 피드 노출 자격 기록이 1건 이상인 책만
  select 1 from public.posts p
  where p.book_id = b.id and p.hidden_at is null and p.child_reaction >= 2
);
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
