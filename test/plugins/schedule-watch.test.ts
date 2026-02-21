// @vitest-environment node
/**
 * test/plugins/schedule-watch.test.ts
 *
 * Tests for the schedule:watch handler.
 * Mocks global fetch so no real mirror-node calls are made.
 * Uses fake timers to drive sleep() inside the polling loop.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

import { watchSchedule } from "@/plugins/schedule/commands/watch/handler";
import type { WatchOutput } from "@/plugins/schedule/commands/watch/output";
import { Status } from "@/core/shared/constants";

// ── Helpers ────────────────────────────────────────────────────────────────

const MIRROR  = "https://testnet.mirrornode.hedera.com";
const NETWORK = "testnet";

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

/**
 * Build a `CommandHandlerArgs`-compatible object for watchSchedule.
 * timeout and poll-interval must be >= 1 (schema validation).
 */
function makeArgs(
  scheduleId = "0.0.12345",
  overrides: { timeout?: number; "poll-interval"?: number } = {},
) {
  return {
    args: {
      "schedule-id": scheduleId,
      timeout: overrides.timeout ?? 300,
      "poll-interval": overrides["poll-interval"] ?? 1,
    },
    api: {
      network: {
        getCurrentNetwork: vi.fn().mockReturnValue(NETWORK),
        getCurrentOperatorOrThrow: vi.fn(),
        getNetworkConfig: vi.fn().mockReturnValue({ mirrorNodeUrl: MIRROR }),
      },
      txExecution: { signAndExecute: vi.fn() },
    },
    logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
    state: {},
    config: {},
  };
}

function fetchOk(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(body),
  });
}

function fetch404() {
  mockFetch.mockResolvedValueOnce({ ok: false, status: 404, json: vi.fn() });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("schedule watch — watchSchedule()", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("returns Success / EXECUTED when mirror shows executed_timestamp", async () => {
    // Handler resolves on first poll — no sleep needed
    fetchOk({ executed_timestamp: "1700000050.000000000", deleted: false });

    const result = await watchSchedule(makeArgs() as Parameters<typeof watchSchedule>[0]);

    expect(result.status).toBe(Status.Success);
    const out: WatchOutput = JSON.parse(result.outputJson!);
    expect(out.finalState).toBe("EXECUTED");
    expect(out.scheduleId).toBe("0.0.12345");
    expect(out.network).toBe(NETWORK);
  });

  it("returns Success / DELETED when mirror shows deleted: true", async () => {
    fetchOk({ executed_timestamp: null, deleted: true });

    const result = await watchSchedule(makeArgs() as Parameters<typeof watchSchedule>[0]);

    expect(result.status).toBe(Status.Success);
    const out: WatchOutput = JSON.parse(result.outputJson!);
    expect(out.finalState).toBe("DELETED");
  });

  it("returns Success / TIMEOUT after expiry (fake timers)", async () => {
    // first poll returns PENDING; then sleep(1000ms); then timeout fires
    fetchOk({ executed_timestamp: null, deleted: false });

    // timeout:1 → timeoutMs=1000ms; poll-interval:1 → sleep 1000ms
    const resultPromise = watchSchedule(
      makeArgs("0.0.12345", { timeout: 1, "poll-interval": 1 }) as Parameters<typeof watchSchedule>[0],
    );

    // Advance past the poll sleep AND the timeout threshold
    await vi.advanceTimersByTimeAsync(2000);
    const result = await resultPromise;

    expect(result.status).toBe(Status.Success);
    const out: WatchOutput = JSON.parse(result.outputJson!);
    expect(out.finalState).toBe("TIMEOUT");
  });

  it("retries on 404 then resolves EXECUTED on second poll (fake timers)", async () => {
    fetch404();
    fetchOk({ executed_timestamp: "1700000099.000000000", deleted: false });

    const resultPromise = watchSchedule(
      makeArgs("0.0.12345", { "poll-interval": 1, timeout: 300 }) as Parameters<typeof watchSchedule>[0],
    );

    // Advance past the sleep that follows the 404 retry
    await vi.advanceTimersByTimeAsync(1500);
    const result = await resultPromise;

    expect(result.status).toBe(Status.Success);
    const out: WatchOutput = JSON.parse(result.outputJson!);
    expect(out.finalState).toBe("EXECUTED");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("returns Failure on non-404 HTTP error from mirror", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503, json: vi.fn() });

    const result = await watchSchedule(makeArgs() as Parameters<typeof watchSchedule>[0]);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toMatch(/503/);
  });

  it("returns Failure when fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("connection refused"));

    const result = await watchSchedule(makeArgs() as Parameters<typeof watchSchedule>[0]);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain("connection refused");
  });

  it("throws ZodError synchronously on invalid args (bad schedule-id)", async () => {
    const args = makeArgs() as Parameters<typeof watchSchedule>[0];
    (args as { args: Record<string, unknown> }).args["schedule-id"] = "bad-id";

    await expect(watchSchedule(args)).rejects.toThrow();
  });

  it("elapsedSeconds in output is a non-negative number", async () => {
    fetchOk({ executed_timestamp: "1700000050.000000000", deleted: false });

    const result = await watchSchedule(makeArgs() as Parameters<typeof watchSchedule>[0]);
    const out: WatchOutput = JSON.parse(result.outputJson!);

    expect(typeof out.elapsedSeconds).toBe("number");
    expect(out.elapsedSeconds).toBeGreaterThanOrEqual(0);
  });
});
