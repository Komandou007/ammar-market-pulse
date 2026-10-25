# AMMAR MARKET PULSE — starter site

A bilingual Arabic/English static starter site focused on gold, forex, global markets, economic calendar tools, and links to primary news sources.

## Included
- `index.html` — responsive single-page site
- `404.html` — simple not-found page
- `robots.txt`
- `sitemap.xml`
- `PRIVACY.md` — privacy policy starter to review and adapt before launch
- `DEPLOY_AR.md` — Arabic deployment instructions

## Important status notes
- This is a **starter website**, not a finished live news service.
- TradingView widgets load third-party content from the internet and may be unavailable in some regions or display delayed data.
- The news section currently links to official publishers. It does not scrape or republish their articles.
- Do not describe a quote as real-time unless the provider and exchange terms confirm it.
- Before monetizing, review each provider's terms, privacy requirements, cookie/analytics disclosures, local legal obligations, and advertising policies.
- No API keys or passwords are needed for this static starter.

## Deploy free
GitHub Pages is the simplest option for this static site:
1. Create a new public repository named `ammar-market-pulse` on GitHub.
2. Upload all files in this folder to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select branch `main` and folder `/ (root)`, then save.
6. Wait for GitHub Pages to publish the site. The URL usually follows `https://YOUR-USERNAME.github.io/ammar-market-pulse/`.

Alternative: Cloudflare Pages can connect to the GitHub repository and publish it as a static site. Follow Cloudflare's current official instructions.

## Next development milestone
Connect a licensed/authorized news feed or official RSS sources with source labels, publication timestamps, language filtering, and clear correction/update handling. Do not add API secrets to frontend HTML or public repositories.
