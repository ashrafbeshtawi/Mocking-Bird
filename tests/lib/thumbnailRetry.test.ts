import { ThumbnailError, isRetryableStatus, retryThumbnail } from '@/lib/publishers/thumbnailRetry';

describe('retryThumbnail', () => {
  it('stops after the first success', async () => {
    const step = jest.fn().mockRejectedValueOnce(new ThumbnailError('busy', true)).mockResolvedValue(undefined);

    await retryThumbnail(step, [0, 0, 0]);

    expect(step).toHaveBeenCalledTimes(2);
  });

  it('throws the last error once every attempt failed', async () => {
    const onRetry = jest.fn();
    const step = jest.fn().mockRejectedValue(new ThumbnailError('still busy', true));

    await expect(retryThumbnail(step, [0, 0, 0], onRetry)).rejects.toThrow('still busy');

    expect(step).toHaveBeenCalledTimes(4);
    expect(onRetry).toHaveBeenCalledTimes(3);
  });

  it('does not retry an error marked permanent', async () => {
    const step = jest.fn().mockRejectedValue(new ThumbnailError('forbidden', false));

    await expect(retryThumbnail(step, [0, 0, 0])).rejects.toThrow('forbidden');

    expect(step).toHaveBeenCalledTimes(1);
  });

  it('retries network failures', async () => {
    const step = jest.fn().mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValue(undefined);

    await retryThumbnail(step, [0]);

    expect(step).toHaveBeenCalledTimes(2);
  });

  it('waits the given delays between attempts', async () => {
    jest.useFakeTimers();
    try {
      const step = jest.fn().mockRejectedValueOnce(new ThumbnailError('busy', true)).mockResolvedValue(undefined);
      const done = retryThumbnail(step, [2_000]);

      await jest.advanceTimersByTimeAsync(1_999);
      expect(step).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(1);
      await done;
      expect(step).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('isRetryableStatus', () => {
  it.each([404, 409, 429, 500, 503])('retries HTTP %i', (status) => expect(isRetryableStatus(status)).toBe(true));
  it.each([400, 401, 403, 413])('gives up on HTTP %i', (status) => expect(isRetryableStatus(status)).toBe(false));
});
