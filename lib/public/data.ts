// lib/public/data.ts — content model for the public site
export type Product = {
  id: string; name: string; emoji: string; color: string; tag: string;
  desc: string; tags: string[]; feats: string[]; url: string;
  status: 'live' | 'play' | 'soon' | 'dev'; statusTxt: string;
  logo?: string; logoSvg?: string; logoTile?: boolean; aariaLive?: boolean;
}

export const QUICKSCANZ_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#17130e"/><rect x="12" y="12" width="18" height="18" rx="4.5" fill="#fdfcf8"/><rect x="34" y="12" width="18" height="18" rx="4.5" fill="#fdfcf8" opacity="0.55"/><rect x="12" y="34" width="18" height="18" rx="4.5" fill="#fdfcf8" opacity="0.55"/><rect x="34" y="34" width="18" height="18" rx="4.5" fill="#fdfcf8" opacity="0.25"/></svg>`

export const EDGRID_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="pxegG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14b8a6"/><stop offset="1" stop-color="#0F9E96"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#pxegG)"/><g stroke="rgba(255,255,255,.55)" stroke-width="1.6"><line x1="22" y1="14" x2="22" y2="50"/><line x1="32" y1="14" x2="32" y2="50"/><line x1="42" y1="14" x2="42" y2="50"/><line x1="14" y1="22" x2="50" y2="22"/><line x1="14" y1="32" x2="50" y2="32"/><line x1="14" y1="42" x2="50" y2="42"/></g><circle cx="32" cy="32" r="6.4" fill="#fff"/><circle cx="32" cy="32" r="10.8" fill="none" stroke="#fff" stroke-width="1.6" opacity=".6"/><circle cx="42" cy="22" r="2.6" fill="#FFD166"/></svg>`

export const PRODUCTS: Product[] = [
  { id: 'edprosys', name: 'EdProSys', emoji: '🏫', color: '#6366f1', tag: '"The Operating System for Indian Education"',
    desc: 'AI-powered school management for Indian K-12 — attendance, fees, AI report cards in English & Telugu, WhatsApp parent bots and principal briefings.',
    tags: ['School OS', 'WhatsApp bots', 'AI report cards', 'Razorpay fees'],
    feats: ['WhatsApp parent communication with automated alerts', 'AI-generated report cards (English + Telugu)', 'Mobile-first attendance, marks & fee management', 'Principal dashboards with AI daily briefings'],
    url: 'https://www.edprosys.com', status: 'play', statusTxt: 'On Google Play', logo: 'https://www.edprosys.com/brand/icon.png', logoTile: true, aariaLive: true },
  { id: 'quietkeep', name: 'QuietKeep', emoji: '🎙️', color: '#5b5ef4', tag: '"Your Personal Life OS"',
    desc: 'A voice-first assistant that acts, not just answers — driving, daily briefs, finance, family and documents. Personal and Business editions.',
    tags: ['Voice-first', 'Personal + Business', 'Acts for you', 'PWA'],
    feats: ['Voice assistant that executes tasks, not just replies', 'Personal edition: life, finance, family & documents', 'Business edition: scanner-led payments, inventory & ops', 'Learns your patterns to work like a real assistant'],
    url: 'https://www.quietkeep.com', status: 'soon', statusTxt: 'Play Store — days away', logo: 'https://www.quietkeep.com/icon-512.png' },
  { id: 'quickscanz', name: 'QuickScanZ', emoji: '🧾', color: '#f59e0b', tag: '"Never lose a warranty or invoice again"',
    desc: 'Digital warranty & invoice vault for Indian households — expiry alerts, AI claim assistance and service-center lookup in 6 languages.',
    tags: ['90+ products', '12+ brands', '6 languages', 'Free forever'],
    feats: ['Warranty tracking with 30-day & 7-day expiry alerts', 'AI-powered claim filing assistance', 'Service-center locator across 12+ Indian brands', 'Works on any phone — English, हिंदी, తెలుగు & more'],
    url: 'https://www.quickscanz.com', status: 'play', statusTxt: 'On Google Play', logoSvg: QUICKSCANZ_SVG },
  { id: 'cart2save', name: 'Cart2Save', emoji: '🛒', color: '#2563eb', tag: '"Every price in India. One honest answer."',
    desc: 'Neutral price engine comparing affiliate partners, the ONDC open network and real local stores — groceries to travel. B2C app + B2B2C merchant marketplace.',
    tags: ['ONDC', '1,516+ live links', 'B2C + B2B2C', '0% listing fee'],
    feats: ['Three-layer price check: affiliates + ONDC + local stores', 'Weekly basket comparisons that show real savings', 'Business tier: local stores, delivery partners & pros', 'Neutral by design — no pay-to-rank, ever'],
    url: 'https://www.cart2save.com', status: 'soon', statusTxt: 'Play Store — days away', logo: 'https://www.cart2save.com/brand/icon-512.png', logoTile: true },
  { id: 'insureupi', name: 'InsureUPI', emoji: '🛡️', color: '#10b981', tag: '"One assistor, every bank"',
    desc: "A unified distribution cloud for credit cards, loans and insurance from India's leading banks & NBFCs — with 60-second AI eligibility scoring.",
    tags: ['Fintech', 'AI eligibility', 'DPDP-compliant', '256-bit'],
    feats: ['Side-by-side comparison across banks & NBFCs', 'AI eligibility scoring in 60 seconds', 'DPDP-compliant consent ledger', 'Paperless verification, WhatsApp/SMS tracking'],
    url: 'https://www.insureupi.com', status: 'play', statusTxt: 'On Google Play', logo: 'https://www.insureupi.com/logo.png' },
  { id: 'easyvenuez', name: 'EasyVenuez', emoji: '🎪', color: '#a855f7', tag: '"Festive Spaces. Unforgettable Celebrations."',
    desc: 'Discover and book premium wedding halls, banquet venues and celebration resorts — verified owners, transparent per-day pricing, concierge support.',
    tags: ['Weddings', 'Verified venues', 'Hyderabad pilot', 'Concierge'],
    feats: ['Search by location, capacity & budget', 'Amenity filters — catering, AV, stage, parking & more', 'Discover → Reserve → Celebrate in three steps', 'Partner dashboard for venue owners'],
    url: 'https://www.easyvenuez.com', status: 'soon', statusTxt: 'Play Store — days away', logo: 'https://www.easyvenuez.com/logo.png' },
  { id: 'edgridai', name: 'EdGridAI', emoji: '🧠', color: '#14b8a6', tag: '"A personal AI tutor, free, on any phone"',
    desc: 'Adaptive AI learning for Class 9-10 on the SCERT curriculum — practice that adapts to each student, in the language they learn best in.',
    tags: ['AI tutor', 'Class 9-10', 'SCERT', 'English + తెలుగు'],
    feats: ['Personalized practice that adapts to each student', 'Teacher dashboard showing class-wide gaps', 'English & Telugu today, more languages coming', 'DPDP-compliant, zero-setup for schools'],
    url: 'https://www.edgridai.com', status: 'dev', statusTxt: 'In development', logoSvg: EDGRID_SVG },
]

export const INFRA = [
  { e: '🎛️', t: 'Deterministic-first', d: 'The majority of operational logic is rules-based and reproducible. AI proposes; deterministic protocol decides.' },
  { e: '🗄️', t: 'Sovereign PostgreSQL', d: 'Our data lives on infrastructure we govern — every product on the same audited, RLS-protected data plane.' },
  { e: '🧑‍✈️', t: 'Supervised autonomy', d: 'A ~90/10 human-agent split. Agents build around the clock; the founder approves and merges every change.' },
  { e: '🔀', t: 'Provider-neutral AI', d: 'Multiple model providers, hot-swappable by policy. No single vendor can switch our company off.' },
  { e: '📼', t: 'Event-sourced everything', d: 'Every action is logged, attributable and replayable. Operational history is a first-class asset.' },
  { e: '🕸️', t: 'Multi-product orchestration', d: 'One control plane routes work across all seven products — shared design, shared learnings, shared uptime.' },
]

export const ENGINES = [
  { e: '🎙️', n: 'ENGINE 01', t: 'Aaria — Voice', d: 'Multilingual voice intelligence across every product. Ask, and your software answers and acts — in English, हिंदी, తెలుగు and more.' },
  { e: '🛰️', n: 'ENGINE 02', t: 'Pranix MCP — Agents', d: 'Our advanced agent gateway: routes tasks to a fleet of AI agents with role-based permissions, deterministic guardrails and a full audit log. It builds, tests and ships all seven products — the founder approves every merge.' },
  { e: '🎬', n: 'ENGINE 03', t: 'Pranix Motion — Content', d: 'A self-marketing content engine: scripts, voiceovers and finished promo videos generated end-to-end for our products — the same engine that can produce yours.' },
]

export const STATUS = [
  { n: 'EdProSys', c: '#6366f1', phase: 'Phase 2 — RBAC', health: 'Healthy', play: 'play', playTxt: 'On Google Play', url: 'https://www.edprosys.com' },
  { n: 'QuickScanZ', c: '#f59e0b', phase: 'Ready for release', health: 'Healthy', play: 'play', playTxt: 'On Google Play', url: 'https://www.quickscanz.com' },
  { n: 'InsureUPI', c: '#10b981', phase: 'MVP', health: 'Healthy', play: 'play', playTxt: 'On Google Play', url: 'https://www.insureupi.com' },
  { n: 'Cart2Save', c: '#2563eb', phase: 'Advanced MVP', health: 'Healthy', play: 'soon', playTxt: 'Days away', url: 'https://www.cart2save.com' },
  { n: 'QuietKeep', c: '#5b5ef4', phase: 'MVP', health: 'Healthy', play: 'soon', playTxt: 'Days away', url: 'https://www.quietkeep.com' },
  { n: 'EasyVenuez', c: '#a855f7', phase: 'Pilot — Hyderabad', health: 'Healthy', play: 'soon', playTxt: 'Days away', url: 'https://www.easyvenuez.com' },
  { n: 'EdGridAI', c: '#14b8a6', phase: 'Building', health: 'In development', play: 'dev', playTxt: 'In development', url: 'https://www.edgridai.com' },
]

export const SERVICES = [
  { e: '🎨', t: 'Website design & development', d: 'Modern, motion-rich, SEO-ready websites — landing pages, marketing sites and full web apps with dashboards.', tag: 'Next.js · animations · SEO' },
  { e: '📱', t: 'Mobile app building', d: 'Android apps published to the Google Play Store — PWA/TWA or native-grade builds, store listing and compliance included.', tag: 'Play Store · PWA · TWA' },
  { e: '🎙️', t: 'Voice AI integration', d: 'Put Aaria inside your product — multilingual voice queries and actions for Indian users, on a Bhashini-first stack.', tag: 'Aaria · ASR · TTS · NMT' },
  { e: '🤖', t: 'AI agents & automation', d: 'Founder-supervised AI agent fleets for your operations — support, back-office, reporting — governed by deterministic rules.', tag: 'MCP · agents · guardrails' },
  { e: '🛒', t: 'Commerce & ONDC', d: 'Storefronts, price engines and ONDC network integrations — we run one in production ourselves.', tag: 'ONDC · marketplaces' },
  { e: '🏫', t: 'Institution software', d: 'School management, adaptive learning and WhatsApp-first communication systems for Indian institutions.', tag: 'School OS · WhatsApp bots' },
  { e: '🎬', t: 'Marketing & video content', d: 'Pranix Motion generates your marketing for you — scripts, multilingual voiceovers and finished promo videos for products, launches and social.', tag: 'Pranix Motion · promo videos' },
  { e: '🛰️', t: 'Agent infrastructure (MCP)', d: 'We set up your own Pranix-style MCP gateway — AI agents wired to your tools with permissions, guardrails and audit logs.', tag: 'Pranix MCP · integrations' },
]

export const TICKER = ['✦ 7 products, one lab', '🎙️ Aaria — multilingual voice inside', '🛰️ Pranix MCP — advanced agent gateway', '🎬 Pranix Motion — AI video engine', '🏢 T-Hub member', '🏅 DPIIT recognized', '☁️ Microsoft for Startups', '🚀 AWS Startup Program', '🛒 ONDC network integrated', '📱 3 apps on Google Play — 3 more landing this week', "🗣️ Built for India, in India's languages", '🇮🇳 Made in Hyderabad', '🧑‍💻 Websites · Apps · AI — 95154 79595', '🤖 Founder-supervised AI engineering']

export const A_LANGS = [
  { c: 'en-IN', l: 'English' }, { c: 'hi-IN', l: 'हिंदी' }, { c: 'te-IN', l: 'తెలుగు' },
  { c: 'ta-IN', l: 'தமிழ்' }, { c: 'kn-IN', l: 'ಕನ್ನಡ' }, { c: 'mr-IN', l: 'मराठी' },
]

export const A_GREET: Record<string, string> = {
  'en-IN': 'Namaste! Ask me about any Pranix product.',
  'hi-IN': 'नमस्ते! मुझसे किसी भी Pranix प्रोडक्ट के बारे में पूछिए।',
  'te-IN': 'నమస్తే! ఏ Pranix ప్రొడక్ట్ గురించైనా అడగండి.',
  'ta-IN': 'வணக்கம்! எந்த Pranix தயாரிப்பு பற்றியும் கேளுங்கள்.',
  'kn-IN': 'ನಮಸ್ತೆ! ಯಾವುದೇ Pranix ಉತ್ಪನ್ನದ ಬಗ್ಗೆ ಕೇಳಿ.',
  'mr-IN': 'नमस्कार! कोणत्याही Pranix प्रॉडक्टबद्दल विचारा.',
}

export const A_KB: { k: string[]; a: string }[] = [
  { k: ['edprosys', 'school', 'स्कूल', 'స్కూల్', 'attendance', 'report card'], a: 'EdProSys is our operating system for Indian schools — attendance, fees, AI report cards in English and Telugu, and WhatsApp bots for parents. I already answer voice queries inside it for all six school roles!' },
  { k: ['quietkeep', 'life os', 'assistant', 'क्वाइट', 'క్వైట్'], a: 'QuietKeep is your personal Life OS — a voice-first assistant that acts, not just answers. It comes in Personal and Business editions, and its Play Store release is just days away.' },
  { k: ['quickscanz', 'warranty', 'invoice', 'वारंटी', 'వారంటీ', 'bill'], a: 'QuickScanZ keeps every warranty and invoice safe — expiry alerts, AI claim help and service-center lookup in six languages. It is live on Google Play, free forever.' },
  { k: ['cart2save', 'price', 'कीमत', 'ధర', 'compare', 'grocery', 'shopping', 'sasta'], a: 'Cart2Save checks every price in India — affiliate partners, the ONDC network and real local stores — and gives one honest answer. Over 1,516 live price links today.' },
  { k: ['insureupi', 'insurance', 'loan', 'credit card', 'बीमा', 'భీమా'], a: "InsureUPI compares credit cards, loans and insurance from India's leading banks with 60-second AI eligibility scoring — one assistor, every bank." },
  { k: ['easyvenuez', 'venue', 'wedding', 'function hall', 'शादी', 'వేడుక', 'banquet', 'book'], a: 'EasyVenuez finds and books premium wedding halls and celebration venues — verified owners, transparent pricing, concierge support. Piloting in Hyderabad right now!' },
  { k: ['edgrid', 'tutor', 'learn', 'पढ़ाई', 'చదువు', 'scert', 'class 9', 'class 10'], a: 'EdGridAI is a personal AI tutor for Class 9-10 on the SCERT curriculum — free, adaptive, and it teaches in the language you learn best in.' },
  { k: ['service', 'website', 'app', 'build', 'सर्विस', 'సర్వీస్'], a: 'Pranix Studio builds websites, Play Store apps, voice AI and agent automation for your business too — call 95154 79595 or write to support@pranixailabs.com.' },
  { k: ['aaria', 'voice', 'आरिया', 'ఆరియా', 'who are you', 'yourself'], a: "I'm Aaria — Pranix's multilingual voice engine, built on a Bhashini-first Indian-language stack. I live inside every Pranix product, so you can just talk to your software." },
  { k: ['mcp', 'agent', 'gateway', 'automation'], a: 'Pranix MCP is our advanced agent gateway — it routes work to a fleet of AI agents with role-based permissions, deterministic guardrails and full audit logs. It builds and ships all seven products, and we can set one up for your business too.' },
  { k: ['motion', 'video', 'content', 'marketing', 'promo'], a: 'Pranix Motion is our content engine — it generates scripts, multilingual voiceovers and finished promo videos automatically. Self-marketing, powered by AI. Want one for your brand? Call 95154 79595.' },
  { k: ['pranix', 'company', 'founder', 'lab'], a: 'Pranix AI Labs is a DPIIT-recognized, T-Hub member AI product studio from Hyderabad — seven products, one control plane, founder-supervised AI engineering.' },
]

export function aariaAnswer(q: string): string {
  const ql = q.toLowerCase()
  const hit = A_KB.find(e => e.k.some(k => ql.includes(k)))
  return hit ? hit.a : `You asked: "${q}" — in the full product, I route this to the right Pranix app. Try asking about EdProSys, Cart2Save, QuietKeep, QuickScanZ, InsureUPI, EasyVenuez or EdGridAI!`
}
