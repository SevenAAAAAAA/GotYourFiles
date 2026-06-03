import "server-only";
import {
  defaultDirectoryEntryIgnoreRules,
  defaultSiteEn,
  defaultSiteLinks,
  defaultSiteZh,
  type DirectoryEntryIgnoreRules,
  type Project,
  type SiteLinks,
  type SiteLocale,
} from "@/lib/data";
import { getProjectConfig } from "@/lib/projectConfigLoader";

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
    return defaultDirectoryEntryIgnoreRules;
  }
  const obj = input as Record<string, unknown>;
  const exactNames = toStringArray(obj.exactNames);
  const startsWith = toStringArray(obj.startsWith);
  return {
    exactNames: exactNames.length > 0 ? exactNames : defaultDirectoryEntryIgnoreRules.exactNames,
    startsWith: startsWith.length > 0 ? startsWith : defaultDirectoryEntryIgnoreRules.startsWith,
  };
}

function toSiteLocale(input: unknown, fallback: SiteLocale): SiteLocale {
  if (!input || typeof input !== "object") {
    return fallback;
  }
  const obj = input as Record<string, unknown>;
  return {
    siteName: typeof obj.siteName === "string" && obj.siteName ? obj.siteName : fallback.siteName,
    ownerName: typeof obj.ownerName === "string" && obj.ownerName ? obj.ownerName : fallback.ownerName,
    heroTagline: typeof obj.heroTagline === "string" && obj.heroTagline ? obj.heroTagline : fallback.heroTagline,
  };
}

function toSiteLinks(input: unknown): SiteLinks {
  if (!input || typeof input !== "object") {
    return defaultSiteLinks;
  }
  const obj = input as Record<string, unknown>;
  return {
    email: typeof obj.email === "string" && obj.email ? obj.email : defaultSiteLinks.email,
    github: typeof obj.github === "string" && obj.github ? obj.github : defaultSiteLinks.github,
    linkedin: typeof obj.linkedin === "string" && obj.linkedin ? obj.linkedin : defaultSiteLinks.linkedin,
  };
}

function getConfig() {
  return getProjectConfig();
}

export function getProjectsZh(): Project[] {
  return toProjectList(getConfig().projectsZh);
}

export function getProjectsEn(): Project[] {
  return toProjectList(getConfig().projectsEn);
}

export function getDirectoryEntryIgnoreRules(): DirectoryEntryIgnoreRules {
  return toIgnoreRules(getConfig().directoryEntryIgnoreRules);
}

export function shouldIgnoreDirectoryEntry(name: string) {
  const rules = getDirectoryEntryIgnoreRules();
  return rules.exactNames.includes(name) || rules.startsWith.some((prefix) => name.startsWith(prefix));
}

export function getSiteZh(): SiteLocale {
  return toSiteLocale(getConfig().site?.zh, defaultSiteZh);
}

export function getSiteEn(): SiteLocale {
  return toSiteLocale(getConfig().site?.en, defaultSiteEn);
}

export function getSiteLinks(): SiteLinks {
  return toSiteLinks(getConfig().site?.links);
}
