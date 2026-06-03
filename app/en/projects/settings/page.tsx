import type { Metadata } from "next";
import Link from "next/link";
import ProjectsConfigEditor from "@/components/ProjectsConfigEditor";

export const metadata: Metadata = {
  title: "Project Settings",
};

export default function ProjectsSettingsPageEN() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Project Settings</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/en/projects" className="text-primary hover:underline">
            Back to Projects
          </Link>
          <Link href="/en" className="text-primary hover:underline">
            Back to Home
          </Link>
        </div>
      </div>
      <p className="mt-3 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
        Configure the project list here. Changes take effect immediately after saving.
      </p>
      <ProjectsConfigEditor
        texts={{
          loadingLabel: "Loading configuration...",
          errorLabel: "Load failed",
          saveLabel: "Save Configuration",
          savingLabel: "Saving...",
          savedLabel: "Saved",
          addProjectLabel: "Add Project",
          deleteLabel: "Delete",
          cancelLabel: "Collapse",
          confirmDeleteMessage: "Are you sure you want to delete this project?",
          tabProjects: "Projects",
          idLabel: "Project ID (unique, e.g. webox-dev)",
          titleZhLabel: "Chinese Title",
          titleEnLabel: "English Title",
          descZhLabel: "Chinese Description",
          descEnLabel: "English Description",
          tagsLabel: "Tags (press Enter to add)",
          linkLabel: "Project Path (absolute local path)",
          editLabel: "Edit",
          linkChangedHint: "Path changed. Existing download links will be invalid. Please notify users to re-download.",
        }}
      />
    </section>
  );
}
