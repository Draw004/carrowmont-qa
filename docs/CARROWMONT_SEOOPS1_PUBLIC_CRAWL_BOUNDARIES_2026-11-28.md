# Carrowmont Batch 5 - SEOOPS1 public crawl boundaries

**Release state:** PREPARED; merge only after Publisher and full QA are green. The all-green Batch 4 source snapshot remains authoritative until the owner provides a newer one.

## Scope and reason

The public root `robots.txt` currently contains `User-agent: *`, `Allow: /` and the canonical sitemap. The main public sitemap has 151 URLs; it does not include the website repository's `/docs/` operational Markdown files or `/ops/credential-expiry-registry.json`.

Batch 5 adds `Disallow: /docs/` and `Disallow: /ops/` under the existing generic crawler group. It preserves `Allow: /` and `Sitemap: https://carrowmont.com/sitemap.xml`. A deterministic source contract verifies that every sitemap URL remains crawl-allowed and the original documentation and registry are retained so that automation can continue using them. Playwright fixture tests cover accidental crawl blocking and broken sitemap references without depending on live deployment timing.

## Important limits - NOT a security fix

This is crawl management, **not access control** and **not a noindex guarantee**. `robots.txt` cannot make the files private, prevent a person from requesting them, remove indexed URLs reliably, erase historical Git copies, or establish data security. The website code and those files still live in a **public GitHub repository**. In some cases disallowed URLs can still appear as URL-only search results. If material actually needs confidentiality, it must be moved to authorized private storage and its Git/public deployment history reviewed; a `Disallow` rule is not sufficient. Never add private keys or tokens to a public repository.

Google reference: https://developers.google.com/search/docs/crawling-indexing/robots/intro
Bing reference: https://www.bing.com/webmasters/help/?topicid=cb7c31ec

## Post-merge owner checks

- Confirm `https://carrowmont.com/robots.txt` serves the expected two new disallow lines and the unchanged sitemap declaration.
- Confirm Home, Ask, Search, Learn, Tools, calculators and Research remain reachable and in the sitemap.
- Use Google Search Console and Bing Webmaster Tools to inspect whether existing operational URLs are indexed; do not infer removal from this release. For any sensitive indexed URLs, plan removal/authorization changes separately.
- Confirm the country updater and credential-expiry scheduled automation remains green.

## No changes to

Calculator engines, My Carrowmont, accounts, Supabase policies, analytics, page URLs, public documentation contents, the operational registry, site routing, robots meta tags, or private repository visibility. No hosting or DNS changes.
