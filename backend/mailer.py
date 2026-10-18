"""
Sends the password-reset email through Brevo's HTTPS API (free plan: 300 emails
a day, and you can send from your own verified email address without owning a
domain).

Why an HTTPS API and not SMTP: free hosting such as Render blocks the usual SMTP
ports, but ordinary HTTPS requests are always allowed. No extra Python package
is needed.

Settings (add them in backend/.env, and in Render -> leettrack-api -> Environment):
    BREVO_API_KEY    the API key from Brevo (starts with "xkeysib-")
    MAIL_FROM        the sender address you verified in Brevo
    MAIL_FROM_NAME   optional, defaults to "LeetTrack"
    FRONTEND_URL     the website address, no slash at the end

If these are not set, nothing is sent: the reset link is printed in the server
log instead (handy when testing on your own computer).
"""

import json
import logging
import os
import urllib.error
import urllib.request
from html import escape

log = logging.getLogger("leettrack.mail")

BREVO_URL = "https://api.brevo.com/v3/smtp/email"


def frontend_url() -> str:
    url = os.getenv("FRONTEND_URL", "").strip()
    if not url:
        origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
        url = origins[0].strip()
    return url.rstrip("/")


def is_configured() -> bool:
    return bool(os.getenv("BREVO_API_KEY") and os.getenv("MAIL_FROM"))


def _send(to_email: str, subject: str, text: str, html: str) -> bool:
    api_key = os.getenv("BREVO_API_KEY", "")
    sender = os.getenv("MAIL_FROM", "")
    if not (api_key and sender):
        return False

    body = json.dumps(
        {
            "sender": {"name": os.getenv("MAIL_FROM_NAME", "LeetTrack"), "email": sender},
            "to": [{"email": to_email}],
            "subject": subject,
            "textContent": text,
            "htmlContent": html,
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        BREVO_URL,
        data=body,
        method="POST",
        headers={
            "api-key": api_key,
            "content-type": "application/json",
            "accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return 200 <= resp.status < 300
    except urllib.error.HTTPError as exc:
        # Log Brevo's reason (e.g. unverified sender) but never the API key.
        log.error("Email not sent: Brevo said %s %s", exc.code, exc.read()[:300])
    except Exception as exc:  # network problem, timeout, ...
        log.error("Email not sent: %s", exc)
    return False


def send_password_reset(to_email: str, username: str, token: str) -> bool:
    link = f"{frontend_url()}/reset-password?token={token}"

    if not is_configured():
        # Local testing: no email service set up, so show the link in the log.
        log.warning("EMAIL NOT CONFIGURED. Password reset link for %s: %s", to_email, link)
        print(f"\n[LeetTrack] Password reset link for {to_email}:\n{link}\n", flush=True)
        return False

    minutes = os.getenv("RESET_TOKEN_MINUTES", "30")
    text = (
        f"Hi {username},\n\n"
        f"Use this link to choose a new LeetTrack password. It works once and "
        f"expires in {minutes} minutes:\n\n{link}\n\n"
        "If you didn't ask for this, you can ignore this email. Your password "
        "won't change."
    )
    html = f"""\
<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a;line-height:1.5">
  <p>Hi {escape(username)},</p>
  <p>Use the button below to choose a new LeetTrack password. The link works once
  and expires in {escape(minutes)} minutes.</p>
  <p style="margin:24px 0">
    <a href="{escape(link)}" style="background:#4f6df5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">Choose a new password</a>
  </p>
  <p style="font-size:13px;color:#555">Button not working? Paste this address into your browser:<br>
  <span style="word-break:break-all">{escape(link)}</span></p>
  <p style="font-size:13px;color:#555">If you didn't ask for this, ignore this email. Your password won't change.</p>
</div>"""
    return _send(to_email, "Reset your LeetTrack password", text, html)
