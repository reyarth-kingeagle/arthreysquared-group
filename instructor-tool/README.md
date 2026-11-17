# ARTHREYSQUARED · Instructor Tools

## No-login tool — GitHub Pages

Public course section: [Coursework](https://www.arthreysquared.com/coursework.html#instructor)

Direct browser tool: [Instructor Tools](https://www.arthreysquared.com/Coursework/MSU-IIT/instructor-tools.html)

This is **not a password-protected page**. Anyone with the URL can open its interface. There is no username, access code, user database, student registration or login screen.

The GitHub Pages edition provides:
- Upload existing JPG/PNG/WebP student-paper photos or capture new images with a phone / device camera.
- Read visible names and essay responses through an external AI service when you supply an **API key for that visit**.
- Choose a specific examination and essay item numbers from your instructor rubric JSON.
- Apply the rubric by criterion with evidence, suggested corrections, improved explanations and warning flags.
- Calculate a provisional subtotal only for selected readable essay items.
- Copy, print, or save the temporary results as PDF using the browser's Print → Save as PDF.
- Clear all selected images and results without storing them in a server database or localStorage.

**Two required inputs:** an OpenAI API key and the BET 117 instructor-rubric JSON (downloaded previously and kept outside the GitHub repository). Neither is embedded in GitHub files, saved by this page, or required for merely opening the interface. **The tool cannot actually perform AI grading without a valid API connection.** ChatGPT Plus access does not supply an API key or API credits automatically.

The static version sends the images **directly from your browser to OpenAI**, not through a website server. Browser policies or the provider's API settings may prevent direct browser calls. In that case, the separate Cloudflare Worker edition below is an alternative.

## VS Code steps: public GitHub Pages edition

1. In VS Code, open your `arthreysquared-group` repo.
2. Safely commit or stash existing local modifications if applicable.
3. Run:

   ```powershell
   git pull origin main
   ```

4. Open `Coursework/MSU-IIT/instructor-tools.html`. The complete interface is contained in that single file.
5. Preview with Live Server and test the responsive layout.
6. Open the [live page](https://www.arthreysquared.com/Coursework/MSU-IIT/instructor-tools.html) after GitHub Pages publishes the latest `main` branch.
7. Select the **private rubric JSON** from your local computer. Select your examination profile, essay items, and clear photos. Enter an API key for the session.
8. Click Analyze. Verify each transcribed student word, comment and score against the original paper before using the provisional result. Use Print or Save as PDF.
9. Click Clear to remove the images and results from the current view; closing or refreshing the tab also clears them.

Use fictitious sample papers for first-run tests. A photographed handwritten response may be misread, and AI scoring is not guaranteed to be accurate or consistent. Treat the generated score as an instructor-review recommendation, not an official final grade.

## Alternative: No-login Cloudflare Worker with privately configured service key

Source: `instructor-tool/app.html`, `worker.js`, `wrangler.toml`.

This edition serves the interface and calls the AI API from a Worker rather than from the browser. **It is not deployed from this repository yet.** You must deploy it from your Cloudflare account, and the OpenAI API key must be configured as a private Worker secret.

### Deploy

Open a VS Code terminal:

```powershell
cd instructor-tool
npx wrangler login
npx wrangler deploy
```

Configure the API secret:

```powershell
npx wrangler secret put OPENAI_API_KEY
```

Keep the rubric file in a directory outside your GitHub repo, for example `C:\Private-Teaching\BET117_PRIVATE_ESSAY_RUBRICS.json`. Then:

```powershell
Get-Content -Raw "C:\Private-Teaching\BET117_PRIVATE_ESSAY_RUBRICS.json" | npx wrangler secret put RUBRICS_JSON
npx wrangler deploy
```

The actual Worker URL is printed by Wrangler. Test it with fictional sample scripts before submitting any identifiable student papers. This no-login endpoint is public, so even with per-IP rate limits other people can invoke your paid API service; if you deploy this edition, configure strict API budget caps and monitor consumption.

### Important distinction: no application storage ≠ no third-party retention

This implementation intentionally creates no student database, gradebook, file archive, analytics integration, or persistent application storage. Uploaded images exist temporarily in the browser and are transmitted to an AI provider for analysis. That provider may retain request content under its own retention and compliance policies. Do not claim that photographs are guaranteed to disappear everywhere immediately.

Obtain institutional authorization and make sure applicable student-record privacy and data-processing requirements are satisfied before processing actual identifiable exam papers.

## BET 117 written-response scoring scope

- Prelim items 21–24: 36 points and items 25–27: 24 points, for **60 essay points**.
- Midterm item 11: 5 points and items 12–14: 75 points, for **80 written-response points**.
- Multiple-choice responses are ignored.
- The separate private rubric JSON includes the item-level criteria and grading instructions; it should not be posted on the public site.

## Future subjects

The same tool accepts other JSON assessment profiles in the same format, so it may support additional subjects in future without any student accounts.

## Source references

- OpenAI API: https://developers.openai.com/api/docs/guides/production-best-practices
- Cloudflare Worker Secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- Cloudflare Wrangler: https://developers.cloudflare.com/workers/wrangler/
- National Privacy Commission: https://privacy.gov.ph/data-privacy-act/
