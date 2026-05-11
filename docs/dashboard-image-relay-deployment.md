## Dashboard Image Relay Deployment

This deployment path bypasses the Cloudflare Worker image route and executes image generation from the dashboard runtime.

### Required dashboard runtime environment

Use these values for the dashboard deployment:

```text
DASHBOARD_IMAGE_DIRECT_RELAY=true
ion_HOST=https://worker-ion.ionirix.com
ion_FETCH_HOST=https://worker-ion.ionirix.com
ion_WS=wss://img.ionirix.com/ws
ion_MOCK=false
DEFAULT_CHECKPOINT=ion-citizen-xl-vpred-v2.0
```

The committed Vercel config in [apps/dashboard/vercel.json](c:/Users/Slizz/OneDrive/Documents/GitHub/website/ion-ai/apps/dashboard/vercel.json) now includes these non-secret runtime values.

### Validation commands

Run the dashboard-only smoke:

```text
npm run smoke:image:dashboard-relay
```

Override the target if you are validating a custom dashboard domain:

```text
set ION_DASHBOARD_URL=https://dashboard.ionirix.com
npm run smoke:image:dashboard-relay
```

Run the unified relay validator:

```text
npm run validate:image:relay-paths
```

This validator checks:

- `GET /queue` on the ion host
- `POST /prompt` on the ion host
- dashboard `/api/image`
- worker `/api/image`

By default the validator treats worker failure as informational while the dashboard relay is the active bypass. Set `ION_VALIDATOR_REQUIRE_WORKER=1` if worker success should be enforced.