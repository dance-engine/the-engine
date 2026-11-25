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
13. Mark the places the menu can scroll to with **Menu jump** sections on the `home` page: give each a title (shown when picking it in the menu, and as a heading if **Show title on page** is ticked) and click **Generate** for the anchor. Menu jumps don't appear in the menu on their own.
14. Add one **Menu** section to the `home` page (anywhere; it isn't shown on the page) and add its links in the order they should appear. Each link has a label and links to either **a menu jump on this page** (pick it from the list) or **a web address**. Full addresses (`https://…`) open in a new tab; use a path such as `/events` for pages on this site. With no Menu section there's no menu.
