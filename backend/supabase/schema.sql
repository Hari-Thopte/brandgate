-- Demo schema: apply in Supabase SQL editor before enabling persistence.
create table if not exists orgs (id uuid primary key default gen_random_uuid(), name text not null);
create table if not exists users (id uuid primary key default gen_random_uuid(), org_id uuid not null references orgs(id), display_name text not null, role text not null);
create table if not exists items (id uuid primary key default gen_random_uuid(), org_id uuid not null references orgs(id), creator_id uuid references users(id), title text not null, content text not null, status text not null default 'Draft', created_at timestamptz not null default now());
create table if not exists analyses (id uuid primary key default gen_random_uuid(), org_id uuid not null references orgs(id), item_id uuid not null references items(id), content_hash text not null, stage text not null, status text not null, timings jsonb not null default '{}', created_at timestamptz not null default now());
create table if not exists findings (id uuid primary key default gen_random_uuid(), org_id uuid not null references orgs(id), analysis_id uuid not null references analyses(id), category text not null, severity text not null, confidence numeric not null, span_start int not null, span_end int not null, span_text text not null, message text not null, suggestion text, source_type text not null, source_id uuid not null, status text not null default 'open', dismissal_reason text);
create table if not exists comments (id uuid primary key default gen_random_uuid(), org_id uuid not null references orgs(id), item_id uuid not null references items(id), author_id uuid references users(id), body text not null, created_at timestamptz not null default now());
create table if not exists audit_log (id uuid primary key default gen_random_uuid(), org_id uuid not null references orgs(id), item_id uuid references items(id), actor_id uuid references users(id), action text not null, detail text, created_at timestamptz not null default now());
create table if not exists guidelines (id uuid primary key default gen_random_uuid(), org_id uuid not null references orgs(id), title text not null, body text not null, active boolean not null default true);
create table if not exists terms (id uuid primary key default gen_random_uuid(), org_id uuid not null references orgs(id), term text not null, meaning text not null, banned boolean not null default false);
create table if not exists ledger_entries (id uuid primary key default gen_random_uuid(), org_id uuid not null references orgs(id), claim text not null, value text, status text not null, expires_at date, source_note text);
create table if not exists dismissal_reasons (id uuid primary key default gen_random_uuid(), org_id uuid not null references orgs(id), finding_id uuid not null references findings(id), reason text not null, created_at timestamptz not null default now());
create table if not exists insights (id uuid primary key default gen_random_uuid(), org_id uuid not null references orgs(id), payload jsonb not null default '{}');
create table if not exists eval_runs (id uuid primary key default gen_random_uuid(), org_id uuid not null references orgs(id), created_at timestamptz not null default now(), payload jsonb not null default '{}');
create table if not exists eval_cases (id uuid primary key default gen_random_uuid(), org_id uuid not null references orgs(id), label text not null, content text not null, expected jsonb not null default '{}');
create table if not exists uploads (id uuid primary key default gen_random_uuid(), org_id uuid not null references orgs(id), filename text not null, status text not null default 'pending');
create table if not exists notifications (id uuid primary key default gen_random_uuid(), org_id uuid not null references orgs(id), payload jsonb not null default '{}', created_at timestamptz not null default now());

-- RLS is enabled on all org-scoped tables. API queries must still filter by org_id.
do $$ declare t text; begin
  foreach t in array array['users','items','analyses','findings','comments','audit_log','guidelines','terms','ledger_entries','dismissal_reasons','insights','eval_runs','eval_cases','uploads','notifications'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy org_isolation on %I using (org_id = (auth.jwt() ->> ''org_id'')::uuid) with check (org_id = (auth.jwt() ->> ''org_id'')::uuid)', t);
  end loop;
end $$;

-- Demo seed rows use fixed source IDs for deterministic local fixture mapping.
insert into orgs (id, name) values ('11111111-1111-4111-8111-111111111111', 'Demo Brand') on conflict do nothing;
insert into guidelines (id, org_id, title, body) values
('22222222-2222-4222-8222-222222222201','11111111-1111-4111-8111-111111111111','Evidence first','Claims must match approved evidence.'),
('22222222-2222-4222-8222-222222222202','11111111-1111-4111-8111-111111111111','Professional tone','Avoid slang and absolute promises.'),
('22222222-2222-4222-8222-222222222203','11111111-1111-4111-8111-111111111111','Clarity','Use clear language customers understand.'),
('22222222-2222-4222-8222-222222222204','11111111-1111-4111-8111-111111111111','Audience','Write for the intended customer audience.'),
('22222222-2222-4222-8222-222222222205','11111111-1111-4111-8111-111111111111','Privacy','Do not expose private customer information.'),
('22222222-2222-4222-8222-222222222206','11111111-1111-4111-8111-111111111111','Comparisons','Comparisons must be fair and evidenced.'),
('22222222-2222-4222-8222-222222222207','11111111-1111-4111-8111-111111111111','Pricing','Show material price conditions clearly.'),
('22222222-2222-4222-8222-222222222208','11111111-1111-4111-8111-111111111111','Availability','Availability statements must be current.'),
('22222222-2222-4222-8222-222222222209','11111111-1111-4111-8111-111111111111','Disclaimers','Keep disclaimers near the related claim.'),
('22222222-2222-4222-8222-222222222210','11111111-1111-4111-8111-111111111111','Respect','Keep the tone calm and respectful.'),
('22222222-2222-4222-8222-222222222211','11111111-1111-4111-8111-111111111111','Accessibility','Use accessible and inclusive wording.'),
('22222222-2222-4222-8222-222222222212','11111111-1111-4111-8111-111111111111','Brand name','Use approved brand spelling.'),
('22222222-2222-4222-8222-222222222213','11111111-1111-4111-8111-111111111111','Testimonials','Testimonials need permission and attribution.'),
('22222222-2222-4222-8222-222222222214','11111111-1111-4111-8111-111111111111','Before and after','Substantiate before-and-after claims.'),
('22222222-2222-4222-8222-222222222215','11111111-1111-4111-8111-111111111111','Scarcity','Scarcity claims must reflect real availability.') on conflict do nothing;
insert into terms (org_id, term, meaning, banned) values
('11111111-1111-4111-8111-111111111111','no cap','Informal slang',true),
('11111111-1111-4111-8111-111111111111','guaranteed','Absolute outcome claim',true),
('11111111-1111-4111-8111-111111111111','risk-free','Requires legal review',true),
('11111111-1111-4111-8111-111111111111','miracle','Unsupported outcome wording',true),
('11111111-1111-4111-8111-111111111111','instant','Requires evidence',true),
('11111111-1111-4111-8111-111111111111','perfect','Absolute wording',true),
('11111111-1111-4111-8111-111111111111','always','Absolute wording',true),
('11111111-1111-4111-8111-111111111111','never','Absolute wording',true),
('11111111-1111-4111-8111-111111111111','cure','Medical claim; requires approval',true),
('11111111-1111-4111-8111-111111111111','clinically proven','Requires clinical evidence',true),
('11111111-1111-4111-8111-111111111111','best','Comparative claim; requires evidence',true),
('11111111-1111-4111-8111-111111111111','number one','Ranking claim; requires evidence',true),
('11111111-1111-4111-8111-111111111111','#1','Ranking claim; requires evidence',true),
('11111111-1111-4111-8111-111111111111','free','Requires clear conditions',true),
('11111111-1111-4111-8111-111111111111','limited time','Requires current expiry',true),
('11111111-1111-4111-8111-111111111111','act now','Avoid pressure language',true),
('11111111-1111-4111-8111-111111111111','everyone','Avoid broad universal claim',true),
('11111111-1111-4111-8111-111111111111','instant results','Outcome claim; requires evidence',true),
('11111111-1111-4111-8111-111111111111','100%','Absolute claim; requires evidence',true),
('11111111-1111-4111-8111-111111111111','no risk','Absolute claim; requires evidence',true) on conflict do nothing;
insert into ledger_entries (id, org_id, claim, value, status, expires_at) values
('33333333-3333-4333-8333-333333333301','11111111-1111-4111-8111-111111111111','Registered users','8,500','Supported',null),
('33333333-3333-4333-8333-333333333302','11111111-1111-4111-8111-111111111111','Summer offer','Valid through 2024-01-01','Expired','2024-01-01'),
('33333333-3333-4333-8333-333333333303','11111111-1111-4111-8111-111111111111','Clinical efficacy','No approved evidence','Unregistered',null) on conflict do nothing;
