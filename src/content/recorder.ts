import type { RecordingEntry } from "../shared/recording";

export function getEventElement(event: Event): HTMLElement | null {
  if (event.target instanceof HTMLElement) {
    return event.target;
  }

  const path = typeof event.composedPath === "function" ? event.composedPath() : [];
  for (const item of path) {
    if (item instanceof HTMLElement) {
      return item;
    }
  }

  return null;
}

export function normalizeClickEntry(input: {
  selector: string;
  text?: string;
  url: string;
}): RecordingEntry {
  return {
    kind: "click",
    selector: input.selector,
    text: input.text,
    url: input.url
  };
}

export function normalizeInputEntry(input: {
  selector: string;
  value: string;
  url: string;
}): RecordingEntry {
  return {
    kind: "input",
    selector: input.selector,
    value: input.value,
    url: input.url
  };
}

export function createNavigationEntry(input: {
  title: string;
  url: string;
}): RecordingEntry {
  return {
    kind: "navigation",
    title: input.title,
    url: input.url
  };
}
