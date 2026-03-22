import type { BridgeTargetDescriptor } from "../shared/targets";

type RefreshTargets = () => Promise<BridgeTargetDescriptor[]>;

export async function resolveTargetById(
  targetId: string,
  targets: Map<number, BridgeTargetDescriptor>,
  refreshTargets: RefreshTargets
) {
  const knownTarget = findTargetById(targetId, targets);
  if (knownTarget) {
    return knownTarget;
  }

  const refreshedTargets = await refreshTargets();
  return refreshedTargets.find((target) => target.targetId === targetId) ?? null;
}

function findTargetById(
  targetId: string,
  targets: Map<number, BridgeTargetDescriptor>
) {
  return Array.from(targets.values()).find((target) => target.targetId === targetId);
}
