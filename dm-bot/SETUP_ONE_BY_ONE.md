# Free ManyChat for NIYYAH: Setup, One By One

This is your own Instagram auto-DM bot. It runs on Supabase's free plan, so it costs £0.

What it does:

- **Comment → DM:** someone comments a keyword (like `NIYYAH`) on your post and gets a DM. It can also reply publicly under the comment ("Check your DMs 🤍").
- **DM keyword → reply:** someone DMs you a keyword and gets an automatic reply.
- **Story reply → DM:** someone replies to your story and gets an automatic DM.
- **Email → Kit:** the DM asks for their email. When they send it, it goes to your Kit list, with a tag if you want one.

You'll need about an hour for setup, plus a wait for Meta to approve your app (see Step 9).

---

## Step 1: Make your Instagram a Professional account

Open Instagram, then Settings → Account type and tools → Switch to professional account. Pick **Creator** or **Business**.

Then open Settings → Messages and story replies → Message controls → Connected tools, and turn on **Allow access to messages**.

## Step 2: Create the tables in Supabase

1. Open your NIYYAH project in Supabase.
2. Go to **SQL Editor** → New query.
3. Paste everything from `dm-bot/setup.sql` and press **Run**.

This creates 4 tables and adds 4 example automations.

## Step 3: Create the bot in Supabase

1. In Supabase, go to **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Name it exactly: `instagram-dm`
3. Delete the sample code, paste everything from `dm-bot/instagram-dm/index.ts`, and press **Deploy**.
4. Open the function's **Details / Settings** and turn **OFF** "Verify JWT" (also called "Enforce JWT verification"). Instagram can't log in to Supabase, so it has to be off. Save.
5. Copy the function URL. It looks like this:
   `https://YOUR-PROJECT.supabase.co/functions/v1/instagram-dm`

## Step 4: Create a Meta app

1. Go to developers.facebook.com → **My Apps** → **Create App**.
2. Pick the use case **Manage messaging & content on Instagram**.
3. Name it something like `NIYYAH DMs` and create it.
4. In the app, open **Instagram → API setup with Instagram login**.
5. Under **Generate access tokens**, press **Add account** and log in with your NIYYAH Instagram. Then press **Generate token** and copy it. This is your `IG_ACCESS_TOKEN`.
6. Go to **App settings → Basic** (or the Instagram app secret shown on the API setup page) and copy the **Instagram app secret**. This is your `IG_APP_SECRET`.

## Step 5: Add your secrets in Supabase

In Supabase go to **Edge Functions → Secrets** and add:

| Name | Value |
|---|---|
| `IG_ACCESS_TOKEN` | the token from Step 4.5 |
| `IG_APP_SECRET` | the secret from Step 4.6 |
| `IG_VERIFY_TOKEN` | any password you make up, e.g. `niyyah-bot-7392` |
| `KIT_API_KEY` | Kit → Settings → Developer → **API v4 key** (only for email collection) |
| `KIT_TAG_ID` | optional: a Kit tag ID that every email gets |

You never need to update the token by hand. The bot renews it every week.

## Step 6: Connect the webhook

Back in the Meta app, on **API setup with Instagram login**, find **Configure webhooks**:

1. **Callback URL:** your function URL from Step 3.5
2. **Verify token:** the same `IG_VERIFY_TOKEN` you made up
3. Press **Verify and save**. If it fails, check that JWT verification is off (Step 3.4).
4. Subscribe to the fields **comments** and **messages**.

## Step 7: Switch it on for your account

Paste this into your browser, with your own details in it:

```
https://YOUR-PROJECT.supabase.co/functions/v1/instagram-dm?setup=YOUR_IG_VERIFY_TOKEN
```

You should see `Instagram said: {"success":true}`.

## Step 8: Test it

Your app starts in Development mode. In this mode it **only works for accounts added to the app**.

1. In the Meta app go to **App roles → Roles** and add a second Instagram account (a friend's or a spare one) as an **Instagram Tester**. Accept the invite on that account under Instagram → Settings → Apps and websites.
2. From the test account, comment `NIYYAH` on one of your posts. A DM should arrive within a few seconds.
3. If nothing happens, open Supabase → Edge Functions → `instagram-dm` → **Logs** to see the error.

## Step 9: Go live for everyone (App Review)

To work for all your followers, Meta has to approve the app. This is free, but you have to apply.

1. In the Meta app, go to **App Review → Permissions and features**.
2. Request **Advanced Access** for:
   - `instagram_business_basic`
   - `instagram_business_manage_messages`
   - `instagram_business_manage_comments`
3. Meta asks for a short screen recording of the bot working (record Step 8) and a privacy policy link. You can use `https://niyyahhapp.github.io/niyyah-app/privacy.html`. Add a line to it about Instagram DMs and emails first.
4. You may also need to verify your business (**Business verification**).
5. Once approved, switch the app from **Development** to **Live** at the top of the dashboard.

Approval usually takes a few days to a couple of weeks.

---

## How to change your automations

Open Supabase → **Table Editor → dm_rules**. Each row is one automation:

| Column | What it means |
|---|---|
| `name` | A label just for you |
| `trigger` | `comment`, `dm`, or `story_reply` |
| `keywords` | Words that trigger it, separated by commas: `niyyah, app`. Capitals don't matter. **Leave it empty to reply to everything** |
| `post_id` | Only for comment rules: limit the rule to one post. Leave it empty for all posts |
| `reply_text` | The DM they get |
| `public_reply` | Only for comment rules: a public reply under the comment. Separate options with `\|` and one is picked at random, which looks less like a bot |
| `ask_email` | Tick it if `reply_text` asks for their email |
| `kit_tag_id` | The Kit tag to add their email to |
| `email_thanks` | The DM they get after sending their email |
| `active` | Untick to pause the automation |

Good to know:

- Keyword rules win over "reply to everything" rules.
- A "reply to everything" rule fires **at most once a day per person**, so it won't interrupt real conversations.
- Everyone who messages you is saved in **dm_contacts**, including any email they gave.
- Instagram only lets you DM people who messaged or commented first, and only within 24 hours. That's the same for ManyChat.
