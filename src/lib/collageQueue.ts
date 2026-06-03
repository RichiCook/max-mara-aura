/**
 * Global concurrency-limited queue for collage image generation.
 * Caps in-flight `generate-look-collage` calls to avoid AI gateway rate limits.
 */
function createConcurrencyQueue(limit: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  const next = () => {
    if (active >= limit || queue.length === 0) return;
    active++;
    const run = queue.shift()!;
    run();
  };
  return function enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      queue.push(() => {
        task().then(resolve, reject).finally(() => {
          active--;
          next();
        });
      });
      next();
    });
  };
}

export const collageQueue = createConcurrencyQueue(2);
