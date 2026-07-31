alter table bookmarks
  add column if not exists book_id uuid references books(id) on delete cascade;

update bookmarks b
   set book_id = p.book_id
  from posts p
 where b.post_id = p.id
   and b.book_id is null;

delete from bookmarks a
 using bookmarks b
 where a.user_id = b.user_id
   and a.book_id = b.book_id
   and a.ctid    > b.ctid;

delete from bookmarks where book_id is null;

alter table bookmarks drop column if exists post_id;
alter table bookmarks alter column book_id set not null;
alter table bookmarks
  add constraint bookmarks_user_book_unique unique (user_id, book_id);
