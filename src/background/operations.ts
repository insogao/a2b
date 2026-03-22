type ExecuteScriptResult = Array<{ result: unknown }>;

type ExecuteScriptOptions = {
  target: { tabId: number };
  world?: chrome.scripting.ExecutionWorld;
  args?: unknown[];
  func: (...args: unknown[]) => unknown;
};

type OperationDependencies = {
  executeScript: (options: ExecuteScriptOptions) => Promise<ExecuteScriptResult>;
};

type ScreenshotDependencies = {
  attachDebugger: (tabId: number) => Promise<boolean>;
  sendDebuggerCommand: (
    tabId: number,
    method: string,
    params?: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;
  detachDebugger: (tabId: number) => Promise<void>;
};

export async function runEvalOperation(
  input: { tabId: number; expression: string },
  dependencies: OperationDependencies
) {
  const results = await dependencies.executeScript({
    target: { tabId: input.tabId },
    world: "MAIN",
    args: [input.expression],
    func: evaluateExpressionInPage
  });

  const result = readFirstResult(results);
  if (
    typeof result === "object" &&
    result !== null &&
    "ok" in result
  ) {
    return result;
  }

  return {
    ok: true,
    value: result
  };
}

export async function runSelectorOperation(
  input: {
    tabId: number;
    kind: "click" | "type" | "press";
    selector: string;
    value?: string;
  },
  dependencies: OperationDependencies
) {
  const results = await dependencies.executeScript({
    target: { tabId: input.tabId },
    world: "MAIN",
    args: [input.kind, input.selector, input.value ?? null],
    func: runSelectorOperationInPage
  });

  return readFirstResult(results);
}

export async function waitForSelector(
  input: { tabId: number; selector: string; timeoutMs: number },
  dependencies: OperationDependencies
) {
  const results = await dependencies.executeScript({
    target: { tabId: input.tabId },
    world: "MAIN",
    args: [input.selector, input.timeoutMs],
    func: waitForSelectorInPage
  });

  return readFirstResult(results);
}

export async function captureScreenshot(
  input: { tabId: number },
  dependencies: ScreenshotDependencies
) {
  const attachedByCall = await dependencies.attachDebugger(input.tabId);

  try {
    const payload = await dependencies.sendDebuggerCommand(
      input.tabId,
      "Page.captureScreenshot",
      { format: "png" }
    );

    return {
      ok: true,
      format: typeof payload.format === "string" ? payload.format : "png",
      data: typeof payload.data === "string" ? payload.data : ""
    };
  } finally {
    if (attachedByCall) {
      await dependencies.detachDebugger(input.tabId);
    }
  }
}

export async function runScriptOperation(
  input: { tabId: number; source: string },
  dependencies: OperationDependencies
) {
  const results = await dependencies.executeScript({
    target: { tabId: input.tabId },
    world: "MAIN",
    args: [input.source],
    func: runScriptSourceInPage
  });

  return readFirstResult(results);
}

function readFirstResult(results: ExecuteScriptResult) {
  return (results[0]?.result ?? { ok: false, error: "No result returned" }) as Record<
    string,
    unknown
  >;
}

function evaluateExpressionInPage(expression: string) {
  try {
    const value = (0, eval)(expression);

    try {
      return {
        ok: true,
        value: JSON.parse(JSON.stringify(value))
      };
    } catch {
      return {
        ok: true,
        value: value == null ? value : String(value)
      };
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function runSelectorOperationInPage(
  kind: "click" | "type" | "press",
  selector: string,
  value?: string | null
) {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLElement)) {
    return {
      ok: false,
      error: `Selector not found: ${selector}`
    };
  }

  if (kind === "click") {
    element.focus();
    element.dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        view: window
      })
    );
    element.dispatchEvent(
      new MouseEvent("mouseup", {
        bubbles: true,
        cancelable: true,
        view: window
      })
    );
    element.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window
      })
    );
    return { ok: true, selector };
  }

  if (kind === "type") {
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    ) {
      element.focus();
      element.value = value ?? "";
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return { ok: true, selector, value: element.value };
    }

    if (element.isContentEditable) {
      element.focus();
      element.textContent = value ?? "";
      element.dispatchEvent(new InputEvent("input", { bubbles: true, data: value ?? "" }));
      return { ok: true, selector, value: element.textContent ?? "" };
    }

    return {
      ok: false,
      error: `Element is not typeable: ${selector}`
    };
  }

  element.focus();
  const key = value ?? "Enter";
  element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  element.dispatchEvent(new KeyboardEvent("keypress", { key, bubbles: true }));
  element.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));
  return { ok: true, selector, key };
}

async function waitForSelectorInPage(selector: string, timeoutMs: number) {
  const startedAt = Date.now();

  while (Date.now() - startedAt <= timeoutMs) {
    const element = document.querySelector(selector);
    if (element) {
      return {
        ok: true,
        selector
      };
    }

    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }

  return {
    ok: false,
    error: `Timed out waiting for ${selector}`
  };
}

function runScriptSourceInPage(source: string) {
  try {
    const runner = new Function(source);
    const value = runner();
    try {
      return {
        ok: true,
        value: JSON.parse(JSON.stringify(value))
      };
    } catch {
      return {
        ok: true,
        value: value == null ? value : String(value)
      };
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
