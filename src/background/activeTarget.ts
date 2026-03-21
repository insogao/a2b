import type { BridgeTargetDescriptor } from "../shared/targets";

type ChoosePopupTargetInput = {
  activeTabId: number | null;
  lastTargetTabId: number | null;
  targets: Map<number, BridgeTargetDescriptor>;
};

export function choosePopupTarget({
  activeTabId,
  lastTargetTabId,
  targets
}: ChoosePopupTargetInput): BridgeTargetDescriptor | null {
  if (activeTabId !== null) {
    const activeTarget = targets.get(activeTabId);
    if (activeTarget) {
      return activeTarget;
    }
  }

  if (lastTargetTabId !== null) {
    const lastTarget = targets.get(lastTargetTabId);
    if (lastTarget) {
      return lastTarget;
    }
  }

  return targets.values().next().value ?? null;
}
