# IONIRIX Email + DNS Integration Plan

This document reflects the current production intent in this repository.

Current worker sender configuration:

```toml
EMAIL_TRANSPORT = "resend"
EMAIL_FROM = "mail@ionirix.com"
```

Because the sender is `mail@ionirix.com`, the Resend-verified sending domain must be `ionirix.com`.

## DNS Requirements

Publish one coherent DNS set for the apex domain. Do not mix this with `mail.ionirix.com` or `send.ionirix.com` records unless the worker sender is changed to those domains.

### SPF

```txt
Type: TXT
Name: @
Value: v=spf1 include:spf.resend.com ~all
```

Notes:

- This should be the only SPF TXT record for `ionirix.com`.
- Remove legacy MailChannels SPF includes from the apex domain.

### DKIM

Use the exact selector and value Resend shows for the apex domain.

Typical Cloudflare entry for apex-domain verification:

```txt
Type: TXT
Name: resend._domainkey
Value: v=DKIM1; p=YOUR_RESEND_PUBLIC_KEY
```

Important:

- If Resend's dashboard shows only `resend._domainkey`, use that exact host in Cloudflare for the `ionirix.com` zone.
- Do not use `resend._domainkey.mail` unless the verified domain is `mail.ionirix.com`.
- Do not use `mc1._domainkey` unless Resend explicitly tells you to.

### DMARC

```txt
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:39b54e74b4654217b31c5c28be2c5995@dmarc-reports.cloudflare.net
```

Notes:

- This is valid for the apex domain.
- Tighten to `p=quarantine` or `p=reject` only after verifying clean delivery.

### MX

MX records affect receiving, not Resend outbound verification email delivery.

Keep only the MX records you actually need for inbound mail workflows.

## Remove Conflicting Legacy Records

Do not keep any legacy records that conflict with the apex-domain Resend setup.

Remove or avoid re-adding:

- `v=spf1 include:relay.mailchannels.net ...`
- MailChannels DKIM selectors such as `mc1._domainkey`
- Subdomain-specific Resend records for `mail.ionirix.com` or `send.ionirix.com` unless the worker sender is changed to those domains

## Resend Configuration

In Resend:

1. Add domain `ionirix.com`.
2. Wait for SPF and DKIM verification to pass.
3. Confirm the domain status is verified.

## Worker Configuration

The repository is already configured to use Resend.

Current config in `wrangler.toml`:

```toml
EMAIL_TRANSPORT = "resend"
EMAIL_FROM = "mail@ionirix.com"
EMAIL_REPLY_TO = "mail@ionirix.com"
```

The `RESEND_API_KEY` secret has already been uploaded to the Cloudflare Worker for this project.

Operational note:

- Rotate the key after rollout because it was exposed during setup.

## Deployment

Deploy the worker after DNS verification completes:

```powershell
npx wrangler deploy
```

## Validation

After deployment:

1. Trigger signup.
2. Trigger resend verification if needed.
3. Check worker logs for successful delivery.

Expected log event:

```txt
[ION AUTH] verification_email_delivered
```

If delivery fails, inspect the structured provider metadata already emitted by the auth worker.

## Decision Rule

Only one of these configurations should exist at a time:

- Apex mode: `EMAIL_FROM = mail@ionirix.com` with apex SPF, apex DKIM, apex DMARC
- Subdomain mode: `EMAIL_FROM = mail@subdomain.ionirix.com` with matching SPF, DKIM, and DMARC on that same subdomain

Do not mix apex SPF with subdomain DKIM or vice versa.