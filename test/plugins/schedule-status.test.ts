// @vitest-environment node
/**
 * test/plugins/schedule-status.test.ts
 *
 * Tests for the schedule:status handler.
 * Mocks global fetch so no real mirror-node calls are made.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

import { getScheduleStatus } from "@/plugins/schedule/commands/status/handler";
import type { StatusOutput } from "@/plugins/schedule/commands/status/output";
import { Status } from "@/core/shared/constants";

// ── Helpers ────────────────────────────────────────────────────────────────

const MIRROR   = "https://testnet.mirrornode.hedera.com";
const NETWORK  = "testnet";

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function makeArgs(scheduleId = "0.0.12345") {
  return {
    args: { "schedule-id": scheduleId },
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

function mockFetchOk(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(body),
  });
}

function mockFetch404() {
  mockFetch.mockResolvedValueOnce({ ok: false, status: 404, json: vi.fn() });
}

function mockFetchError(httpStatus: number) {
  mockFetch.mockResolvedValueOnce({ ok: false, status: httpStatus, json: vi.fn() });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("schedule status — getScheduleStatus()", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns Success with state PENDING when not executed or deleted", async () => {
    mockFetchOk({ schedule_id: "0.0.12345", executed_timestamp: null, deleted: false });

    const result = await getScheduleStatus(makeArgs("0.0.12345") as Parameters<typeof getScheduleStatus>[0]);

    expect(result.status).toBe(Status.Success);
    const output: StatusOutput = JSON.parse(result.outputJson!);
    expect(output.state).toBe("PENDING");
    expect(output.executed).toBe(false);
    expect(output.deleted).toBe(false);
    expect(output.scheduleId).toBe("0.0.12345");
    expect(output.network).toBe(NETWORK);
  });

  it("returns Success with state EXECUTED when executed_timestamp is set", async () => {
    mockFetchOk({
      schedule_id: "0.0.12345",
      executed_timestamp: "1700000050.123456789",
      deleted: false,
    });

    const result = await getScheduleStatus(makeArgs() as Parameters<typeof getScheduleStatus>[0]);

    expect(result.status).toBe(Status.Success);
    const output: StatusOutput = JSON.parse(result.outputJson!);
    expect(output.state).toBe("EXECUTED");
    expect(output.executed).toBe(true);
  });

  it("returns Success with state DELETED when deleted is true", async () => {
    mockFetchOk({ schedule_id: "0.0.12345", executed_timestamp: null, deleted: true });

    const result = await getScheduleStatus(makeArgs() as Parameters<typeof getScheduleStatus>[0]);

    expect(result.status).toBe(Status.Success);
    const output: StatusOutput = JSON.parse(result.outputJson!);
    expect(output.state).toBe("DELETED");
    expect(output.deleted).toBe(true);
  });

  it("returns Failure with not-found message on 404", async () => {
    mockFetch404();

    const result = await getScheduleStatus(makeArgs("0.0.99999") as Parameters<typeof getScheduleStatus>[0]);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toMatch(/0.0.99999/);
    expect(result.errorMessage).toMatch(/not found/i);
  });

  it("returns Failure on non-404 HTTP error", async () => {
    mockFetchError(503);

    const result = await getScheduleStatus(makeArgs() as Parameters<typeof getScheduleStatus>[0]);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toMatch(/503/);
  });

  it("returns Failure when fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network timeout"));

    const result = await getScheduleStatus(makeArgs() as Parameters<typeof getScheduleStatus>[0]);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain("network timeout");
  });

  it("includes memo in output when mirror returns it", async () => {
    mockFetchOk({
      schedule_id: "0.0.12345",
      executed_timestamp: null,
      deleted: false,
      memo: "Season 3 reward",
    });

    const result = await getScheduleStatus(makeArgs() as Parameters<typeof getScheduleStatus>[0]);

    const output: StatusOutput = JSON.parse(result.outputJson!);
    expect(output.memo).toBe("Season 3 reward");
  });

  it("throws ZodError synchronously on invalid schedule-id", async () => {
    const args = makeArgs() as Parameters<typeof getScheduleStatus>[0];
    (args as { args: Record<string, unknown> }).args["schedule-id"] = "not-an-id";

    await expect(getScheduleStatus(args)).rejects.toThrow();
  });
});
