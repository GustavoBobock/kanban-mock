
-- Tabela de Perfis (Profiles)
create table public.profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,

  constraint username_length check (char_length(username) >= 3)
);

alter table public.profiles enable row level security;

create policy "Perfis visíveis publicamente."
  on profiles for select
  using ( true );

create policy "Usuários podem criar seu próprio perfil."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Usuários podem atualizar seu próprio perfil."
  on profiles for update
  using ( auth.uid() = id );

-- Criação automática de perfil ao cadastrar usuário
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- Tabela de Quadros (Boards)
create table public.boards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  title text not null default 'Meu Quadro',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.boards enable row level security;

create policy "Usuários podem ver seus próprios quadros."
  on boards for select
  using ( auth.uid() = user_id );

create policy "Usuários podem criar quadros."
  on boards for insert
  with check ( auth.uid() = user_id );

create policy "Usuários podem atualizar seus quadros."
  on boards for update
  using ( auth.uid() = user_id );

create policy "Usuários podem deletar seus quadros."
  on boards for delete
  using ( auth.uid() = user_id );


-- Tabela de Colunas (Columns)
create table public.columns (
  id uuid default gen_random_uuid() primary key,
  board_id uuid references public.boards(id) on delete cascade not null,
  title text not null,
  position integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.columns enable row level security;

create policy "Usuários podem ver colunas de seus quadros."
  on columns for select
  using ( exists ( select 1 from boards where boards.id = columns.board_id and boards.user_id = auth.uid() ) );

create policy "Usuários podem criar colunas em seus quadros."
  on columns for insert
  with check ( exists ( select 1 from boards where boards.id = columns.board_id and boards.user_id = auth.uid() ) );

create policy "Usuários podem atualizar colunas em seus quadros."
  on columns for update
  using ( exists ( select 1 from boards where boards.id = columns.board_id and boards.user_id = auth.uid() ) );

create policy "Usuários podem deletar colunas em seus quadros."
  on columns for delete
  using ( exists ( select 1 from boards where boards.id = columns.board_id and boards.user_id = auth.uid() ) );


-- Tabela de Tarefas (Tasks)
create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  column_id uuid references public.columns(id) on delete cascade not null,
  title text not null,
  description text,
  position integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.tasks enable row level security;

create policy "Usuários podem ver tarefas de seus quadros."
  on tasks for select
  using ( exists ( 
    select 1 from columns 
    join boards on boards.id = columns.board_id 
    where columns.id = tasks.column_id and boards.user_id = auth.uid() 
  ) );

create policy "Usuários podem criar tarefas em seus quadros."
  on tasks for insert
  with check ( exists ( 
    select 1 from columns 
    join boards on boards.id = columns.board_id 
    where columns.id = tasks.column_id and boards.user_id = auth.uid() 
  ) );

create policy "Usuários podem atualizar tarefas em seus quadros."
  on tasks for update
  using ( exists ( 
    select 1 from columns 
    join boards on boards.id = columns.board_id 
    where columns.id = tasks.column_id and boards.user_id = auth.uid() 
  ) );

create policy "Usuários podem deletar tarefas em seus quadros."
  on tasks for delete
  using ( exists ( 
    select 1 from columns 
    join boards on boards.id = columns.board_id 
    where columns.id = tasks.column_id and boards.user_id = auth.uid() 
  ) );
