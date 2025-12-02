// src/utils/retry.test.ts
import { describe, it, expect, vi } from "vitest";
import { withRetry } from "./retry";

describe("withRetry", () => {
  it("should return result on first successful attempt", async () => {
    const fn = vi.fn().mockResolvedValue("success");

    const result = await withRetry(fn);

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should retry on failure and succeed", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce("success");

    const result = await withRetry(fn, {
      shouldRetry: () => true,
      baseDelay: 0, // No delay in tests
      maxRetries: 3,
    });

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("should throw after max retries exceeded", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always fails"));

    await expect(
      withRetry(fn, {
        maxRetries: 2,
        shouldRetry: () => true,
        baseDelay: 0,
      })
    ).rejects.toThrow("always fails");

    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it("should not retry when shouldRetry returns false", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("non-retryable"));

    await expect(
      withRetry(fn, {
        shouldRetry: () => false,
      })
    ).rejects.toThrow("non-retryable");

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should call onRetry callback", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce("success");
    const onRetry = vi.fn();

    await withRetry(fn, {
      shouldRetry: () => true,
      onRetry,
      baseDelay: 0,
    });

    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
  });
});
