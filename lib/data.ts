import configData from "@/lib/projects.config.json";

export type Project = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  link: string;
};

type DirectoryEntryIgnoreRules = {
  exactNames: string[];
  startsWith: string[];
};

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
  projectsZh: Project[];
  projectsEn: Project[];
  directoryEntryIgnoreRules: DirectoryEntryIgnoreRules;
  site?: unknown;
};

const projectData = configData as ProjectDataConfig;

function toStringArray(input: unknown) {
  return Array.isArray(input) ? input.filter((item): item is string => typeof item === "string") : [];
}

function toProjectList(input: unknown): Project[] {
  if (!Array.isArray(input)) {
    return [];
  }
  return input
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : "",
      title: typeof item.title === "string" ? item.title : "",
      description: typeof item.description === "string" ? item.description : "",
      tags: toStringArray(item.tags),
      link: typeof item.link === "string" ? item.link : "",
    }))
    .filter((item) => item.id && item.title && item.link);
}

function toIgnoreRules(input: unknown): DirectoryEntryIgnoreRules {
  if (!input || typeof input !== "object") {
    return { exactNames: ["Thumbs.db", "desktop.ini"], startsWith: ["."] };
  }
  const obj = input as Record<string, unknown>;
  const exactNames = toStringArray(obj.exactNames);
  const startsWith = toStringArray(obj.startsWith);
  return {
    exactNames: exactNames.length > 0 ? exactNames : ["Thumbs.db", "desktop.ini"],
    startsWith: startsWith.length > 0 ? startsWith : ["."],
  };
}

function toSiteLocale(
  input: unknown,
  fallbackSiteName: string,
  fallbackOwnerName: string,
  fallbackHeroTagline: string
): SiteLocale {
  if (!input || typeof input !== "object") {
    return { siteName: fallbackSiteName, ownerName: fallbackOwnerName, heroTagline: fallbackHeroTagline };
  }
  const obj = input as Record<string, unknown>;
  const siteName = typeof obj.siteName === "string" && obj.siteName ? obj.siteName : fallbackSiteName;
  const ownerName = typeof obj.ownerName === "string" && obj.ownerName ? obj.ownerName : fallbackOwnerName;
  const heroTagline =
    typeof obj.heroTagline === "string" && obj.heroTagline ? obj.heroTagline : fallbackHeroTagline;
  return { siteName, ownerName, heroTagline };
}

function toSiteLinks(input: unknown): SiteLinks {
  if (!input || typeof input !== "object") {
    return {
      email: "mailto:your.email@example.com",
      github: "https://github.com/SevenAAAAAAA",
      linkedin: "https://www.linkedin.com/in/yourname",
    };
  }
  const obj = input as Record<string, unknown>;
  const email = typeof obj.email === "string" && obj.email ? obj.email : "mailto:your.email@example.com";
  const github = typeof obj.github === "string" && obj.github ? obj.github : "https://github.com/SevenAAAAAAA";
  const linkedin =
    typeof obj.linkedin === "string" && obj.linkedin ? obj.linkedin : "https://www.linkedin.com/in/yourname";
  return { email, github, linkedin };
}

export const projectsZh: Project[] = toProjectList(projectData.projectsZh);
export const projectsEn: Project[] = toProjectList(projectData.projectsEn);
export const directoryEntryIgnoreRules = toIgnoreRules(projectData.directoryEntryIgnoreRules);

export function shouldIgnoreDirectoryEntry(name: string) {
  return (
    directoryEntryIgnoreRules.exactNames.includes(name) ||
    directoryEntryIgnoreRules.startsWith.some((prefix) => name.startsWith(prefix))
  );
}

const siteObj = (projectData.site ?? {}) as Partial<SiteConfig> | unknown;
const siteAsObj = (siteObj && typeof siteObj === "object" ? (siteObj as Record<string, unknown>) : {}) as Record<
  string,
  unknown
>;

export const siteZh: SiteLocale = toSiteLocale(
  siteAsObj.zh,
  "个人网站",
  "阿七",
  "这个 BUG 能改！从定位到修复再到验证，问题会被稳稳解决。"
);
export const siteEn: SiteLocale = toSiteLocale(
  siteAsObj.en,
  "Personal Website",
  "SevenA",
  "This bug can be fixed—trace it, patch it, verify it, and close it cleanly."
);
export const siteLinks: SiteLinks = toSiteLinks(siteAsObj.links);
