const targetChains = new Map<string, Promise<void>>();

export async function withTargetLock<T>(targetId: string, task: () => Promise<T>) {
  const previous = targetChains.get(targetId) ?? Promise.resolve();
  let releaseCurrent!: () => void;

  const current = new Promise<void>((resolve) => {
    releaseCurrent = resolve;
  });

  targetChains.set(targetId, previous.then(() => current));

  await previous;

  try {
    return await task();
  } finally {
    releaseCurrent();
    if (targetChains.get(targetId) === current) {
      targetChains.delete(targetId);
    }
  }
}
