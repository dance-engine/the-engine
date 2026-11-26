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

# Themes

A theme changes how an org's website looks without changing its content. Themes live in
`apps/clients/solo/components/content/themes/`:

- `default/` is the complete theme every site uses. It has a component for the header, the page
  shell and every Sanity section type.
- Every other theme is an **override**: it contains only the parts it changes. Anything it leaves
  out falls back to `default/`.
- `shared.ts` holds the data helpers (image URLs, org colours, social icons). Keep data logic there
  so every theme shows the same content; theme components should only decide layout and styling.
- `_template/` is a commented starting point for a new theme. It isn't registered, so no site can use it.

## What a theme can override
| Key in the theme | What it is | Props |
| --- | --- | --- |
| `Header` | Site header (logo and menu) | `HeaderProps`: `{ org, links }` |
| `PageShell` | Wrapper around every page's sections: page background, text colour, fonts | `PageShellProps`: `{ children }` |
| `sections.<type>` | One Sanity section type, e.g. `sections.heroSection` | `SectionProps<"<type>">` |

The section type names are the keys of `sections` in `themes/default/index.ts`.

## Creating a theme
1. Copy `themes/_template/` to `themes/<name>/` and set `name` in its `index.ts`. Use lowercase
   with hyphens (e.g. `modern-edge`); this is the name used in Edge Config.
2. For each part you want to change, copy that file from `themes/default/` into the new folder,
   edit the copy, and import it in `index.ts` under the matching key. Leave out everything else.
3. Register the theme in `themes/registry.ts`: import it and add it to the `themes` map.
4. Assign it to orgs in Edge Config (`solo` key): `themes` maps a theme name to a list of org slugs,
   e.g. `"themes": { "<name>": ["<org-slug>"] }`. Orgs that aren't listed use the default theme.

## Testing locally
Open `http://<org-slug>.localhost:<port>`. In development a bar above the header shows the active
theme, and says so if the theme Edge Config asks for isn't registered (the site then falls back to
the default theme rather than erroring).

`themes/ruedx/` (header only) and `themes/modern-edge/` (header and several sections) are examples.
