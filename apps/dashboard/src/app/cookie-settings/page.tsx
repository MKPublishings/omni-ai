import { PublicPolicyPage } from '@/components/PublicPolicyPage'
import { buildPublicPolicyMetadata, publicPolicies } from '@/content/publicPolicies'

const policy = publicPolicies.cookieSettings

export const metadata = buildPublicPolicyMetadata(policy)

export default function CookieSettingsPage() {
  return (
    <PublicPolicyPage
      title={policy.title}
      subtitle={policy.subtitle}
      sections={policy.sections}
    />
  )
}