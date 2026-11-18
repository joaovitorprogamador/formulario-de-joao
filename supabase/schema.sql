-- Execute este arquivo no SQL Editor do Supabase.
-- Use somente a chave anon/public no navegador. NUNCA coloque service_role no frontend.

create extension if not exists pgcrypto;

create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Novo formulário',
  public_title text not null default '',
  description text not null default '',
  slug text not null unique,
  whatsapp_number text not null default '',
  button_text text not null default 'Enviar respostas',
  thank_you_title text not null default 'Tudo certo!',
  thank_you_message text not null default 'Recebemos suas informações. Fale conosco pelo WhatsApp.',
  fields jsonb not null default '[]'::jsonb,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists forms_owner_id_idx on public.forms(owner_id);
create index if not exists submissions_form_id_idx on public.submissions(form_id);
create index if not exists submissions_created_at_idx on public.submissions(created_at desc);

alter table public.forms enable row level security;
alter table public.submissions enable row level security;

-- O dono só enxerga e administra os próprios formulários.
drop policy if exists "Owners can view own forms" on public.forms;
create policy "Owners can view own forms"
on public.forms for select to authenticated
using (auth.uid() = owner_id);

drop policy if exists "Public can view published forms" on public.forms;
create policy "Public can view published forms"
on public.forms for select to anon, authenticated
using (is_published = true);

drop policy if exists "Owners can create forms" on public.forms;
create policy "Owners can create forms"
on public.forms for insert to authenticated
with check (auth.uid() = owner_id);

drop policy if exists "Owners can update own forms" on public.forms;
create policy "Owners can update own forms"
on public.forms for update to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Owners can delete own forms" on public.forms;
create policy "Owners can delete own forms"
on public.forms for delete to authenticated
using (auth.uid() = owner_id);

-- Visitantes podem enviar respostas somente para formulários publicados.
drop policy if exists "Public can submit to published forms" on public.submissions;
create policy "Public can submit to published forms"
on public.submissions for insert to anon, authenticated
with check (
  exists (
    select 1 from public.forms f
    where f.id = form_id and f.is_published = true
  )
);

-- O dono pode consultar respostas dos próprios formulários.
drop policy if exists "Owners can view submissions of own forms" on public.submissions;
create policy "Owners can view submissions of own forms"
on public.submissions for select to authenticated
using (
  exists (
    select 1 from public.forms f
    where f.id = form_id and f.owner_id = auth.uid()
  )
);

-- Não há política pública para editar ou apagar respostas.
