alter table books
  add column if not exists bookmark_count integer not null default 0;

create or replace function sync_book_bookmark_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (TG_OP = 'INSERT') then
    update books set bookmark_count = bookmark_count + 1
     where id = NEW.book_id;
  elsif (TG_OP = 'DELETE') then
    update books set bookmark_count = greatest(bookmark_count - 1, 0)
     where id = OLD.book_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_bookmarks_count on bookmarks;
create trigger trg_bookmarks_count
after insert or delete on bookmarks
for each row execute function sync_book_bookmark_count();

update books b
   set bookmark_count = coalesce(c.cnt, 0)
  from (select book_id, count(*) as cnt from bookmarks group by book_id) c
 where b.id = c.book_id;
