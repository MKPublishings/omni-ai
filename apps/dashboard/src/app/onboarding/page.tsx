import type { Metadata } from 'next'
import { OnboardingPage } from '@/onboarding/components'

export const metadata: Metadata = {
  title: 'Ionirix Onboarding',
  description: 'Sovereign onboarding flow for provisioning an Ionirix account and calibrated workspace shell.',
}

export default function OnboardingRoute() {
  return <OnboardingPage />
}
