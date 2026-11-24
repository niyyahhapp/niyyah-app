// NIYYAH free "ManyChat": Instagram auto-DM bot (Supabase Edge Function).
//
// Does four things, driven by rows in the dm_rules table:
//   1. Comment a keyword on a post  -> private DM (+ optional public reply)
//   2. DM a keyword                 -> automatic reply
//   3. Reply to a story             -> automatic reply
//   4. Send an email in the DM      -> added to Kit (with an optional tag)
//
// Secrets to set in Supabase > Edge Functions > Secrets:
//   IG_ACCESS_TOKEN   Instagram token (from the Meta app dashboard)
//   IG_APP_SECRET     Instagram app secret (same page)
//   IG_VERIFY_TOKEN   any password you make up; also typed into Meta's webhook form
//   KIT_API_KEY       Kit v4 API key (optional, for email collection)
//   KIT_TAG_ID        default Kit tag for emails (optional)

import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const GRAPH = "https://graph.instagram.com/v21.0";
const VERIFY_TOKEN = Deno.env.get("IG_VERIFY_TOKEN") ?? "";
const APP_SECRET = Deno.env.get("IG_APP_SECRET") ?? "";
const KIT_API_KEY = Deno.env.get("KIT_API_KEY") ?? "";
const KIT_TAG_ID = Deno.env.get("KIT_TAG_ID") ?? "";
const CATCH_ALL_COOLDOWN_MS = 24 * 60 * 60 * 1000; // rules with no keyword reply once a day per person
const TOKEN_REFRESH_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type Trigger = "comment" | "dm" | "story_reply";
type Rule = {
  id: number;
  name: string;
  trigger: Trigger;
  keywords: string | null;
  post_id: string | null;
  reply_text: string;
  public_reply: string | null;
  ask_email: boolean;
  kit_tag_id: string | null;
  email_thanks: string | null;
};

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    // Meta's one-time webhook check.
    if (
      url.searchParams.get("hub.mode") === "subscribe" &&
      VERIFY_TOKEN && url.searchParams.get("hub.verify_token") === VERIFY_TOKEN
    ) {
      return new Response(url.searchParams.get("hub.challenge") ?? "");
    }
    // Setup helper: open <function-url>?setup=<IG_VERIFY_TOKEN> in a browser
    // to turn on comment + message events for your Instagram account.
    if (VERIFY_TOKEN && url.searchParams.get("setup") === VERIFY_TOKEN) {
      const res = await fetch(
        `${GRAPH}/me/subscribed_apps?subscribed_fields=comments,messages`,
        { method: "POST", headers: { Authorization: `Bearer ${await getToken()}` } },
      );
      return new Response(`Instagram said: ${await res.text()}`);
    }
    return new Response("NIYYAH DM bot is running.");
  }

  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const raw = await req.text();
  if (!(await validSignature(raw, req.headers.get("x-hub-signature-256")))) {
    return new Response("Bad signature", { status: 401 });
  }

  try {
    await handleWebhook(JSON.parse(raw));
  } catch (err) {
    console.error("webhook error", err);
  }
  // Always 200 so Instagram doesn't keep retrying.
  return new Response("EVENT_RECEIVED");
});

// deno-lint-ignore no-explicit-any
async function handleWebhook(body: any) {
  for (const entry of body.entry ?? []) {
    const ownId = String(entry.id);
    for (const change of entry.changes ?? []) {
      if (change.field === "comments") await onComment(ownId, change.value);
    }
    for (const event of entry.messaging ?? []) {
      await onMessage(ownId, event);
    }
  }
}

// deno-lint-ignore no-explicit-any
async function onComment(ownId: string, c: any) {
  const userId = c?.from?.id ? String(c.from.id) : "";
  if (!c?.id || !userId || userId === ownId) return; // ignore our own replies
  if (!(await firstTime(`comment:${c.id}`))) return;

  await saveContact(userId, { username: c.from.username ?? null });

  const rule = await findRule("comment", c.text ?? "", c.media?.id);
  if (!rule) return;
  if (!(await passesCooldown(rule, userId))) return;

  // A private reply to a comment opens the DM conversation.
  await sendDM({ comment_id: c.id }, rule.reply_text);

  if (rule.public_reply) {
    const options = rule.public_reply.split("|").map((s) => s.trim()).filter(Boolean);
    const text = options[Math.floor(Math.random() * options.length)];
    if (text) {
      await igPost(`/${c.id}/replies`, { message: text });
    }
  }

  if (rule.ask_email) await saveContact(userId, { awaiting_email_rule: rule.id });
}

// deno-lint-ignore no-explicit-any
async function onMessage(ownId: string, event: any) {
  const m = event?.message;
  const senderId = event?.sender?.id ? String(event.sender.id) : "";
  if (!m || m.is_echo || !senderId || senderId === ownId) return;
  if (m.mid && !(await firstTime(`msg:${m.mid}`))) return;

  const text: string = m.text ?? "";

  // Email collection: any email address in a DM goes to Kit.
  const email = text.match(EMAIL_RE)?.[0];
  if (email) {
    await handleEmail(senderId, email.toLowerCase());
    return;
  }

  const trigger: Trigger = m.reply_to?.story ? "story_reply" : "dm";
  const rule = await findRule(trigger, text);
  if (!rule) return;
  if (!(await passesCooldown(rule, senderId))) return;

  await sendDM({ id: senderId }, rule.reply_text);
  if (rule.ask_email) await saveContact(senderId, { awaiting_email_rule: rule.id });
}

async function handleEmail(userId: string, email: string) {
  const { data: contact } = await db
    .from("dm_contacts")
    .select("username, awaiting_email_rule")
    .eq("ig_user_id", userId)
    .maybeSingle();

  let rule: Rule | null = null;
  if (contact?.awaiting_email_rule) {
    const { data } = await db.from("dm_rules").select("*").eq("id", contact.awaiting_email_rule)
      .maybeSingle();
    rule = data as Rule | null;
  }

  await addToKit(email, rule?.kit_tag_id || KIT_TAG_ID, contact?.username ?? undefined);
  await saveContact(userId, { email, awaiting_email_rule: null });
  await sendDM(
    { id: userId },
    rule?.email_thanks || "JazakAllahu khayran! 💌 You're on the list.",
  );
}

// ---------- rules ----------

async function findRule(trigger: Trigger, text: string, mediaId?: string): Promise<Rule | null> {
  const { data, error } = await db
    .from("dm_rules")
    .select("*")
    .eq("trigger", trigger)
    .eq("active", true)
    .order("id");
  if (error) {
    console.error("rules error", error);
    return null;
  }
  const rules = ((data ?? []) as Rule[]).filter(
    (r) => !r.post_id || (mediaId && r.post_id.trim() === String(mediaId)),
  );

  const words = normalise(text);
  const keywordMatch = rules.find((r) => keywordsOf(r).some((k) => words.includes(` ${k} `)));
  if (keywordMatch) return keywordMatch;
  return rules.find((r) => keywordsOf(r).length === 0) ?? null; // catch-all rule
}

function keywordsOf(r: Rule): string[] {
  return (r.keywords ?? "").split(",").map((k) => normalise(k).trim()).filter(Boolean);
}

// Lowercase, strip punctuation/emoji, pad with spaces so " niyyah " matches whole words only.
function normalise(s: string): string {
  return ` ${s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;
}

// Catch-all rules (no keyword) only fire once a day per person, so normal
// conversations don't get the same auto-reply over and over.
async function passesCooldown(rule: Rule, userId: string): Promise<boolean> {
  if (keywordsOf(rule).length > 0) return true;
  const { data } = await db.from("dm_contacts").select("last_catch_all_at")
    .eq("ig_user_id", userId).maybeSingle();
  const last = data?.last_catch_all_at ? new Date(data.last_catch_all_at).getTime() : 0;
  if (Date.now() - last < CATCH_ALL_COOLDOWN_MS) return false;
  await saveContact(userId, { last_catch_all_at: new Date().toISOString() });
  return true;
}

// ---------- storage ----------

async function firstTime(key: string): Promise<boolean> {
  const { error } = await db.from("dm_events").insert({ event_key: key });
  if (!error) return true;
  if (error.code !== "23505") console.error("dedupe error", error); // 23505 = already seen
  return false;
}

async function saveContact(userId: string, fields: Record<string, unknown>) {
  const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
  if ("username" in clean && clean.username === null) delete clean.username;
  const { error } = await db.from("dm_contacts").upsert(
    { ig_user_id: userId, ...clean, updated_at: new Date().toISOString() },
    { onConflict: "ig_user_id" },
  );
  if (error) console.error("contact error", error);
}

// ---------- Instagram ----------

let cachedToken: string | null = null;

// Instagram tokens expire after 60 days. This refreshes the token weekly and
// keeps the newest one in dm_settings, so it never runs out.
async function getToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  const { data } = await db.from("dm_settings").select("value, updated_at")
    .eq("key", "ig_token").maybeSingle();
  let token = data?.value || Deno.env.get("IG_ACCESS_TOKEN") || "";
  const age = data ? Date.now() - new Date(data.updated_at).getTime() : Infinity;

  if (token && age > TOKEN_REFRESH_AFTER_MS) {
    const res = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${
        encodeURIComponent(token)
      }`,
    );
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.access_token) {
      token = json.access_token;
      await db.from("dm_settings").upsert({
        key: "ig_token",
        value: token,
        updated_at: new Date().toISOString(),
      });
    } else {
      console.error("token refresh failed", json);
    }
  }
  cachedToken = token;
  return token;
}

async function sendDM(recipient: { id: string } | { comment_id: string }, text: string) {
  await igPost("/me/messages", { recipient, message: { text } });
}

async function igPost(path: string, payload: unknown) {
  const res = await fetch(`${GRAPH}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await getToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) console.error(`Instagram ${path} failed`, res.status, await res.text());
}

async function validSignature(raw: string, header: string | null): Promise<boolean> {
  if (!APP_SECRET || !header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
  const expected = Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
  const given = header.slice(7);
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

// ---------- Kit ----------

async function addToKit(email: string, tagId: string, firstName?: string) {
  if (!KIT_API_KEY) {
    console.warn("KIT_API_KEY not set; email saved in dm_contacts only");
    return;
  }
  const headers = { "Content-Type": "application/json", "X-Kit-Api-Key": KIT_API_KEY };
  const sub = await fetch("https://api.kit.com/v4/subscribers", {
    method: "POST",
    headers,
    body: JSON.stringify({ email_address: email, first_name: firstName }),
  });
  if (!sub.ok) console.error("Kit subscriber failed", sub.status, await sub.text());

  if (tagId) {
    const tag = await fetch(`https://api.kit.com/v4/tags/${tagId}/subscribers`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email_address: email }),
    });
    if (!tag.ok) console.error("Kit tag failed", tag.status, await tag.text());
  }
}
