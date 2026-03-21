import {
  getEventElement,
  createNavigationEntry,
  normalizeClickEntry,
  normalizeInputEntry
} from "./recorder";

type ElementWithValue = HTMLElement & {
  value?: string;
  name?: string;
};

if (!(window as Window & { __currentBrowserBridgeMounted?: boolean })
  .__currentBrowserBridgeMounted) {
  (window as Window & { __currentBrowserBridgeMounted?: boolean })
    .__currentBrowserBridgeMounted = true;

  window.addEventListener(
    "click",
    (event) => {
      const target = getEventElement(event);
      if (!target) {
        return;
      }
      void sendEvent(
        normalizeClickEntry({
          selector: getElementSelector(target),
          text: target.innerText?.trim() || target.textContent?.trim() || undefined,
          url: window.location.href
        })
      );
    },
    true
  );

  window.addEventListener(
    "input",
    (event) => {
      const target = getEventElement(event);
      if (!target) {
        return;
      }
      const input = target as ElementWithValue;
      if (typeof input.value !== "string") {
        return;
      }
      void sendEvent(
        normalizeInputEntry({
          selector: getElementSelector(target),
          value: input.value,
          url: window.location.href
        })
      );
    },
    true
  );

  window.addEventListener(
    "change",
    (event) => {
      const target = getEventElement(event);
      if (!target) {
        return;
      }
      const input = target as ElementWithValue;
      if (typeof input.value !== "string") {
        return;
      }
      void sendEvent(
        normalizeInputEntry({
          selector: getElementSelector(target),
          value: input.value,
          url: window.location.href
        })
      );
    },
    true
  );

  void sendEvent(
    createNavigationEntry({
      title: document.title,
      url: window.location.href
    })
  );
}

async function sendEvent(payload: unknown) {
  try {
    await chrome.runtime.sendMessage({
      type: "content.recordEvent",
      payload
    });
  } catch (error) {
    console.debug("Current Browser Bridge failed to send event", error);
  }
}

function getElementSelector(element: HTMLElement): string {
  if (element.id) {
    return `#${element.id}`;
  }
  const name = element.getAttribute("name");
  if (name) {
    return `${element.tagName.toLowerCase()}[name="${name}"]`;
  }
  const testId = element.getAttribute("data-testid");
  if (testId) {
    return `[data-testid="${testId}"]`;
  }
  const className = element.className
    .split(" ")
    .map((item) => item.trim())
    .find(Boolean);
  if (className) {
    return `${element.tagName.toLowerCase()}.${className}`;
  }
  return element.tagName.toLowerCase();
}
