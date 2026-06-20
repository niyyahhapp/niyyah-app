# Google Login Setup, One By One

Do this after the public app GitHub Pages link exists.

Expected public app link:

`https://niyyahhapp.github.io/niyyah-app/`

## Step 1: Create or open Supabase

Open Supabase and create a project for NIYYAH.

Your current connected Supabase project in Codex is named `Idea Development`, but it is inactive. Use an active project before expecting login to work.

## Step 2: Get the public project values

In Supabase, find:

- Project URL
- Publishable anon key

Do not use the service role key in the website.

## Step 3: Paste them into the app

Open:

`auth/auth-config.js`

Replace:

```js
supabaseUrl: "PASTE_SUPABASE_PROJECT_URL_HERE",
supabaseAnonKey: "PASTE_SUPABASE_PUBLISHABLE_ANON_KEY_HERE"
```

## Step 4: Enable Google provider in Supabase

In Supabase Auth Providers, turn on Google.

Supabase will ask for Google OAuth Client ID and Client Secret.

## Step 5: Create Google OAuth credentials

In Google Cloud / Google Auth Platform:

- Create an OAuth Client ID
- Type: Web application
- Authorized JavaScript origin:
  `https://niyyahhapp.github.io`
- Authorized redirect URI:
  Use the callback URL shown inside Supabase's Google provider page

## Step 6: Add redirect URLs in Supabase

Add these redirect URLs:

```txt
https://niyyahhapp.github.io/niyyah-app/auth/
https://niyyahhapp.github.io/niyyah-app/app/
```

For local testing, also add:

```txt
http://127.0.0.1:8797/NIYYAH-app-public-github-pages/auth/
```

## Step 7: Upload again

After editing `auth/auth-config.js`, upload the changed files to GitHub.

Then test:

`https://niyyahhapp.github.io/niyyah-app/auth/`

## Important

Google login will not activate just because the button exists. It activates only after Supabase and Google OAuth are connected.
