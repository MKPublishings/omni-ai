const DEFAULT_AUTH0_DOMAIN = 'ion-ai.us.auth0.com'
const DEFAULT_AUTH0_CLIENT_ID = 'tlXPaqF8p70rPlIbKkKyEOXXJPjenTxf'
const DEFAULT_AUTH0_APP_ORIGIN = 'https://ionirix.com'

function normalizeOrigin(value?: string | null): string {
  return String(value || '').trim().replace(/\/+$/, '')
}

export interface Auth0ClientConfig {
  appOrigin: string
  clientId: string
  domain: string
  enabled: boolean
}

export function getAuth0ClientConfig(): Auth0ClientConfig {
  const domain = (process.env.NEXT_PUBLIC_AUTH0_DOMAIN || DEFAULT_AUTH0_DOMAIN).trim()
  const clientId = (process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || DEFAULT_AUTH0_CLIENT_ID).trim()
  const appOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_AUTH0_APP_ORIGIN) || DEFAULT_AUTH0_APP_ORIGIN

  return {
    appOrigin,
    clientId,
    domain,
    enabled: Boolean(domain && clientId && appOrigin),
  }
}

export function getAuth0ReturnToUrl(): string {
  return `${getAuth0ClientConfig().appOrigin}/`
}
