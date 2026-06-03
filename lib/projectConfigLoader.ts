import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";

const PROJECT_ROOT = process.cwd();
const LOCAL_CONFIG_PATH = path.join(PROJECT_ROOT, "lib", "projects.config.json");
const EXAMPLE_CONFIG_PATH = path.join(PROJECT_ROOT, "lib", "projects.config.example.json");

export type ProjectEntry = {
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
  projectsZh: ProjectEntry[];
  projectsEn: ProjectEntry[];
  directoryEntryIgnoreRules: DirectoryEntryIgnoreRules;
  site: SiteConfig;
};

function ensureLocalConfig(): void {
  if (existsSync(LOCAL_CONFIG_PATH)) {
    return;
  }
  if (existsSync(EXAMPLE_CONFIG_PATH)) {
    copyFileSync(EXAMPLE_CONFIG_PATH, LOCAL_CONFIG_PATH);
  } else {
    const defaultConfig: ProjectDataConfig = {
      projectsZh: [],
      projectsEn: [],
      directoryEntryIgnoreRules: {
        exactNames: ["Thumbs.db", "desktop.ini"],
        startsWith: ["."],
      },
      site: {
        zh: {
          siteName: "个人网站",
          ownerName: "阿七",
          heroTagline: "这个 BUG 能改！从定位到修复再到验证，问题会被稳稳解决。",
        },
        en: {
          siteName: "Personal Website",
          ownerName: "SevenA",
          heroTagline: "This bug can be fixed—trace it, patch it, verify it, and close it cleanly.",
        },
        links: {
          email: "mailto:your.email@example.com",
          github: "https://github.com/SevenAAAAAAA",
          linkedin: "https://www.linkedin.com/in/yourname",
        },
      },
    };
    writeFileSync(LOCAL_CONFIG_PATH, JSON.stringify(defaultConfig, null, 2), "utf8");
  }
}

function loadConfigFromDisk(): ProjectDataConfig {
  const raw = readFileSync(LOCAL_CONFIG_PATH, "utf8");
  return JSON.parse(raw) as ProjectDataConfig;
}

export function getProjectConfig(): ProjectDataConfig {
  ensureLocalConfig();
  return loadConfigFromDisk();
}

export function setProjectConfig(config: ProjectDataConfig): void {
  writeFileSync(LOCAL_CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}

export function reloadConfig(): ProjectDataConfig {
  ensureLocalConfig();
  return loadConfigFromDisk();
}
