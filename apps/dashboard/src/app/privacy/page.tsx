import { PublicPolicyPage } from '@/components/PublicPolicyPage'
import { buildPublicPolicyMetadata, publicPolicies } from '@/content/publicPolicies'

const policy = publicPolicies.privacy

export const metadata = buildPublicPolicyMetadata(policy)

export default function PrivacyPage() {
  return (
    <PublicPolicyPage
      title={policy.title}
      subtitle={policy.subtitle}
      sections={policy.sections}
    />
  )
}