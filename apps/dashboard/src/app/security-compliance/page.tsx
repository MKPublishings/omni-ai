import { PublicPolicyPage } from '@/components/PublicPolicyPage'
import { buildPublicPolicyMetadata, publicPolicies } from '@/content/publicPolicies'

const policy = publicPolicies.securityCompliance

export const metadata = buildPublicPolicyMetadata(policy)

export default function SecurityCompliancePage() {
  return (
    <PublicPolicyPage
      title={policy.title}
      subtitle={policy.subtitle}
      sections={policy.sections}
    />
  )
}