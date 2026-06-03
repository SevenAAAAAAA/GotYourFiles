"use client";

import { useCallback, useEffect, useState } from "react";

type ProjectEntry = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  link: string;
};

type ProjectDataConfig = {
  projectsZh: ProjectEntry[];
  projectsEn: ProjectEntry[];
  directoryEntryIgnoreRules: unknown;
  site: unknown;
};

type Texts = {
  loadingLabel: string;
  errorLabel: string;
  saveLabel: string;
  savingLabel: string;
  savedLabel: string;
  addProjectLabel: string;
  deleteLabel: string;
  cancelLabel: string;
  confirmDeleteMessage: string;
  tabProjects: string;
  idLabel: string;
  titleZhLabel: string;
  titleEnLabel: string;
  descZhLabel: string;
  descEnLabel: string;
  tagsLabel: string;
  linkLabel: string;
  editLabel: string;
  linkChangedHint: string;
};

type ProjectsConfigEditorProps = {
  texts: Texts;
};

const emptyProject = (): ProjectEntry => ({
  id: "",
  title: "",
  description: "",
  tags: [],
  link: "",
});

export default function ProjectsConfigEditor({ texts }: ProjectsConfigEditorProps) {
  const [config, setConfig] = useState<ProjectDataConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/projects/config");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      setConfig((await res.json()) as ProjectDataConfig);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = useCallback(async () => {
    if (!config || saving) return;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/projects/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }, [config, saving]);

  const updateProjectZh = useCallback(
    (index: number, patch: Partial<ProjectEntry>) => {
      if (!config) return;
      const zh = [...config.projectsZh];
      const oldId = zh[index].id;
      zh[index] = { ...zh[index], ...patch };
      const en = patch.id && patch.id !== oldId
        ? config.projectsEn.map((p) => (p.id === oldId ? { ...p, id: patch.id! } : p))
        : config.projectsEn;
      setConfig({ ...config, projectsZh: zh, projectsEn: en });
    },
    [config],
  );

  const updateProjectEn = useCallback(
    (index: number, patch: Partial<ProjectEntry>) => {
      if (!config || index < 0) return;
      const en = [...config.projectsEn];
      en[index] = { ...en[index], ...patch };
      setConfig({ ...config, projectsEn: en });
    },
    [config],
  );

  const addProject = useCallback(() => {
    if (!config) return;
    const zhProject = emptyProject();
    const enProject = emptyProject();
    setConfig({
      ...config,
      projectsZh: [...config.projectsZh, zhProject],
      projectsEn: [...config.projectsEn, enProject],
    });
    setEditingProjectId("");
  }, [config]);

  const deleteProject = useCallback(
    (projectId: string) => {
      if (!config) return;
      if (!window.confirm(texts.confirmDeleteMessage)) return;
      setConfig({
        ...config,
        projectsZh: config.projectsZh.filter((p) => p.id !== projectId),
        projectsEn: config.projectsEn.filter((p) => p.id !== projectId),
      });
    },
    [config, texts.confirmDeleteMessage],
  );

  if (loading) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground">{texts.loadingLabel}</p>;
  }

  if (error && !config) {
    return <p className="px-4 py-8 text-center text-sm text-destructive">{texts.errorLabel}: {error}</p>;
  }

  if (!config) return null;

  return (
    <div className="mt-6 rounded-lg border bg-card">
      <div className="flex items-center border-b px-4 py-3">
        <div className="text-sm font-medium">{texts.tabProjects}</div>
        <div className="ml-auto flex items-center gap-3">
          {saved ? <span className="text-xs text-green-600">{texts.savedLabel}</span> : null}
          {error ? <span className="text-xs text-destructive">{error}</span> : null}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? texts.savingLabel : texts.saveLabel}
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {config.projectsZh.length} {texts.tabProjects}
          </span>
          <button
            type="button"
            onClick={addProject}
            className="rounded-md border bg-background px-3 py-1.5 text-xs hover:bg-accent"
          >
            {texts.addProjectLabel}
          </button>
        </div>

        {config.projectsZh.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{texts.addProjectLabel}</p>
        ) : (
          <div className="space-y-4">
            {config.projectsZh.map((project, index) => {
              const enIndex = config.projectsEn.findIndex((p) => p.id === project.id);
              const enProject = enIndex >= 0 ? config.projectsEn[enIndex] : undefined;
              const isEditing = editingProjectId === project.id || (editingProjectId === "" && index === config.projectsZh.length - 1);
              const tagKey = project.id || `new-${index}`;
              const tagInput = tagInputs[tagKey] ?? "";

              return (
                <div key={tagKey} className={`rounded-lg border p-4 ${isEditing ? "border-primary" : ""}`}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={project.id}
                          onChange={(e) => updateProjectZh(index, { id: e.target.value })}
                          placeholder={texts.idLabel}
                          className="w-40 rounded-md border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      ) : (
                        <button
                          type="button"
                          className="text-left text-sm font-medium hover:text-primary"
                          onClick={() => setEditingProjectId(project.id)}
                        >
                          {project.id || "(new)"}
                        </button>
                      )}
                      {project.link ? <span className="truncate text-xs text-muted-foreground">{project.link}</span> : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {isEditing ? (
                        <button type="button" onClick={() => setEditingProjectId(null)} className="rounded-md border bg-background px-2 py-1 text-xs hover:bg-accent">
                          {texts.cancelLabel}
                        </button>
                      ) : (
                        <button type="button" onClick={() => setEditingProjectId(project.id)} className="rounded-md border bg-background px-2 py-1 text-xs hover:bg-accent">
                          {texts.editLabel}
                        </button>
                      )}
                      <button type="button" onClick={() => deleteProject(project.id)} className="rounded-md border border-destructive/30 bg-background px-2 py-1 text-xs text-destructive hover:bg-destructive/10">
                        {texts.deleteLabel}
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block text-xs text-muted-foreground">
                        {texts.titleZhLabel}
                        <input type="text" value={project.title} onChange={(e) => updateProjectZh(index, { title: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                      </label>
                      <label className="block text-xs text-muted-foreground">
                        {texts.titleEnLabel}
                        <input type="text" value={enProject?.title ?? ""} onChange={(e) => updateProjectEn(enIndex, { title: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                      </label>
                      <label className="block text-xs text-muted-foreground">
                        {texts.descZhLabel}
                        <input type="text" value={project.description} onChange={(e) => updateProjectZh(index, { description: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                      </label>
                      <label className="block text-xs text-muted-foreground">
                        {texts.descEnLabel}
                        <input type="text" value={enProject?.description ?? ""} onChange={(e) => updateProjectEn(enIndex, { description: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                      </label>
                      <div className="md:col-span-2">
                        <label className="block text-xs text-muted-foreground mb-1">{texts.tagsLabel}</label>
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInputs((prev) => ({ ...prev, [tagKey]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && tagInput.trim()) {
                              updateProjectZh(index, { tags: [...project.tags, tagInput.trim()] });
                              setTagInputs((prev) => ({ ...prev, [tagKey]: "" }));
                              e.preventDefault();
                            }
                          }}
                          placeholder={texts.tagsLabel}
                          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        {project.tags.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {project.tags.map((tag, ti) => (
                              <span key={`${tag}-${ti}`} className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                                {tag}
                                <button type="button" onClick={() => updateProjectZh(index, { tags: project.tags.filter((_, i) => i !== ti) })} className="hover:text-destructive">
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <label className="block text-xs text-muted-foreground md:col-span-2">
                        {texts.linkLabel}
                        <input type="text" value={project.link} onChange={(e) => updateProjectZh(index, { link: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 font-mono text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                        {project.link && !project.link.startsWith("/") ? <span className="mt-1 block text-xs text-muted-foreground">{texts.linkChangedHint}</span> : null}
                      </label>
                    </div>
                  ) : (
                    <div className="grid gap-1 text-sm">
                      <div className="flex gap-4">
                        <span className="text-muted-foreground">ZH:</span>
                        <span>{project.title}</span>
                        <span className="text-xs text-muted-foreground">{project.description}</span>
                      </div>
                      <div className="flex gap-4">
                        <span className="text-muted-foreground">EN:</span>
                        <span>{enProject?.title ?? "-"}</span>
                        <span className="text-xs text-muted-foreground">{enProject?.description ?? "-"}</span>
                      </div>
                      {project.tags.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {project.tags.map((tag, ti) => (
                            <span key={`${tag}-${ti}`} className="rounded-md border bg-muted px-2 py-0.5 text-xs text-muted-foreground">{tag}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
