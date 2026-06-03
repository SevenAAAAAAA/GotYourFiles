export type LanMessage = {
  id: string;
  ts: number;
  method: "GET" | "POST";
  msg: string;
  from: string;
};

type LanStoreEvent =
  | { type: "message"; message: LanMessage }
  | { type: "clear" };

const MAX = 100;
type LanStoreState = {
  seq: number;
  inbox: LanMessage[];
  listeners: Set<(event: LanStoreEvent) => void>;
  autoDownloadedIds: Map<string, string>;
  autoDownloadTimestamps: Map<string, number>;
};

declare global {
  var __gotYourFilesLanStore__: LanStoreState | undefined;
}

const store: LanStoreState = globalThis.__gotYourFilesLanStore__ ?? {
  seq: 0,
  inbox: [],
  listeners: new Set<(event: LanStoreEvent) => void>(),
  autoDownloadedIds: new Map<string, string>(),
  autoDownloadTimestamps: new Map<string, number>(),
};

globalThis.__gotYourFilesLanStore__ = store;

export function addMessage(method: "GET" | "POST", msg: string, from: string) {
  const ts = Date.now();
  const id = `${ts}-${store.seq++}`;
  const message = { id, ts, method, msg, from };
  store.inbox.push(message);
  if (store.inbox.length > MAX) {
    store.inbox.splice(0, store.inbox.length - MAX);
  }
  store.listeners.forEach((listener) => listener({ type: "message", message }));
}

export function listMessages() {
  return [...store.inbox].sort((a, b) => a.ts - b.ts);
}

export function clearMessages() {
  store.inbox.splice(0, store.inbox.length);
  store.autoDownloadedIds.clear();
  store.listeners.forEach((listener) => listener({ type: "clear" }));
}

export function tryReserveAutoDownload(messageId: string, clientId?: string) {
  if (store.autoDownloadedIds.has(messageId)) {
    return { reserved: false, reservedBy: store.autoDownloadedIds.get(messageId) || "unknown" };
  }
  store.autoDownloadedIds.set(messageId, clientId || "unknown");
  store.autoDownloadTimestamps.set(messageId, Date.now());
  return { reserved: true, reservedBy: clientId || "unknown" };
}

export function getAutoDownloadedIds() {
  return [...store.autoDownloadedIds.keys()];
}

export function subscribeLanEvents(listener: (event: LanStoreEvent) => void) {
  store.listeners.add(listener);
  return () => {
    store.listeners.delete(listener);
  };
}
