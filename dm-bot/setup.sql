-- NIYYAH free "ManyChat": Instagram auto-DM bot tables.
-- Paste this whole file into Supabase > SQL Editor and press Run.
-- Safe to run more than once.

-- Your automations. Edit these in Supabase > Table Editor > dm_rules.
create table if not exists public.dm_rules (
  id bigint generated always as identity primary key,
  name text not null,                       -- just a label for you
  trigger text not null check (trigger in ('comment', 'dm', 'story_reply')),
  keywords text,                            -- comma separated, e.g. 'niyyah, guide'. Empty = any message
  post_id text,                             -- comment rules only: limit to one post. Empty = all posts
  reply_text text not null,                 -- the DM they receive
  public_reply text,                        -- comment rules only: public reply under the comment.
                                            -- Separate options with | and one is picked at random
  ask_email boolean not null default false, -- true = wait for their email after this DM
  kit_tag_id text,                          -- Kit tag to add the email to (optional)
  email_thanks text,                        -- DM sent after they give their email
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- People who have messaged or commented.
create table if not exists public.dm_contacts (
  ig_user_id text primary key,
  username text,
  email text,
  awaiting_email_rule bigint references public.dm_rules(id) on delete set null,
  last_catch_all_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Stops Instagram retries from sending the same DM twice.
create table if not exists public.dm_events (
  event_key text primary key,
  created_at timestamptz not null default now()
);

-- Stores the auto-refreshed Instagram token.
create table if not exists public.dm_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- Lock the tables: only the bot (service role) can read or write them.
alter table public.dm_rules enable row level security;
alter table public.dm_contacts enable row level security;
alter table public.dm_events enable row level security;
alter table public.dm_settings enable row level security;

-- Example automations. Change the wording and links, or delete them.
insert into public.dm_rules (name, trigger, keywords, reply_text, public_reply, ask_email, email_thanks)
select * from (values
  ('Comment NIYYAH -> app link', 'comment', 'niyyah',
   'Assalamu alaikum! 🤍 Here is the NIYYAH app: https://niyyahhapp.github.io/niyyah-app/',
   'Sent you a DM 🤍|Check your DMs ✨|Just messaged you 🤍',
   false, null),
  ('Comment GUIDE -> collect email', 'comment', 'guide',
   'Assalamu alaikum! 🤍 Reply with your email and I''ll send you the guide.',
   'Check your DMs 🤍',
   true, 'JazakAllahu khayran! 💌 Check your inbox for the guide.'),
  ('DM APP -> app link', 'dm', 'app, link',
   'Here you go 🤍 https://niyyahhapp.github.io/niyyah-app/',
   null, false, null),
  ('Any story reply', 'story_reply', null,
   'JazakAllahu khayran for replying 🤍 I''ll get back to you soon, in sha Allah.',
   null, false, null)
) as v(name, trigger, keywords, reply_text, public_reply, ask_email, email_thanks)
where not exists (select 1 from public.dm_rules);
