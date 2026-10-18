# Password features: what changed and how to turn on reset emails

## What works right away (no setup)
- Eye icon on every password box (login, sign up, reset, profile), plus a Caps Lock warning.
- Sign up asks you to type the password twice and shows a simple strength hint.
- Profile page -> Password: change your password (current + new + confirm).
- "Forgot password?" on the login page.

## What needs one-time setup: the reset EMAIL
"Forgot password" must email a link, so the backend needs an email service.
Until you set one up, the link is **printed in the backend log** instead
(Render -> leettrack-api -> Logs: look for "Password reset link for ...").
That is enough for you to test, but real users need the email.

The code uses Brevo (free plan, about 300 emails a day; check Brevo's current limits).
It uses an HTTPS API, not SMTP, because free hosting such as Render blocks SMTP ports.

1. Sign up at brevo.com (free).
2. Add and verify a sender: your own email address, in Brevo's "Senders" settings.
   Brevo emails you a link to confirm it.
3. Create an API key (Brevo -> SMTP & API -> API keys). Copy it (starts with `xkeysib-`).
   Menu names can differ slightly; search Brevo's help for "create API key".
4. In Render -> leettrack-api -> Environment, add:
   - `BREVO_API_KEY` = the key
   - `MAIL_FROM` = the sender address you verified in step 2
   - `FRONTEND_URL` = your website address (https://leettrack-web-....onrender.com), no slash at the end
   - `MAIL_FROM_NAME` = LeetTrack (optional)
   Save. The API restarts by itself.
5. Test: open the website -> Log in -> Forgot password -> use your signup email.

Note: if the sender is a free webmail address (gmail.com and similar), some inboxes
may put the email in spam. Check spam first. For dependable delivery, send from an
address on a domain you own.

## Security notes
- The reset link works once and expires after 30 minutes. Changing the password
  by any route kills older links.
- The "forgot password" reply is identical whether or not the email has an account.
- Limits: 5 forgot-password requests, 5 bad reset attempts and 5 wrong
  "current password" tries per 15 minutes.
- Already logged-in sessions elsewhere are NOT signed out when a password changes;
  they expire on their own after 24 hours.
