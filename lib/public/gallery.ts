// lib/public/gallery.ts — single source of truth for the public /gallery page.
//
// How to add photos:
//   1. Put the image files in public/gallery/<event id>/ as .webp or .jpg, about 1600 px on the
//      long side and under ~400 KB each. Strip phone location data (re-export the image).
//   2. Add one line per photo to that event's `photos` list below: { src, alt }.
//   3. An event with no photos shows a "Photos coming soon" tile, so nothing looks broken.
//
// Keep every claim factual and sourced (event invites, tickets, organiser posts). The `proud`
// line is the achievement in one sentence; `points` are what happened, in plain words.

export type GalleryPhoto = { src: string; alt: string }

export type GalleryEvent = {
  id: string
  title: string
  host: string
  date: string // human-readable, e.g. '7 Oct 2026'
  place: string
  proud: string // the headline achievement, one sentence
  blurb: string
  points: string[]
  tags: string[]
  source?: { label: string; url: string }
  photos: GalleryPhoto[]
}

export const NVIDIA_INCEPTION_BADGE = '/badges/nvidia-inception.svg'

export const FOUNDER = {
  name: 'Prashanth Rao Rangineni',
  role: 'Founder, Pranix AI Labs',
  photos: [
    { src: '/gallery/nvidia-voiceai-blr-2026/01.webp', alt: 'Prashanth Rao Rangineni presenting QuietKeep and its measured results at NVIDIA, Bengaluru' },
    { src: '/gallery/gfs-operators-mindset-2026/03.webp', alt: 'Prashanth Rao Rangineni speaking at the Google for Startups Hub session' },
  ] as GalleryPhoto[],
  linkedin: 'https://www.linkedin.com/in/prashanth-rao-rangineni-9a3b5266',
}

// Headline numbers shown at the top of the page. Each one is from a source linked on its event.
export const HIGHLIGHTS = [
  { n: '1 of 8', l: 'startups presenting at NVIDIA’s Voice AI showcase, Bengaluru' },
  { n: '60', l: 'startups across 6 cities in NVIDIA’s Bring Your Own Problem series' },
  { n: '3', l: 'Indian languages in one sentence — Telugu, Hindi, English' },
  { n: '0.50 s', l: 'median time to a finished sentence, on a CPU server' },
]

export const GALLERY_EVENTS: GalleryEvent[] = [
  {
    id: 'nvidia-voiceai-blr-2026',
    title: 'NVIDIA Voice AI Ecosystem Meetup — BYOP Showcase',
    host: 'NVIDIA Startup Ecosystem, South Asia (Arundhati Banerjee)',
    date: '7 Oct 2026',
    place: 'NVIDIA, Bengaluru',
    proud: 'Pranix AI Labs was one of 8 startups chosen to present at the showcase that closed NVIDIA’s Voice AI “Bring Your Own Problem” series.',
    blurb:
      'The series brought 60 startups together with NVIDIA’s Voice AI team across six cities, turning real production problems into scoped plans and working builds. The showcase brief was simple: working builds, honest measurements.',
    points: [
      'Presented QuietKeep, our Telugu–Hindi–English phone assistant powered by Aaria',
      'Shared measured results: Telugu word error rate down from 16.4% to 13.0%, Hindi from 8.4% to 6.2%',
      '0.50 s median time to a finished sentence, running on a 512 MB CPU server with no GPU',
      'A standing-room crowd of 120 attendees, from 500+ registrations',
    ],
    tags: ['NVIDIA', 'Voice AI', 'Presenter', 'Bengaluru'],
    source: { label: 'NVIDIA’s post on the showcase', url: 'https://www.linkedin.com/posts/arundhati-banerjee-130912a0_voiceai-founders-investors-ugcPost-7513947465495105537-IgTD/' },
    photos: [
      { src: '/gallery/nvidia-voiceai-blr-2026/01.webp', alt: 'Pranix founder presenting “Tech stack and measured results” at NVIDIA Bengaluru' },
      { src: '/gallery/nvidia-voiceai-blr-2026/02.webp', alt: 'Full house at the NVIDIA Voice AI Ecosystem Meetup, Bengaluru' },
      { src: '/gallery/nvidia-voiceai-blr-2026/03.webp', alt: 'Founders and engineers listening to a presentation at NVIDIA Bengaluru' },
    ],
  },
  {
    id: 'nvidia-byop-hyd-2026',
    title: 'NVIDIA Voice AI “Bring Your Own Problem” — Hyderabad',
    host: 'NVIDIA Startup Ecosystem, South Asia',
    date: 'Sep 2026',
    place: 'NVIDIA, Hyderabad',
    proud: 'We brought our hardest problem — real-time voice in code-mixed Indian languages — to NVIDIA’s Voice AI team, and left with a scoped build plan.',
    blurb:
      'The Hyderabad round of NVIDIA’s BYOP series paired founders with NVIDIA engineers to work through production challenges in speech recognition, latency and Indian-language voice.',
    points: [
      'Problem we brought: streaming, low-latency voice that understands Telugu, Hindi and English mixed in one sentence',
      'NVIDIA’s team asked us to build the scope with them — the work we then showcased in Bengaluru',
      'Met NVIDIA’s Voice AI team and fellow Inception founders',
    ],
    tags: ['NVIDIA', 'BYOP', 'Hyderabad'],
    photos: [
      { src: '/gallery/nvidia-byop-hyd-2026/01.webp', alt: 'Founders with the NVIDIA team at NVIDIA Hyderabad' },
      { src: '/gallery/nvidia-byop-hyd-2026/02.webp', alt: 'NVIDIA BYOP working session in Hyderabad' },
    ],
  },
  {
    id: 'gfs-enterprise-ai-2026',
    title: 'Enterprise AI: Built Right, Sold Right',
    host: 'Google for Startups Hub @ T-Hub',
    date: '15 May 2026',
    place: 'Google for Startups Hub, T-Hub, Hyderabad',
    proud: 'Learned first-hand from enterprise-AI founders how to win trust, survive long sales cycles and get real adoption.',
    blurb:
      'Gopal (Co-Founder & CEO, Cognida AI) and Sandeep Sinha (Head of Growth, Beacon.li), moderated by Savita (Co-Founder & CEO, KonnectNXT), shared what their early journey actually looked like — from first product to first customers.',
    points: [
      'Solving the right problem before building the product',
      'Building trust and navigating long enterprise sales cycles',
      'Getting real adoption inside organisations',
    ],
    tags: ['Google for Startups', 'T-Hub', 'Enterprise AI'],
    photos: [
      { src: '/gallery/gfs-enterprise-ai-2026/01.webp', alt: 'Founders at the Enterprise AI session, Google for Startups Hub, T-Hub' },
      { src: '/gallery/gfs-enterprise-ai-2026/02.webp', alt: 'Group photo after the Enterprise AI session at T-Hub' },
    ],
  },
  {
    id: 'gfs-operators-mindset-2026',
    title: 'The Operator’s Mindset: Building Resilient AI Startups',
    host: 'Google for Startups Hub @ T-Hub',
    date: '29 Apr 2026',
    place: 'Google for Startups Hub, T-Hub, Hyderabad',
    proud: 'Invite-only office hour with Google leadership on building AI companies with real staying power.',
    blurb:
      'Arijit Sarker, Vice President of gTech Ads at Google, shared what it takes to build durable organisations, in a session moderated by Ragini Das, Head of Google for Startups India.',
    points: [
      'Building with resilience in the AI era',
      'Balancing speed with operating discipline',
      'Making better decisions through uncertainty, and thinking beyond short-term momentum',
    ],
    tags: ['Google for Startups', 'Google', 'T-Hub'],
    photos: [
      { src: '/gallery/gfs-operators-mindset-2026/01.webp', alt: 'Founders with Google leadership at the Google for Startups Hub, T-Hub' },
      { src: '/gallery/gfs-operators-mindset-2026/02.webp', alt: 'Group photo at The Operator’s Mindset session' },
      { src: '/gallery/gfs-operators-mindset-2026/03.webp', alt: 'Founder asking a question during the session' },
    ],
  },
]
