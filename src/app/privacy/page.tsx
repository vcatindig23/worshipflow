import { publicPageMetadata } from "@/lib/seo"
import PublicLegalPage, { type LegalSection } from "@/components/public-legal-page"

export const metadata = publicPageMetadata("/privacy", "Privacy Policy", "Learn what information WorshipFlow handles, how workspace data is used, and the choices available to members.", true)

const sections: LegalSection[] = [
  {
    title: "Scope of this policy",
    paragraphs: [
      "This policy describes how the current WorshipFlow application is designed to handle information when you use its website and workspace features. WorshipFlow is a team-planning application for church worship teams. The exact information processed depends on the features your team uses and the configuration of the deployed service.",
    ],
  },
  {
    title: "Information you provide",
    paragraphs: [
      "Depending on how you use WorshipFlow, information may include account details such as your name and email address; profile and church workspace details; membership, team role, and assignment information; and content you or your team add to the workspace.",
      "Workspace content can include song titles, lyrics and chords, keys and tempos, service plans, schedules, setlists, rehearsal and preparation notes, team chat messages, shared files, reference recordings, attendance, and service-completion notes. Please only upload or share material you have permission to use and share with your team.",
    ],
  },
  {
    title: "How information is used",
    paragraphs: [
      "WorshipFlow uses information to provide the functions you request: managing accounts and workspace membership, displaying songs and service plans, coordinating assignments and schedules, delivering in-app notifications, supporting team communication, saving service history, and enforcing role-based access.",
      "Information may also be processed to maintain the application, investigate errors, protect accounts and workspaces, and respond to requests about use of the service. This policy does not promise that every listed feature is enabled in every deployment.",
    ],
  },
  {
    title: "Workspace visibility and sharing",
    paragraphs: [
      "WorshipFlow is built for collaboration. Information added to a church workspace may be visible to other members of that workspace according to their membership, role, permissions, and the feature involved. Administrators and leaders may have access to management features that ordinary members do not.",
      "Before adding a message, recording, song material, or file, consider whether the people in your workspace should be able to see it. Do not use shared workspace features to store passwords, payment-card data, or other highly sensitive information that the application does not need.",
    ],
  },
  {
    title: "Service providers",
    paragraphs: [
      "The application uses Supabase for authentication and backend services, including database and storage capabilities, and is configured for hosting and deployment through Vercel. These providers may process information as needed to operate the application under their own terms and privacy documentation. The precise processing locations and provider settings depend on the project configuration.",
    ],
  },
  {
    title: "Browser storage and offline charts",
    paragraphs: [
      "Some user-interface preferences and guided-tour progress may be saved in your browser so the experience can remember your choices. Live Stage can also save chart snapshots on the current device for offline access. The project documentation states that these snapshots are scoped to the signed-in account and that signing out clears them. Offline snapshots do not make the rest of the workspace available without an internet connection.",
      "Sign-in sessions use HttpOnly cookies. Browser features receive a short-lived access token held in memory; refresh tokens are not stored in local storage. Clearing browser storage may sign you out or remove locally saved preferences and chart snapshots.",
    ],
  },
  {
    title: "Retention and deletion",
    paragraphs: [
      "Workspace information may remain available for as long as it is needed to support the workspace and its history. The available in-app controls determine what a member or administrator can remove. Provider backups, security records, and operational logs may follow separate retention periods set by the relevant hosting or backend configuration.",
      "You can delete your account under Settings → Account security after confirming your current password. Deletion removes your sign-in, profile, memberships, messages, personal preferences, notifications, and uploads, including files shared with your team. Shared church songs, services, and historical activity remain with account references cleared. Past names or mentions in shared content may remain. Permission history is retained for security. The only administrator of a workspace must appoint another administrator first. File cleanup can be retried if interrupted; provider backups expire under the provider's retention policy.",
      "If you need help with an account or data request, contact the project maintainer through the available GitHub contact channels. Do not include personal information or account credentials in a public issue. A request may require enough information to identify the relevant account safely, and completion can depend on technical capabilities and applicable obligations.",
    ],
  },
  {
    title: "Security",
    paragraphs: [
      "The project uses Supabase Auth, server-side authorization checks, and database Row Level Security policies where configured. Access controls and security practices are reviewed as the application evolves. No internet service can guarantee absolute security, so avoid uploading information that is unnecessary for worship-team planning.",
    ],
  },
  {
    title: "Your choices and responsibilities",
    paragraphs: [
      "Keep your sign-in credentials private, use workspace features appropriately, and review what you share with other members. You can manage the profile, membership, and content controls made available in the application. If something appears to expose information to the wrong workspace members, stop sharing the affected content and contact the project maintainer privately.",
    ],
  },
  {
    title: "Policy updates",
    paragraphs: [
      "This policy may be updated as WorshipFlow's features, providers, or data practices change. The effective date at the top of this page identifies the version currently published here. Review this page periodically, particularly after significant product changes.",
    ],
  },
]

export default function PrivacyPage() {
  return (
    <PublicLegalPage
      title="Privacy Policy"
      eyebrow="Privacy at WorshipFlow"
      introduction="A plain-language overview of information used to run your worship-team workspace and the choices to keep in mind when sharing it."
      sections={sections}
    />
  )
}
