type RuntimeStartupHandlerOptions = {
  isBrowserAccessEnabled: () => boolean;
  ensureBridgeConnection: () => Promise<void>;
  syncCurrentWindowTargets: () => Promise<unknown>;
};

export function createRuntimeStartupHandler(
  options: RuntimeStartupHandlerOptions
) {
  return async function handleRuntimeStartup() {
    if (!options.isBrowserAccessEnabled()) {
      return;
    }

    await options.ensureBridgeConnection();
    await options.syncCurrentWindowTargets();
  };
}
