// lib/public/gallery.ts — single source of truth for the public /gallery page.
//
// How to add photos (no code knowledge needed beyond this file):
//   1. Put the image files in public/gallery/<event id>/ (e.g. public/gallery/nvidia-voiceai-blr-2026/01.jpg).
//      Use .jpg or .webp, about 1600 px on the long side, under ~400 KB each.
//   2. Add one line per photo to that event's `photos` list below: { src: '/gallery/<id>/01.jpg', alt: 'What is in the photo' }.
//   3. An event with no photos yet shows a "Photos coming soon" tile, so nothing ever looks broken.
//
// Facts here come from the event tickets/registrations (Luma passes, host emails). Keep them factual:
// only list events Pranix actually attended or presented at.

export type GalleryPhoto = { src: string; alt: string }

export type GalleryEvent = {
  id: string
  title: string
  host: string
  date: string // human-readable, e.g. '7 Oct 2026'
  place: string
  blurb: string
  tags: string[]
  photos: GalleryPhoto[]
}

export const NVIDIA_INCEPTION_BADGE = '/badges/nvidia-inception.svg'

export const FOUNDER = {
  name: 'Prashanth Rao Rangineni',
  role: 'Founder, Pranix AI Labs',
  // Drop founder photos into public/gallery/founder/ and list them here.
  photos: [] as GalleryPhoto[],
  linkedin: 'https://www.linkedin.com/in/prashanth-rao-rangineni-9a3b5266',
}

export const GALLERY_EVENTS: GalleryEvent[] = [
  {
    id: 'nvidia-voiceai-blr-2026',
    title: 'NVIDIA VoiceAI Ecosystem Meetup',
    host: 'NVIDIA (Startup Ecosystem, South Asia)',
    date: '7 Oct 2026',
    place: 'NVIDIA Graphics India, Bengaluru',
    blurb: 'Pranix showcased Aaria — our multilingual voice engine for Indian users — to the NVIDIA voice-AI startup ecosystem.',
    tags: ['NVIDIA', 'Voice AI', 'Bengaluru'],
    photos: [],
  },
  {
    id: 'thub-nvidia-hyd-2026',
    title: "T-Hub × NVIDIA — India's AI Startup Moment",
    host: 'T-Hub with NVIDIA',
    date: '8 Sep 2026',
    place: 'T-Hub, Hyderabad',
    blurb: 'Joined Hyderabad’s AI startup community at T-Hub and NVIDIA’s startup showcase.',
    tags: ['NVIDIA', 'T-Hub', 'Hyderabad'],
    photos: [],
  },
  {
    id: 'google-for-startups-hub-hyd',
    title: 'Google for Startups Hub',
    host: 'Google for Startups Hub @ T-Hub (with Government of Telangana)',
    date: '2026',
    place: 'T-Hub, Hyderabad',
    blurb: 'Pranix is a Google for Startups Hub pass holder, taking part in founder sessions and community programmes at the Hub.',
    tags: ['Google for Startups', 'T-Hub', 'Hyderabad'],
    photos: [],
  },
]
