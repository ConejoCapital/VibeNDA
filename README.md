# VibeNDA

*"I am happy to take a look but I am not going to sign an NDA for something you vibe coded last night sorry man"* — [@SHLØMS](https://x.com)

So we made the NDA part automatic. Sort of.

**VibeNDA** is a minimal, embeddable gateway for vibe-coded (and other) projects. Viewers **slide to reveal** instead of clicking "I Agree." That action counts as affirmative assent under contract law, while the script logs a consent receipt (fingerprint, IP, session, timestamp) and shows a brief "Access logged" confirmation. Other developers can drop one script tag into their project and gate it behind the same NDA flow.

---

## How it works

1. **Gate:** Your content is hidden behind a blurred overlay. Above a slide control it says: *"By sliding to reveal, you execute the VibeNDA and bind yourself to the terms below."*
2. **Action as consent:** The user slides the control to the end (like unlocking a phone). That gesture is the legally relevant assent.
3. **Digital wax seal:** On slide complete, the script collects a technical fingerprint (timezone, screen, language, user-agent, etc.), gets client IP (e.g. via ipify), and optionally POSTs to your `/api/consent` endpoint so the server can log IP and headers. A unique consent token is generated and stored with the receipt.
4. **Access logged:** The user sees a short "Access logged" screen with their ID number, then the overlay is removed and your content is shown.
5. **Persistence:** Consent is stored in `localStorage` per origin (and optional project ID), so returning visitors don’t see the gate again.

---

## Install

Copy `vibe-nda.js` into your project and include it:

```html
<script
  src="/path/to/vibe-nda.js"
  data-vibenda-terms-url="/path/to/TERMS.md"
  data-vibenda-endpoint="/api/consent"
  data-vibenda-project-id="my-app"
></script>
```

- **`data-vibenda-terms-url`** — URL to your NDA/terms (e.g. your repo’s `TERMS.md`).
- **`data-vibenda-endpoint`** — Optional. POST URL for consent + fingerprint. Omit or leave empty for client-only logging (ipify + `localStorage`).
- **`data-vibenda-project-id`** — Optional. Scopes consent to a project so multiple apps on the same origin can have separate consent.

Hide your real content until the user has agreed, then show it when you receive the event:

```js
document.addEventListener('vibenda:agreed', function (e) {
  // e.detail = { consentToken, timestamp, sessionId, fingerprint, clientIp }
  showYourContent();
});
```

Your page should initially hide the protected content (e.g. with CSS or by not rendering it). When the script runs, it either shows the gate (no consent yet) or dispatches `vibenda:agreed` (consent already stored). After the user slides to reveal, it logs consent, shows "Access logged," then removes the overlay and dispatches `vibenda:agreed`.

---

## Demo

Open `example/index.html` in a browser (or serve the repo and open `/example/`). Slide to reveal, then use "Reset demo" to clear consent and try again. The example is built to work on desktop (Chrome, Safari, Firefox) and mobile (iOS Safari, Android Chrome).

---

## Optional backend (Vercel)

To log consent server-side (IP + headers + body), use the provided serverless handler:

- **Vercel:** Put `api/consent.js` in your project’s `api/` folder. Deploy; `POST /api/consent` will log the request and return `{ ok: true }`. Set `data-vibenda-endpoint="/api/consent"` (or your deployed URL).

The handler reads `x-forwarded-for` / `x-real-ip` for the client IP and logs a JSON line (timestamp, IP, headers, body) to stdout. Wire it to your own storage (e.g. log drain, DB) if you need persistence beyond server logs.

---

## Terms and legal

The default **TERMS.md** in this repo frames the protected content as confidential information and trade secrets, with liquidated damages and injunctive relief. It’s written to be as enforceable as possible while still being a parody/novelty template.

**This is not legal advice.** For real NDAs or trade secret protection, consult a lawyer. VibeNDA is for fun and for plugging into vibe-coded demos.

---

## License

MIT. See [LICENSE](LICENSE).
