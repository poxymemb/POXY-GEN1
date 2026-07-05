# RUNBOOK — operational wiring

Steps that require the Supabase dashboard or another console, kept out of
code so nobody hunts for them the night before a release.

## Email templates (Still Water)

Masters live in `supabase/templates/`. Supabase does not read them from the
repo — paste them into the dashboard whenever they change:

1. Dashboard → Authentication → Emails → Templates.
2. Map repo file → template tab:
   | Repo file | Dashboard tab |
   |---|---|
   | `confirm-signup.html` | Confirm signup |
   | `magic-link.html` | Magic Link |
   | `password-reset.html` | Reset password |
3. Paste the full HTML into the "Message body" source view (`</>` toggle).
   Subjects: `Welcome to POXY WORLD` · `Your door to POXY WORLD` ·
   `Reset your POXY WORLD password`.
4. Keep the `{{ .ConfirmationURL }}` Go-template variables intact — Supabase
   substitutes them at send time.
5. Send yourself one of each (signup with a scratch address, magic link,
   reset) and check in Gmail web: card centered, button rounded, star
   divider visible, no horizontal scroll on mobile.

`purchase-receipt.html` is NOT an auth template. The payments Edge Function
loads it, replaces the `{{mustache}}` placeholders documented in the file
header, and sends via the transactional provider. Do not paste it into the
auth dashboard.

### Litmus-style checklist (run after any template edit)

- [ ] Gmail web: borders + border-radius render, no `<style>` dependence
- [ ] Gmail Android/iOS: 600px table collapses to viewport, text ≥ 12px
- [ ] Apple Mail: light scheme forced (`color-scheme` meta), no auto-invert
- [ ] Outlook web: bulletproof button padding survives
- [ ] Images off: layout intact (we use no images, only the ✦ glyph)
- [ ] Preheader shows in inbox list, hidden in the open letter

## OG images (`og-image` Edge Function)

Deploy with `npx supabase functions deploy og-image --no-verify-jwt`
(public: link scrapers cannot send auth headers). Verify after deploy:

```
https://<project-ref>.functions.supabase.co/og-image?kind=figure&name=Katana&rarity=legendary&remaining=1203&run=2500
```

Then run the URL through a share debugger (Facebook Sharing Debugger,
X Card Validator, Telegram @WebpageBot) once the public site routes are
live and pointing their `og:image` meta at the function.
