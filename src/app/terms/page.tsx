import { publicPageMetadata } from "@/lib/seo"
import PublicLegalPage, { type LegalSection } from "@/components/public-legal-page"

export const metadata = publicPageMetadata("/terms", "Terms of Service", "Review the terms for using WorshipFlow accounts, church workspaces, song content, team collaboration, and the application.", true)

const sections: LegalSection[] = [
  {
    title: "Agreement and scope",
    paragraphs: [
      "These terms describe basic conditions for using WorshipFlow, a workspace intended to help church worship teams organize songs, plan services, coordinate assignments, communicate, and review completed services. By accessing or using the application, you agree to use it consistently with these terms and applicable law. If you do not agree, do not use the service.",
      "WorshipFlow's public source repository is distributed under the license provided in that repository. Access to the hosted application does not grant additional rights to copy, modify, deploy, or redistribute its source code.",
    ],
  },
  {
    title: "Accounts and workspace access",
    paragraphs: [
      "You are responsible for keeping your sign-in credentials private and for activity carried out through your account. Provide accurate account information and tell the project maintainer if you believe your account has been accessed without permission.",
      "Workspace access is controlled through membership and assigned roles. Use only the workspaces and information you are authorized to access. Administrators and leaders are responsible for assigning access thoughtfully and removing access when it is no longer appropriate.",
    ],
  },
  {
    title: "Acceptable use",
    paragraphs: [
      "Use WorshipFlow for lawful worship-team planning and collaboration. You must not attempt to bypass authentication or access controls, interfere with service operation, probe systems without authorization, upload malware, misuse other people's personal information, or use the application for unlawful, fraudulent, or abusive activity.",
      "Do not share credentials, private invitations, or confidential workspace information with people who are not authorized to receive it. Do not use the application to harass, threaten, or impersonate others.",
    ],
  },
  {
    title: "Your content and permissions",
    paragraphs: [
      "You and your team remain responsible for the content you submit, upload, or share, including lyrics, chord charts, recordings, images, files, messages, and service notes. You must have the rights, permissions, or other lawful basis needed to use that content and share it with the relevant workspace members.",
      "You retain any rights you already hold in your content. To provide the features you choose to use, you authorize WorshipFlow to host, store, process, and display that content to you and the authorized members of your workspace. This permission is limited to operating and supporting the service; it does not transfer ownership of your content to WorshipFlow.",
      "A song or recording being available online does not automatically authorize copying or sharing it. You are responsible for respecting copyright, licensing terms, privacy, and the requirements of your church or organization.",
    ],
  },
  {
    title: "Collaboration and notifications",
    paragraphs: [
      "Service plans, assignments, messages, files, and related information may be visible to authorized members of the same workspace. You are responsible for checking recipients and permissions before sharing information. Notifications and reminders are conveniences and should not be treated as guaranteed delivery of urgent or time-critical information.",
    ],
  },
  {
    title: "Availability and changes",
    paragraphs: [
      "Features may change, be temporarily unavailable, or require an internet connection. Offline chart snapshots are limited to the charts saved on the device; they do not make all workspace information available offline. Keep any additional copies or records your team needs for continuity.",
      "The project may update, suspend, or discontinue parts of the service to maintain it, address security issues, or respond to technical or legal requirements. Where practical, changes that materially affect use will be reflected in the application or its published documentation.",
    ],
  },
  {
    title: "Third-party services",
    paragraphs: [
      "WorshipFlow relies on third-party infrastructure, including Supabase for backend services and Vercel for hosting and deployment as configured. Those providers may have their own terms, availability limits, and privacy practices. Your use of their services may be subject to their applicable terms.",
    ],
  },
  {
    title: "Suspension and termination",
    paragraphs: [
      "Stop using the application when you no longer wish to be bound by these terms. Access may be restricted where reasonably necessary to address misuse, security risks, unauthorized access, or legal requirements. Workspace administrators may also change membership and role assignments within the controls available to them.",
      "Stopping use of the application does not automatically remove all workspace records, provider backups, or copies that other authorized members have already received. See the Privacy Policy for additional information about data handling and requests.",
    ],
  },
  {
    title: "Disclaimers and limitation",
    paragraphs: [
      "WorshipFlow is provided on an availability basis, without a promise that it will be uninterrupted, error-free, or suitable for every specific need. To the extent permitted by applicable law, the project maintainer is not responsible for losses arising from reliance on unavailable features, missed notifications, user errors, unauthorized content sharing, or content you did not have permission to use.",
      "Nothing in these terms excludes rights or remedies that cannot legally be excluded under applicable law.",
    ],
  },
  {
    title: "Updates and contact",
    paragraphs: [
      "These terms may change as the application evolves. The effective date at the top of the page identifies the currently published version. Continued use after updated terms are published means you accept the updated terms to the extent allowed by applicable law.",
      "For questions about these terms, contact the project maintainer through the available GitHub contact channels. Please do not include passwords, private files, or personal account details in public issues.",
    ],
  },
]

export default function TermsPage() {
  return (
    <PublicLegalPage
      title="Terms of Service"
      eyebrow="Using WorshipFlow"
      introduction="The basics for using your workspace responsibly, respecting other members, and sharing songs and service materials you have permission to use."
      sections={sections}
    />
  )
}
