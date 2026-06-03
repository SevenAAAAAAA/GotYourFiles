"use client";

import { useCallback, useEffect, useState } from "react";

type SiteLocale = {
  siteName: string;
  ownerName: string;
  heroTagline: string;
};

type SiteLinks = {
  email: string;
  github: string;
  linkedin: string;
};

type SiteConfig = {
  zh: SiteLocale;
  en: SiteLocale;
  links: SiteLinks;
};

type ProjectDataConfig = {
  projectsZh: unknown[];
  projectsEn: unknown[];
  directoryEntryIgnoreRules: unknown;
  site: SiteConfig;
};

type Texts = {
  loadingLabel: string;
  errorLabel: string;
  saveLabel: string;
  savingLabel: string;
  savedLabel: string;
  chineseTitle: string;
  englishTitle: string;
  linksTitle: string;
  siteNameZhLabel: string;
  siteNameEnLabel: string;
  ownerZhLabel: string;
  ownerEnLabel: string;
  heroZhLabel: string;
  heroEnLabel: string;
  emailLabel: string;
  githubLabel: string;
  linkedinLabel: string;
};

type SiteConfigEditorProps = {
  texts: Texts;
};

export default function SiteConfigEditor({ texts }: SiteConfigEditorProps) {
  const [config, setConfig] = useState<ProjectDataConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

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

  const save = useCallback(async () => {
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

  const updateZh = (patch: Partial<SiteLocale>) => {
    if (!config) return;
    setConfig({ ...config, site: { ...config.site, zh: { ...config.site.zh, ...patch } } });
  };

  const updateEn = (patch: Partial<SiteLocale>) => {
    if (!config) return;
    setConfig({ ...config, site: { ...config.site, en: { ...config.site.en, ...patch } } });
  };

  const updateLinks = (patch: Partial<SiteLinks>) => {
    if (!config) return;
    setConfig({ ...config, site: { ...config.site, links: { ...config.site.links, ...patch } } });
  };

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
        <div className="text-sm font-medium">{texts.chineseTitle} / {texts.englishTitle}</div>
        <div className="ml-auto flex items-center gap-3">
          {saved ? <span className="text-xs text-green-600">{texts.savedLabel}</span> : null}
          {error ? <span className="text-xs text-destructive">{error}</span> : null}
          <button type="button" onClick={save} disabled={saving} className="rounded-md bg-primary px-4 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {saving ? texts.savingLabel : texts.saveLabel}
          </button>
        </div>
      </div>
      <div className="space-y-6 p-4">
        <section className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium">{texts.chineseTitle}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-xs text-muted-foreground">
              {texts.siteNameZhLabel}
              <input type="text" value={config.site.zh.siteName} onChange={(e) => updateZh({ siteName: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block text-xs text-muted-foreground">
              {texts.ownerZhLabel}
              <input type="text" value={config.site.zh.ownerName} onChange={(e) => updateZh({ ownerName: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block text-xs text-muted-foreground md:col-span-2">
              {texts.heroZhLabel}
              <input type="text" value={config.site.zh.heroTagline} onChange={(e) => updateZh({ heroTagline: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
          </div>
        </section>
        <section className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium">{texts.englishTitle}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-xs text-muted-foreground">
              {texts.siteNameEnLabel}
              <input type="text" value={config.site.en.siteName} onChange={(e) => updateEn({ siteName: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block text-xs text-muted-foreground">
              {texts.ownerEnLabel}
              <input type="text" value={config.site.en.ownerName} onChange={(e) => updateEn({ ownerName: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block text-xs text-muted-foreground md:col-span-2">
              {texts.heroEnLabel}
              <input type="text" value={config.site.en.heroTagline} onChange={(e) => updateEn({ heroTagline: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
          </div>
        </section>
        <section className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium">{texts.linksTitle}</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="block text-xs text-muted-foreground">
              {texts.emailLabel}
              <input type="text" value={config.site.links.email} onChange={(e) => updateLinks({ email: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block text-xs text-muted-foreground">
              {texts.githubLabel}
              <input type="text" value={config.site.links.github} onChange={(e) => updateLinks({ github: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block text-xs text-muted-foreground">
              {texts.linkedinLabel}
              <input type="text" value={config.site.links.linkedin} onChange={(e) => updateLinks({ linkedin: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}
