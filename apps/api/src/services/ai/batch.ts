export function chunk<T>(items: T[], size: number): T[][] {
  const safeSize = Math.max(1, size);
  const batches: T[][] = [];

  for (let index = 0; index < items.length; index += safeSize) {
    batches.push(items.slice(index, index + safeSize));
  }

  return batches;
}

export async function retry<T>(
  attempts: number,
  operation: () => Promise<T>,
  onError: (error: unknown) => Error
): Promise<T> {
  let lastError: Error | undefined;
  const safeAttempts = Math.max(1, attempts);

  for (let attempt = 1; attempt <= safeAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = onError(error);
    }
  }

  throw lastError ?? new Error("Operation failed after retry.");
}
