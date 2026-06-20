# NIYYAH Public App Website

Upload this folder to the public app GitHub Pages repository.

This package is safe for public visitors and includes only:

- `index.html` — public app entry page
- `app/` — current NIYYAH interactive app preview
- `auth/` — Google login page prepared for Supabase Auth
- `privacy.html`
- `terms.html`
- `.nojekyll`

Do not add private founder docs, audits, carousel drafts, or internal launch materials to this repository.

Real Google login requires:

1. A Supabase project.
2. Google provider enabled in Supabase Auth.
3. `auth/auth-config.js` filled with the Supabase project URL and publishable anon key.
4. The final GitHub Pages URL added to Supabase redirect URLs and Google OAuth authorized origins.
