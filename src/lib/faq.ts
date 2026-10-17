export type FaqCategory =
  | "Getting started"
  | "Songs & charts"
  | "Services & setlists"
  | "Team & account"
  | "Files & communication"

export type FaqItem = {
  id: string
  category: FaqCategory
  question: string
  answer: string
  keywords: string[]
}

export const faqItems: FaqItem[] = [
  {
    id: "assigned-services",
    category: "Getting started",
    question: "Where can I see my upcoming service assignments?",
    answer:
      "Open My Schedule to review upcoming services you have been assigned to, check the service details, and see your response status.",
    keywords: ["schedule", "calendar", "upcoming", "assignment", "roster"],
  },
  {
    id: "assignment-response",
    category: "Getting started",
    question: "How do I confirm or decline a service assignment?",
    answer:
      "Open My Schedule, select the assigned service, and use the available response controls to let your worship leader know whether you can serve.",
    keywords: ["rsvp", "available", "unavailable", "maybe", "respond", "confirmation"],
  },
  {
    id: "manage-songs",
    category: "Songs & charts",
    question: "How do I add or update a song?",
    answer:
      "Open Songs to create a song or edit an existing one. You can maintain its title, lyrics, chord chart, key, tempo, and other preparation details in your shared church library.",
    keywords: ["library", "create", "edit", "add", "songbook"],
  },
  {
    id: "chords-transpose",
    category: "Songs & charts",
    question: "Can I change a song's key or hide the chords?",
    answer:
      "Open a song's chart and use the transpose controls to adjust the displayed key. You can also change chart text size and show or hide chords while practicing.",
    keywords: ["transpose", "transposition", "capo", "lyrics", "chordpro", "font size"],
  },
  {
    id: "create-service",
    category: "Services & setlists",
    question: "How do I create a setlist or plan a service?",
    answer:
      "Open Services to create a service plan, add songs, arrange the order, and coordinate timing and team assignments. Your setlists keep the details your team needs together.",
    keywords: ["set list", "service plan", "run of show", "order", "schedule", "planning"],
  },
  {
    id: "service-readiness",
    category: "Services & setlists",
    question: "How can I tell whether a service is ready?",
    answer:
      "Review the service's preparation and readiness details. They help you spot missing planning information, songs, or team confirmations before the service.",
    keywords: ["readiness", "checklist", "preparation", "pending", "team assignments"],
  },
  {
    id: "past-services",
    category: "Services & setlists",
    question: "Where can I find completed or past services?",
    answer:
      "Open Services and use its history view to review previous service plans and their details.",
    keywords: ["history", "completed", "past", "archive"],
  },
  {
    id: "reference-audio",
    category: "Songs & charts",
    question: "Can I practice with a song's reference recording?",
    answer:
      "When a song has a reference recording attached, you can play it while practicing, adjust playback speed, repeat the track, or loop a selected section.",
    keywords: ["audio", "demo", "recording", "mp3", "m4a", "wav", "loop", "practice"],
  },
  {
    id: "shared-files",
    category: "Files & communication",
    question: "Where can I find or share rehearsal files?",
    answer:
      "Open Files to upload and access documents, images, and audio resources shared in your church workspace. Keep rehearsal materials in one place so the team can find them when needed.",
    keywords: ["upload", "download", "documents", "resources", "attachments", "rehearsal"],
  },
  {
    id: "team-chat",
    category: "Files & communication",
    question: "How can I message my worship team?",
    answer:
      "Open Team Chat to share updates, coordinate rehearsals and services, and keep conversations with your worship team in one place.",
    keywords: ["chat", "message", "conversation", "group", "communication"],
  },
  {
    id: "profile-roles",
    category: "Team & account",
    question: "How do I update my profile or worship positions?",
    answer:
      "Open Profile to view your ministry details, then choose Edit profile to update your information and selected worship positions, such as singer, drummer, guitarist, or sound engineer.",
    keywords: ["profile", "drummer", "singer", "guitarist", "roles", "position", "bio", "avatar"],
  },
  {
    id: "manage-members",
    category: "Team & account",
    question: "How can I invite a teammate or change their workspace role?",
    answer:
      "Open Settings and go to Team. Administrators can invite members and manage workspace roles; the actions available to other members depend on their assigned permissions.",
    keywords: ["invite", "invitation", "admin", "administrator", "permissions", "member", "access"],
  },
];

export function searchFaqItems(query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) return faqItems

  return faqItems.filter((item) =>
    [
      item.question,
      item.answer,
      item.category,
      ...item.keywords,
    ]
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalizedQuery),
  )
}
