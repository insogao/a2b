export const BRIDGE_COMMANDS = [
  "ping",
  "hello",
  "helloAck",
  "target.register",
  "target.unregister",
  "target.list",
  "target.list.result",
  "tab.list",
  "tab.list.result",
  "tab.create",
  "tab.create.result",
  "tab.activate",
  "tab.activate.result",
  "tab.goto",
  "tab.goto.result",
  "tab.reload",
  "tab.reload.result",
  "tab.back",
  "tab.back.result",
  "tab.forward",
  "tab.forward.result",
  "tab.close",
  "tab.close.result",
  "operation.eval",
  "operation.click",
  "operation.type",
  "operation.press",
  "operation.waitFor",
  "operation.result",
  "page.screenshot",
  "page.screenshot.result",
  "script.run",
  "script.run.result",
  "cookies.get",
  "cookies.result",
  "recording.start",
  "recording.stop",
  "recording.get",
  "recording.clear",
  "recording.result",
  "debugger.attach",
  "debugger.detach",
  "debugger.result",
  "error"
] as const;

export type BridgeCommand = (typeof BRIDGE_COMMANDS)[number];

export type BridgeEnvelope<T = Record<string, unknown>> = {
  type: BridgeCommand;
  requestId?: string;
  payload: T;
};

export function isBridgeCommand(value: unknown): value is BridgeCommand {
  return (
    typeof value === "string" &&
    BRIDGE_COMMANDS.includes(value as BridgeCommand)
  );
}

export function isBridgeEnvelope(value: unknown): value is BridgeEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    isBridgeCommand(value.type) &&
    "payload" in value
  );
}
