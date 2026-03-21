export const BRIDGE_COMMANDS = [
  "hello",
  "helloAck",
  "target.register",
  "target.unregister",
  "target.list",
  "target.list.result",
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
