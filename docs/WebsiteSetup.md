# Initial requirements
Create solo instance from backend

# Website

## Sanity project
1. Create a new project in sanity.io/manage with a `production` dataset and note its project ID.
2. API → CORS origins: add `https://app.danceengine.co.uk` (Allow credentials ticked), plus any local dev origin you use.
3. API → Tokens: add a **Viewer** token (used for draft previews).

## Edge Config (`solo` key)
4. Add the org to `sanityProjects`: `"<org-slug>": { "projectId": "<id>", "dataset": "production" }`.
5. Make sure `domains.<org-slug>` lists the live site URL **first** — the first entry is used as the Presentation preview origin. Local (`*.localhost`) domains must come after it.

## Vercel environment variables
6. **solo** app: add `"<projectId>": "<viewer token>"` to `SANITY_PREVIEW_TOKENS_JSON` (keep the existing entries; valid JSON). Without this, Presentation shows "Website preview is not configured". {"NEW_PROJECT_ID":"sk_NEW_VIEWER_TOKEN","OTHER_PROJECT_ID":"sk_OTHER_VIEWER_TOKEN"} is the format
7. **solo** app: ensure `SANITY_STUDIO_URL` is set (e.g. `https://app.danceengine.co.uk/content`).
8. **core** app: do not set `SANITY_PREVIEW_ORIGIN_TEMPLATE` to a localhost value in Production — it overrides the Edge Config domain.
9. Redeploy the solo app (and core, if its env changed) so the new variables take effect.

## Studio
10. Open Content → Site settings, enter the site name and **Publish**. This creates the `site-primary` document that pages link to.

## Single-page site (optional)
11. To serve the Sanity site at the root URL, create a page with the address `home` in Studio and publish it.
12. In Dance Engine → Settings → Organisation, tick **Single page site** and save. `/` then renders the `home` page (allow up to 30s for the cached org settings to refresh). `/events` keeps showing the events listing. Leave the setting unticked to keep the current root page.
13. Single-page sites get their header menu from **Menu jump** sections on the `home` page, listed in page order. Add one wherever the menu should link to: give it a title (the menu label), click **Generate** for the anchor, and tick **Show title on page** if the title should also appear as a heading. With no menu jumps there's no menu.
