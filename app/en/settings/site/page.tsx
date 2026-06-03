import type { Metadata } from "next";
import Link from "next/link";
import SiteConfigEditor from "@/components/SiteConfigEditor";

export const metadata: Metadata = {
  title: "Site Settings",
};

export default function SiteSettingsPageEN() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Site Settings</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/en/projects" className="text-primary hover:underline">Back to Projects</Link>
          <Link href="/en" className="text-primary hover:underline">Back Home</Link>
        </div>
      </div>
      <p className="mt-3 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
        Configure site name, owner, homepage tagline, and footer links here.
      </p>
      <SiteConfigEditor
        texts={{
          loadingLabel: "Loading configuration...",
          errorLabel: "Load failed",
          saveLabel: "Save Configuration",
          savingLabel: "Saving...",
          savedLabel: "Saved",
          chineseTitle: "Chinese Site Info",
          englishTitle: "English Site Info",
          linksTitle: "Links",
          siteNameZhLabel: "Chinese Site Name",
          siteNameEnLabel: "English Site Name",
          ownerZhLabel: "Chinese Owner",
          ownerEnLabel: "English Owner",
          heroZhLabel: "Chinese Tagline",
          heroEnLabel: "English Tagline",
          emailLabel: "Email",
          githubLabel: "GitHub",
          linkedinLabel: "LinkedIn",
        }}
      />
    </section>
  );
}
