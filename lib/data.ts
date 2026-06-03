export type Project = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  link: string;
};

export type DirectoryEntryIgnoreRules = {
  exactNames: string[];
  startsWith: string[];
};

export type SiteLocale = {
  siteName: string;
  ownerName: string;
  heroTagline: string;
};

export type SiteLinks = {
  email: string;
  github: string;
  linkedin: string;
};

export type SiteConfig = {
  zh: SiteLocale;
  en: SiteLocale;
  links: SiteLinks;
};

export type ProjectDataConfig = {
  projectsZh: Project[];
  projectsEn: Project[];
  directoryEntryIgnoreRules: DirectoryEntryIgnoreRules;
  site: SiteConfig;
};

export const defaultSiteZh: SiteLocale = {
  siteName: "个人网站",
  ownerName: "阿七",
  heroTagline: "这个 BUG 能改！从定位到修复再到验证，问题会被稳稳解决。",
};

export const defaultSiteEn: SiteLocale = {
  siteName: "Personal Website",
  ownerName: "SevenA",
  heroTagline: "This bug can be fixed—trace it, patch it, verify it, and close it cleanly.",
};

export const defaultSiteLinks: SiteLinks = {
  email: "mailto:your.email@example.com",
  github: "https://github.com/SevenAAAAAAA",
  linkedin: "https://www.linkedin.com/in/yourname",
};

export const defaultDirectoryEntryIgnoreRules: DirectoryEntryIgnoreRules = {
  exactNames: ["Thumbs.db", "desktop.ini"],
  startsWith: ["."],
};

export const projectsZh: Project[] = [];
export const projectsEn: Project[] = [];
export const directoryEntryIgnoreRules = defaultDirectoryEntryIgnoreRules;
export const siteZh = defaultSiteZh;
export const siteEn = defaultSiteEn;
export const siteLinks = defaultSiteLinks;

export function shouldIgnoreDirectoryEntry(name: string) {
  return (
    directoryEntryIgnoreRules.exactNames.includes(name) ||
    directoryEntryIgnoreRules.startsWith.some((prefix) => name.startsWith(prefix))
  );
}
