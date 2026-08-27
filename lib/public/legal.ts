// lib/public/legal.ts — single source of truth for the company-level legal pages.
//
// Everything on /privacy, /terms and /refunds renders from this file, so a change
// here changes every page at once. Per-product policies (quietkeep.com/privacy,
// quickscanz.com/privacy, edprosys.com/privacy, insureupi.com/privacy) remain the
// operative documents for those products; these pages are the company-level
// umbrella and the ones payment aggregators, app stores and enterprise buyers read.

export const ENTITY = 'Pranix AI Labs Private Limited'
export const ENTITY_SHORT = 'Pranix AI Labs'
export const CIN = 'U62011TS2026PTC209631'
export const UDYAM = 'UDYAM-TS-02-0307772'
export const DPIIT = 'DIPP241828'

// ─────────────────────────────────────────────────────────────────────────────
// REGISTERED OFFICE — as filed on the MCA record for CIN U62011TS2026PTC209631
// (master data pulled 18-08-2026). A payment aggregator's website check and
// Rule 4 of the Consumer Protection (E-Commerce) Rules 2020 both require the
// full registered address, and both cross-check it against this record — so it
// is rendered here exactly as filed. Do not "tidy" it without changing MCA too.
// ─────────────────────────────────────────────────────────────────────────────
export const ROC = 'ROC Hyderabad'
export const INCORPORATED_ON = '13 January 2026'
export const REGISTERED_ADDRESS_LINES: string[] = [
  'D. No. 8-2-618/2, 2nd Floor',
  'Reliance Humsafar Building',
  'Road No. 11, Banjara Hills',
]
export const REGISTERED_CITY = 'Hyderabad'
export const REGISTERED_STATE = 'Telangana'
export const REGISTERED_PIN = '500034'
export const REGISTERED_COUNTRY = 'India'

export const REGISTERED_ADDRESS = [
  ENTITY,
  ...REGISTERED_ADDRESS_LINES,
  [REGISTERED_CITY, REGISTERED_STATE, REGISTERED_PIN].filter(Boolean).join(', '),
  REGISTERED_COUNTRY,
].filter(Boolean)

export const SUPPORT_EMAIL = 'support@pranixailabs.com'
export const PHONE_DISPLAY = '+91 95154 79595'
export const PHONE_TEL = '+919515479595'
export const WHATSAPP = 'https://wa.me/919515479595'

// Grievance Officer under the Information Technology (Intermediary Guidelines and
// Digital Media Ethics Code) Rules 2021 and the Consumer Protection (E-Commerce)
// Rules 2020, and the point of contact for a Data Principal under s.13 of the
// Digital Personal Data Protection Act 2023.
export const GRIEVANCE_OFFICER = 'Prashanth Rangineni'
export const GRIEVANCE_EMAIL = SUPPORT_EMAIL
export const GRIEVANCE_SLA = '30 days'
export const ACK_SLA = '48 hours'

export const EFFECTIVE_DATE = '27 August 2026'

export type LegalSection = { title: string; body: string; list?: string[] }

// ─── Sub-processors ──────────────────────────────────────────────────────────
// Union of the processors named in the live per-product privacy policies. Any
// product may use a subset; the per-product policy is authoritative for that
// product. Keep this list in step with quietkeep.com/privacy.
export const SUBPROCESSORS: { name: string; purpose: string; region: string }[] = [
  { name: 'Supabase (AWS)', purpose: 'Application database, authentication and file storage', region: 'India / Singapore' },
  { name: 'Vercel', purpose: 'Web application hosting and edge delivery', region: 'Global edge' },
  { name: 'Razorpay', purpose: 'Payment processing for paid subscriptions', region: 'India' },
  { name: 'Anthropic', purpose: 'Language model inference for assistant features', region: 'United States' },
  { name: 'OpenAI', purpose: 'Language model inference and embeddings', region: 'United States' },
  { name: 'Groq', purpose: 'Low-latency inference and speech-to-text', region: 'United States' },
  { name: 'OpenRouter', purpose: 'Model routing and failover', region: 'United States' },
  { name: 'Sarvam AI', purpose: 'Indian-language speech recognition and synthesis', region: 'India' },
  { name: 'ElevenLabs', purpose: 'Speech synthesis for voice features', region: 'United States' },
  { name: 'MSG91', purpose: 'Transactional SMS and OTP delivery', region: 'India' },
  { name: 'Resend', purpose: 'Transactional email delivery', region: 'United States' },
  { name: 'OneSignal', purpose: 'Mobile and web push notifications', region: 'United States' },
  { name: 'Knock', purpose: 'Notification orchestration', region: 'United States' },
  { name: 'Google (Play, Firebase)', purpose: 'Android distribution, crash reporting and push transport', region: 'Global' },
]

// ─── Privacy ─────────────────────────────────────────────────────────────────
export const PRIVACY: LegalSection[] = [
  {
    title: '1. Who we are and what this covers',
    body: `${ENTITY} (CIN ${CIN}), a private limited company incorporated in India on ${INCORPORATED_ON} under ${ROC}, with its registered office at ${REGISTERED_ADDRESS_LINES.join(', ')}, ${REGISTERED_CITY} ${REGISTERED_PIN}, ${REGISTERED_STATE}, ${REGISTERED_COUNTRY}, operates pranixailabs.com and a family of consumer and business products — QuietKeep, QuickScanZ, EdProSys, InsureUPI, EasyVenuez, Cart2Save and EdGridAI.\n\nThis policy covers pranixailabs.com itself and sets the standard every Pranix product meets. Each product also publishes its own policy, linked from that product's own site, describing the data that product specifically handles. Where a product policy is more specific, the product policy governs for that product.`,
  },
  {
    title: '2. Our role under the DPDP Act 2023',
    body: 'For our consumer products, Pranix AI Labs is the Data Fiduciary — we decide why and how your personal data is processed.\n\nFor our business and institutional products, where a school, employer or business signs up and adds its own users, that organisation is the Data Fiduciary and Pranix AI Labs is a Data Processor acting on its documented instructions. In that case the organisation’s own privacy notice governs the relationship with its users, and we process data only as that organisation directs.',
  },
  {
    title: '3. What we collect on this website',
    body: 'pranixailabs.com is a corporate site. It does not require an account and does not run advertising or cross-site tracking.',
    list: [
      'Contact details you send us — your name, email address, phone number and message, when you email or call us or use a contact link.',
      'Voice input to the Aaria demo — audio is transcribed to answer your question and is not retained after the response is produced.',
      'Basic request and security logs — IP address, user agent, referring page and timestamps, kept by our hosting provider for security, abuse prevention and diagnostics.',
      'Strictly necessary cookies and local storage — used for theme preference and session integrity. No advertising cookies are set.',
    ],
  },
  {
    title: '4. What our products collect',
    body: 'Product data is described in each product’s own policy, because it differs sharply between them. Across the range it can include account identifiers, content you create (notes, reminders, documents, invoices, warranty records), voice input where you use a voice feature, and — only where the product’s function requires it and you have granted permission — location, camera, contacts or calendar access.\n\nWe do not sell personal data. We do not share it with advertisers. We do not use your content to train third-party foundation models.',
  },
  {
    title: '5. Why we process it',
    body: 'We process personal data on the basis of your consent, or where processing is necessary for the legitimate uses recognised by the DPDP Act 2023 and for performance of the contract you enter into when you use a paid product.',
    list: [
      'To provide the feature you asked for, including AI assistant responses',
      'To create, secure and support your account',
      'To take and reconcile payments, and to meet tax and accounting obligations',
      'To send service and transactional messages — never marketing you did not ask for',
      'To detect, investigate and prevent fraud, abuse and security incidents',
      'To meet legal, regulatory and law-enforcement obligations in India',
    ],
  },
  {
    title: '6. AI processing',
    body: 'Several Pranix products use language and speech models to interpret what you ask and to draft or summarise content. Where a request is sent to a model provider, only the content needed to answer that request is sent. Providers are engaged under terms that prohibit training on our customers’ data.\n\nAI output can be wrong. It is a draft for you to check, not a decision. We do not make solely automated decisions that produce legal or similarly significant effects on you.',
  },
  {
    title: '7. Sub-processors',
    body: 'We use the service providers listed below. Each is bound by contract to process personal data only on our instructions and to maintain appropriate security. We update this list when it changes.',
  },
  {
    title: '8. Storage, transfers and retention',
    body: 'Application data is stored in managed infrastructure in India and Singapore. Some sub-processors, in particular model and messaging providers, process data outside India; those transfers are made under contract and only to countries not restricted by the Central Government under s.16 of the DPDP Act 2023.\n\nWe keep personal data only for as long as the purpose requires. When you delete your account, we erase your personal data within 30 days, except records we are legally required to keep — principally invoices and tax records, retained for eight years under Indian law, and security logs retained for up to 180 days.',
  },
  {
    title: '9. Security',
    body: 'Data is encrypted in transit with TLS and at rest by the storage provider. Access to production data is restricted, authenticated and logged, and row-level security isolates one customer’s records from another’s. Secrets are held in a managed secrets store and rotated. Payment card details never reach our systems — they are handled entirely by our RBI-authorised payment aggregator.\n\nNo system is perfectly secure. If a personal data breach occurs, we will notify the Data Protection Board of India and affected users as required by the DPDP Act 2023.',
  },
  {
    title: '10. Your rights',
    body: 'As a Data Principal under the DPDP Act 2023 you may exercise the following rights by writing to us. We acknowledge within ' + ACK_SLA + ' and respond within ' + GRIEVANCE_SLA + '. We will ask you to verify your identity before acting.',
    list: [
      'Access — a summary of the personal data we process about you and who we have shared it with',
      'Correction — correction, completion or updating of inaccurate or incomplete data',
      'Erasure — deletion of your data where it is no longer needed for the purpose it was collected for',
      'Withdrawal of consent — as easily as you gave it; this does not affect processing already carried out',
      'Nomination — nominate a person to exercise your rights in the event of your death or incapacity',
      'Grievance redressal — an answer from our Grievance Officer before you approach the Data Protection Board of India',
    ],
  },
  {
    title: '11. Children',
    body: 'Our products are not offered to children under 18 for their own accounts. Where a product includes a feature for a parent or a school to manage a child’s record, that data is processed on the instruction of the parent or the institution, is not used for tracking or behavioural advertising, and is not used to target advertising at the child.',
  },
  {
    title: '12. Changes',
    body: 'We will update this policy as our products change. Material changes are notified by email to account holders and posted here at least 14 days before they take effect. The effective date at the top of this page always reflects the current version.',
  },
  {
    title: '13. Grievance Officer',
    body: `In accordance with the DPDP Act 2023 and the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules 2021, the Grievance Officer is:\n\n${GRIEVANCE_OFFICER}\n${ENTITY}\n${GRIEVANCE_EMAIL}\n${PHONE_DISPLAY}\n${REGISTERED_ADDRESS.slice(1).join('\n')}\n\nIf you are not satisfied with our response, you may complain to the Data Protection Board of India.`,
  },
]

// ─── Terms ───────────────────────────────────────────────────────────────────
export const TERMS: LegalSection[] = [
  {
    title: '1. Agreement',
    body: `These Terms of Service form a binding agreement between you and ${ENTITY} (CIN ${CIN}), "Pranix", "we" or "us". By using pranixailabs.com or any Pranix product or service, you accept these terms. If you do not accept them, do not use the service.\n\nIndividual products may add their own terms. Where they do, the product terms govern that product and these terms cover everything they do not address.`,
  },
  {
    title: '2. What we provide',
    body: 'Pranix AI Labs builds and operates AI-assisted software products, and provides professional services — websites, applications and AI solutions — to clients under separately signed statements of work.',
    list: [
      'QuietKeep — voice-first personal and business assistant',
      'QuickScanZ — warranty and invoice vault',
      'EdProSys — school management for Indian K-12',
      'InsureUPI — credit, loan and insurance comparison and distribution',
      'EasyVenuez — venue discovery and booking',
      'Cart2Save — neutral price comparison across affiliates, ONDC and local stores',
      'EdGridAI — education infrastructure',
      'Professional services — websites, mobile apps and AI implementation',
    ],
  },
  {
    title: '3. Eligibility and accounts',
    body: 'You must be at least 18 years old to create an account. Where a product offers a family, school or team feature, the adult or institution that adds a member is responsible for that member’s use.\n\nYou are responsible for the accuracy of your registration details and for keeping your credentials secure. Tell us promptly if you believe your account has been compromised.',
  },
  {
    title: '4. Acceptable use',
    body: 'You agree not to:',
    list: [
      'Store or transmit unlawful, harmful, defamatory or abusive content',
      'Attempt to access another user’s data or any system you are not authorised to access',
      'Reverse engineer, decompile or extract source code, models or prompts',
      'Use automated scripts, scrapers or bots to access the service outside a documented API',
      'Resell, sub-license or white-label access without a written agreement',
      'Interfere with, overload or degrade the service or its infrastructure',
      'Breach the Information Technology Act 2000, the DPDP Act 2023 or any other applicable law',
    ],
  },
  {
    title: '5. Fees, billing and taxes',
    body: 'Some products are free. Paid plans are stated on the relevant product’s pricing page in Indian Rupees and are billed in advance for the term you select. Prices are inclusive of applicable taxes unless the pricing page says otherwise; GST is charged where applicable and a tax invoice is issued.\n\nPayments are collected through RBI-authorised payment aggregators. We do not receive, store or process your full card number, CVV, UPI PIN or net-banking credentials — those are handled entirely by the aggregator and its PCI-DSS certified systems.\n\nProfessional services are invoiced against the signed statement of work, on the milestones and payment terms recorded in it.\n\nWe may change prices with 30 days’ notice to existing subscribers. A price change never applies to a term you have already paid for.',
  },
  {
    title: '6. Refunds and cancellation',
    body: 'Our refund and cancellation terms are set out in full in the Refund & Cancellation Policy, which forms part of these terms.',
  },
  {
    title: '7. Your data and your content',
    body: 'You own what you put into our products. You grant us a limited, non-exclusive, revocable licence to store, process and transmit that content strictly for the purpose of providing the service to you.\n\nWe do not claim ownership of your content, we do not sell it, and we do not use it to train third-party foundation models. Our handling of personal data is described in the Privacy Policy.\n\nYou can export or delete your data at any time. On account deletion, your personal data is erased within 30 days, except where law requires us to retain it.',
  },
  {
    title: '8. Our intellectual property',
    body: 'The software, interfaces, designs, documentation, brand names and logos of Pranix AI Labs and its products remain our property or that of our licensors. Nothing in these terms transfers any of it to you. Feedback you send us may be used without obligation or compensation.',
  },
  {
    title: '9. AI features and accuracy',
    body: 'Our products use artificial intelligence to interpret requests and to generate summaries, drafts, classifications and suggestions. AI output can be incomplete, outdated or wrong.\n\nYou are responsible for checking anything you act on. Our products are not a substitute for professional medical, legal, financial, tax or insurance advice, and nothing they produce constitutes such advice or a recommendation. Where a product presents financial or insurance products from third parties, the terms of that third-party provider govern the product you choose.',
  },
  {
    title: '10. Third-party services',
    body: 'Our products connect to third-party services — payment aggregators, messaging providers, model providers, app stores and, in some products, partner banks, NBFCs, insurers and merchants. We are not responsible for the acts, omissions, content, availability or terms of those third parties. Your relationship with them is governed by their own terms.',
  },
  {
    title: '11. Availability',
    body: 'We aim for high availability and publish live status at pranixailabs.com/status, but we do not guarantee uninterrupted or error-free service. We may modify, suspend or discontinue a feature; for a material change to a paid feature we will give at least 30 days’ notice.\n\nWe may suspend an account immediately where we reasonably believe it is being used unlawfully, is compromised, or presents a risk to other users or to the service.',
  },
  {
    title: '12. Disclaimers and limitation of liability',
    body: 'To the maximum extent permitted by law, the service is provided "as is" and "as available" without warranties of any kind, express or implied.\n\nWe are not liable for indirect, incidental, special, punitive or consequential loss, or for loss of profits, revenue, goodwill or data. Our aggregate liability arising out of or relating to the service is limited to the amount you paid us for that service in the twelve months preceding the event giving rise to the claim.\n\nNothing in these terms excludes or limits liability that cannot lawfully be excluded or limited, including liability for fraud or for death or personal injury caused by negligence.',
  },
  {
    title: '13. Indemnity',
    body: 'You agree to indemnify Pranix AI Labs against claims, damages and reasonable costs arising from your unlawful use of the service, your breach of these terms, or content you store or transmit through the service in breach of a third party’s rights.',
  },
  {
    title: '14. Termination',
    body: 'You may stop using the service and close your account at any time. We may terminate or suspend your access for a material breach of these terms, for unlawful use, or where we discontinue a product — in which case we will give reasonable notice and, for a paid plan, refund the unused portion of your current term.',
  },
  {
    title: '15. Governing law and disputes',
    body: 'These terms are governed by the laws of India. The courts at Hyderabad, Telangana have exclusive jurisdiction, subject to any right you have as a consumer to bring proceedings where you reside.\n\nBefore litigation, please contact our Grievance Officer — most matters are resolved there. As a consumer you may also use the National Consumer Helpline and the Online Dispute Resolution facility at consumerhelpline.gov.in, or the e-Daakhil portal.',
  },
  {
    title: '16. Changes to these terms',
    body: 'We may update these terms. Material changes are notified by email and in-product at least 14 days before they take effect. Continuing to use the service after the effective date means you accept the updated terms.',
  },
  {
    title: '17. Contact',
    body: `${ENTITY}\n${GRIEVANCE_EMAIL}\n${PHONE_DISPLAY}\n${REGISTERED_ADDRESS.slice(1).join('\n')}\nCIN ${CIN}`,
  },
]

// ─── Refunds ─────────────────────────────────────────────────────────────────
export const REFUNDS: LegalSection[] = [
  {
    title: '1. Scope',
    body: `This policy applies to every paid subscription sold by ${ENTITY} through its products and websites. It forms part of our Terms of Service. Professional services engagements are governed by the payment and termination terms of the signed statement of work, not by this policy.`,
  },
  {
    title: '2. Free products and free tiers',
    body: 'Several Pranix products are free to use and take no payment at all — QuickScanZ is free, and QuietKeep, EasyVenuez and Cart2Save offer a free tier with usage limits. Where nothing is charged, nothing is refundable, and you can stop using the product at any time without notice or penalty.',
  },
  {
    title: '3. What paid plans cost',
    body: 'Paid plans are priced on each product’s pricing page in Indian Rupees and are charged in advance for the term you choose. As at the effective date of this policy, QuietKeep is offered at ₹99 per month (Plus), ₹199 per month (Family) and ₹299 per month (Business), with annual billing charged at ten months’ price for twelve months of service. Current pricing on the product page always prevails over this summary.',
  },
  {
    title: '4. Cancellation',
    body: 'You can cancel a subscription at any time, from within the product or by writing to us — there is no cancellation fee and no notice period.\n\nCancelling stops the next renewal. Your plan stays active until the end of the term you have already paid for, and your data remains available to you for that period. Cancelling is not the same as deleting your account; if you also want your data erased, delete the account and we will erase it within 30 days.',
  },
  {
    title: '5. Refunds',
    body: 'We offer a full refund on a first-time paid subscription if you ask within 7 days of the first payment. Write to us from the email address on the account and tell us the product and the order or payment reference.',
    list: [
      'First subscription, requested within 7 days — full refund, no questions asked',
      'A charge you did not authorise, or a duplicate charge — refunded in full as soon as we verify it',
      'A billing error on our side, or a chargeable feature that did not work and we could not fix — refunded in full or pro-rata, whichever is fairer to you',
      'We discontinue a paid product or feature during your paid term — pro-rata refund of the unused portion',
      'Renewals after the first term, and cancellation part-way through a term — not refundable; service continues to the end of the term',
      'Accounts terminated for a breach of the Acceptable Use terms — not refundable',
    ],
  },
  {
    title: '6. How a refund is paid',
    body: 'Approved refunds are returned to the original payment method through the payment aggregator that took the payment. We initiate the refund within 3 working days of approving it. The aggregator and your bank then take a further 5 to 7 working days, and sometimes up to one billing cycle for a credit card, to post the amount. We cannot refund to a different account or instrument.\n\nIf a refund has not reached you 10 working days after we confirm it was initiated, write to us with the order reference and we will chase it with the aggregator and give you the reference number.',
  },
  {
    title: '7. Failed payments and duplicate debits',
    body: 'If money has left your account but the subscription did not activate, the payment has almost always failed at the aggregator and will be auto-reversed by your bank within 5 to 7 working days. Tell us anyway, with the UTR or payment reference — we will confirm the status and, if the payment did in fact reach us without activating your plan, we will either activate it or refund it, at your choice.',
  },
  {
    title: '8. How to raise a refund request',
    body: `Email ${GRIEVANCE_EMAIL} from the address registered on the account, or call ${PHONE_DISPLAY}. Include the product name, the plan, the payment date and the order or payment reference.\n\nWe acknowledge every request within ${ACK_SLA} and give you a decision within ${GRIEVANCE_SLA}, and usually much sooner. If you are not satisfied with the decision, escalate to our Grievance Officer, ${GRIEVANCE_OFFICER}, at the same address; unresolved consumer complaints may be taken to the National Consumer Helpline or the Online Dispute Resolution facility at consumerhelpline.gov.in.`,
  },
]
