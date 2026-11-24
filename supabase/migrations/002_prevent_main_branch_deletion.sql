-- Prevent deletion of branches marked as the main branch.
create or replace function public.prevent_main_branch_deletion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if old.is_main = true then
        raise exception using
            errcode = '23514',
            message = 'The main branch cannot be deleted. Assign another branch as main first.';
    end if;

    return old;
end;
$$;

drop trigger if exists branches_prevent_main_deletion
on public.branches;

create trigger branches_prevent_main_deletion
before delete on public.branches
for each row
execute function public.prevent_main_branch_deletion();
