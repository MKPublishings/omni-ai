import { PublicPolicyPage } from '@/components/PublicPolicyPage'
import { buildPublicPolicyMetadata, publicPolicies } from '@/content/publicPolicies'

const policy = publicPolicies.terms

export const metadata = buildPublicPolicyMetadata(policy)

export default function TermsPage() {
  return (
    <PublicPolicyPage
      title={policy.title}
      subtitle={policy.subtitle}
      sections={policy.sections}
    />
  )
}