export function resolveTargetSelector(input, targets) {
  const needle = String(input ?? "").trim();
  if (!needle) {
    return { ok: false, reason: "not_found" };
  }

  const exact = targets.find((target) => target.targetId === needle);
  if (exact) {
    return { ok: true, targetId: exact.targetId };
  }

  const lower = needle.toLowerCase();
  const matches = targets
    .map((target) => target.targetId)
    .filter((targetId) => targetId.toLowerCase().startsWith(lower));

  if (matches.length === 1) {
    return { ok: true, targetId: matches[0] };
  }

  if (matches.length === 0) {
    return { ok: false, reason: "not_found" };
  }

  return { ok: false, reason: "ambiguous", matches };
}
