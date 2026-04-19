import type { Metadata } from 'next'

export interface PublicPolicySection {
  title: string
  paragraphs: string[]
}

export interface PublicPolicyDocument {
  slug: string
  title: string
  subtitle: string
  metaTitle: string
  metaDescription: string
  sections: PublicPolicySection[]
}

export const publicPolicies = {
  terms: {
    slug: 'terms',
    title: 'Terms of Service',
    subtitle: 'The governing terms for access to Ionirix public pages, authenticated workspace routes, software interfaces, and related platform materials.',
    metaTitle: 'Terms of Service | Ionirix',
    metaDescription: 'Read the Ionirix Terms of Service governing access to public pages, authenticated workspace routes, software interfaces, and related platform materials.',
    sections: [
      {
        title: 'Acceptance and scope',
        paragraphs: [
          'These Terms of Service govern access to and use of the Ionirix website, authenticated workspace, software interfaces, simulations, models, and related services made available by Ionirix LLC. By accessing or using any part of the service, you agree to be bound by these Terms.',
          'If you use the service on behalf of an organization, you represent that you have authority to bind that organization, and references to you in these Terms include both the individual user and the represented entity where applicable.',
        ],
      },
      {
        title: 'Accounts, access, and permitted use',
        paragraphs: [
          'Access to some features may require registration, payment, identity verification, or explicit enterprise authorization. You are responsible for maintaining the confidentiality of account credentials and for all activity occurring under your account or access tokens.',
          'You may use the service only in compliance with applicable law, these Terms, and any additional product-specific or commercial terms issued by Ionirix. Ionirix may suspend, restrict, or revoke access where it reasonably determines that misuse, fraud, abuse, nonpayment, or security risk may exist.',
        ],
      },
      {
        title: 'Intellectual property, disclaimer, and liability limitations',
        paragraphs: [
          'The service, including all software, interfaces, visual design, simulations, outputs, content, branding, and related materials, is owned by Ionirix LLC or its licensors and is protected by intellectual property law. Except as expressly permitted in writing, you may not reproduce, distribute, modify, reverse engineer, scrape at damaging scale, create derivative offerings from, or otherwise exploit the service.',
          'To the maximum extent permitted by law, the service is provided on an as-is and as-available basis. Ionirix disclaims all implied warranties, including merchantability, fitness for a particular purpose, and non-infringement. Ionirix will not be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or for any loss of profits, revenues, data, goodwill, or business opportunity arising out of or related to the service, even if advised of the possibility of such damages.',
        ],
      },
    ],
  },
  privacy: {
    slug: 'privacy',
    title: 'Privacy Policy',
    subtitle: 'The public statement describing how Ionirix collects, uses, discloses, retains, and safeguards personal information across the service.',
    metaTitle: 'Privacy Policy | Ionirix',
    metaDescription: 'Review the Ionirix Privacy Policy describing how personal information is collected, used, disclosed, retained, and safeguarded across the service.',
    sections: [
      {
        title: 'Categories of information',
        paragraphs: [
          'Ionirix may collect information you provide directly, including account identifiers, email addresses, billing details, support communications, uploaded materials, prompts, configuration inputs, and other content submitted through the service.',
          'Ionirix may also collect technical and usage information such as IP address, browser and device characteristics, authentication records, event logs, diagnostic telemetry, entitlement state, and interaction data necessary to operate, secure, support, and improve the service.',
        ],
      },
      {
        title: 'Use and disclosure',
        paragraphs: [
          'Ionirix uses collected information to provide and administer the service, authenticate users, process transactions, enforce platform rules, monitor system integrity, respond to support requests, investigate incidents, comply with law, and develop or improve product functionality.',
          'Ionirix does not sell personal information. Information may be disclosed to service providers, infrastructure operators, payment processors, professional advisors, corporate affiliates, counterparties in a business transaction, or governmental authorities where reasonably necessary for operations, legal compliance, security response, or rights protection.',
        ],
      },
      {
        title: 'Retention, security, and rights',
        paragraphs: [
          'Ionirix retains information for as long as reasonably necessary to provide the service, maintain records, satisfy contractual or legal obligations, resolve disputes, enforce agreements, and preserve security-relevant evidence. Retention periods may vary according to data type, product configuration, and operational need.',
          'Subject to applicable law, you may request access, correction, deletion, or clarification regarding personal information by contacting support@ionirix.net. Ionirix may decline or limit a request where an exception applies, including where retention is necessary for billing, fraud prevention, legal compliance, or security purposes.',
        ],
      },
    ],
  },
  acceptableUse: {
    slug: 'acceptable-use',
    title: 'Acceptable Use Policy',
    subtitle: 'The rules governing lawful, secure, and non-abusive use of Ionirix public pages, authenticated surfaces, APIs, and related systems.',
    metaTitle: 'Acceptable Use Policy | Ionirix',
    metaDescription: 'Read the Ionirix Acceptable Use Policy governing lawful, secure, and non-abusive use of public pages, authenticated surfaces, APIs, and related systems.',
    sections: [
      {
        title: 'Authorized use',
        paragraphs: [
          'Ionirix may be used only for lawful purposes, in accordance with applicable agreements, and in a manner consistent with the intended operation, security posture, and technical limits of the platform. You are responsible for all prompts, content, uploads, instructions, credentials, and activity associated with your use of the service.',
          'Where access is provisioned to an organization, that organization is responsible for ensuring that employees, contractors, agents, and other authorized users comply with this Acceptable Use Policy.',
        ],
      },
      {
        title: 'Prohibited conduct',
        paragraphs: [
          'You may not use Ionirix to violate law, infringe intellectual property rights, transmit malware, engage in phishing or credential theft, interfere with service integrity, overload infrastructure, evade access controls, or attempt unauthorized access to systems, data, or accounts.',
          'You may not probe, scan, or test vulnerabilities without written authorization, circumvent entitlements or payment controls, scrape or extract data at abusive scale, exfiltrate information, or use the service in connection with fraudulent, deceptive, harmful, or otherwise restricted activity.',
        ],
      },
      {
        title: 'Monitoring and enforcement',
        paragraphs: [
          'Ionirix may monitor platform activity, usage patterns, and technical signals for the purpose of detecting abuse, enforcing this Policy, maintaining service reliability, and protecting users, systems, and third parties.',
          'Ionirix may investigate suspected violations and may suspend, rate-limit, terminate, preserve records relating to, or report accounts, traffic, or conduct that create legal, operational, reputational, or security risk.',
        ],
      },
    ],
  },
  securityCompliance: {
    slug: 'security-compliance',
    title: 'Security & Compliance',
    subtitle: 'A high-level description of Ionirix security measures, reporting channels, and the limits of public compliance statements.',
    metaTitle: 'Security & Compliance | Ionirix',
    metaDescription: 'Review the Ionirix Security & Compliance notice describing security measures, reporting channels, and the limits of public compliance statements.',
    sections: [
      {
        title: 'Security program',
        paragraphs: [
          'Ionirix maintains administrative, technical, and organizational measures intended to protect the confidentiality, integrity, and availability of the service and associated data processed in connection with the service.',
          'These measures may include access controls, authentication safeguards, environment separation, logging, monitoring, rate limiting, transport protection, dependency maintenance, incident response processes, and other controls appropriate to the nature of the platform and the risks identified by Ionirix.',
        ],
      },
      {
        title: 'Compliance representations',
        paragraphs: [
          'Public statements regarding security or compliance describe Ionirix operational practices at a high level and are provided for general informational purposes only. No statement on this page constitutes a certification, audit opinion, attestation, or guarantee unless Ionirix expressly publishes such status in writing.',
          'Customers with regulatory, contractual, procurement, or vendor-review requirements should contact Ionirix directly for current documentation, scope clarification, security questionnaires, and any available supporting materials.',
        ],
      },
      {
        title: 'Incident reporting and response',
        paragraphs: [
          'Potential vulnerabilities, abuse indicators, or security incidents may be reported to support@ionirix.net. Reports should include sufficient technical detail to support validation and investigation while avoiding unnecessary disclosure of sensitive data.',
          'Ionirix may triage, investigate, remediate, disclose, or otherwise respond to security issues according to severity, exploitability, customer impact, legal obligations, and operational context.',
        ],
      },
    ],
  },
  dataProcessingAddendum: {
    slug: 'data-processing-addendum',
    title: 'Data Processing Addendum',
    subtitle: 'A public summary of how Ionirix addresses processor-side responsibilities for customer data under separate written commercial terms.',
    metaTitle: 'Data Processing Addendum | Ionirix',
    metaDescription: 'Read the Ionirix Data Processing Addendum summary describing processor-side responsibilities for customer data under separate written commercial terms.',
    sections: [
      {
        title: 'Purpose and order of precedence',
        paragraphs: [
          'This page provides a public summary of baseline data-processing terms that may apply where Ionirix processes personal data on behalf of a business customer under a separate written services agreement.',
          'Where Ionirix and a customer enter into a signed Data Processing Addendum or other written data-processing terms, that signed agreement governs and controls over this summary to the extent of any inconsistency.',
        ],
      },
      {
        title: 'Processing roles and instructions',
        paragraphs: [
          'In the standard service model, the customer acts as controller, business, or equivalent principal for customer data submitted to the service, and Ionirix acts as processor, service provider, or equivalent downstream handler solely to the extent necessary to provide the contracted services.',
          'Ionirix processes covered personal data in accordance with documented customer instructions, applicable law, and the legitimate operational requirements necessary to maintain, secure, troubleshoot, and support the service.',
        ],
      },
      {
        title: 'Subprocessors, assistance, and contact',
        paragraphs: [
          'Ionirix may engage subprocessors or service providers for infrastructure, communications, support, analytics, billing, security, and other operational functions reasonably necessary to provide the service. Ionirix remains responsible for managing those parties within the scope of its contractual commitments.',
          'Customers seeking a signed DPA, additional information regarding subprocessors, or assistance with data subject requests, transfer assessments, or regulated workload review should contact support@ionirix.net before placing sensitive or regulated data into the service.',
        ],
      },
    ],
  },
  cookieSettings: {
    slug: 'cookie-settings',
    title: 'Cookie Settings',
    subtitle: 'The public notice describing how Ionirix uses browser-side storage technologies and what control options may be available to users.',
    metaTitle: 'Cookie Settings | Ionirix',
    metaDescription: 'Review the Ionirix Cookie Settings notice describing browser-side storage technologies and the control options available to users.',
    sections: [
      {
        title: 'Use of cookies and similar technologies',
        paragraphs: [
          'Ionirix may use cookies, local storage, and similar browser technologies to enable core site functionality, maintain authenticated sessions, preserve user preferences, support security controls, and understand service performance.',
          'Some of these technologies are strictly necessary for the service to operate, while others may support analytics, diagnostics, performance measurement, or product improvement activities consistent with applicable law.',
        ],
      },
      {
        title: 'User controls and limitations',
        paragraphs: [
          'Most browsers permit users to inspect, delete, block, or limit cookies and related site storage. If you disable or restrict these technologies, some features of the service may not function correctly, including sign-in, entitlement validation, preference persistence, or security-related workflows.',
          'Ionirix may revise its use of cookies and similar technologies as the platform evolves. Material changes may be reflected in this notice, in related privacy disclosures, or through additional user-facing controls where required.',
        ],
      },
      {
        title: 'Requests and deployment-specific handling',
        paragraphs: [
          'If you need additional information about browser-side storage used in connection with a particular workflow, environment, or feature, contact support@ionirix.net with sufficient implementation context for review.',
          'Where applicable law or deployment-specific requirements call for additional consent, preference management, or regional notice handling, Ionirix may implement more specific controls or disclosures for the relevant surface.',
        ],
      },
    ],
  },
} satisfies Record<string, PublicPolicyDocument>

export function buildPublicPolicyMetadata(document: PublicPolicyDocument): Metadata {
  return {
    title: document.metaTitle,
    description: document.metaDescription,
    openGraph: {
      title: document.metaTitle,
      description: document.metaDescription,
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title: document.metaTitle,
      description: document.metaDescription,
    },
  }
}