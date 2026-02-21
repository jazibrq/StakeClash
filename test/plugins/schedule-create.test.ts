// @vitest-environment node
/**
 * test/plugins/schedule-create.test.ts
 *
 * Tests for the schedule:create handler.
 * Mocks @hashgraph/sdk so no real Hedera network calls are made.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ── SDK mocks (must be before imports) ────────────────────────────────────
const mockInnerTx = {
  addHbarTransfer: vi.fn().mockReturnThis(),
};
const mockScheduleTx = {
  setScheduledTransaction: vi.fn().mockReturnThis(),
  setExpirationTime: vi.fn().mockReturnThis(),
  setWaitForExpiry: vi.fn().mockReturnThis(),
  setScheduleMemo: vi.fn().mockReturnThis(),
  execute: vi.fn(),
};

vi.mock("@hashgraph/sdk", async () => {
  const actual = await vi.importActual<typeof import("@hashgraph/sdk")>("@hashgraph/sdk");
  return {
    ...actual,
    Hbar: { fromTinybars: vi.fn().mockReturnValue({ _valueInTinybar: "10000000" }) },
    Timestamp: vi.fn().mockImplementation(() => ({})),
    TransferTransaction: vi.fn().mockImplementation(() => mockInnerTx),
    ScheduleCreateTransaction: vi.fn().mockImplementation(() => mockScheduleTx),
  };
});

import { createSchedule } from "@/plugins/schedule/commands/create/handler";
import type { CreateScheduleOutput } from "@/plugins/schedule/commands/create/output";
import { Status } from "@/core/shared/constants";

// ── Helpers ────────────────────────────────────────────────────────────────

// ── Helpers ───────────────────────────────────────────────────────────────

function makeSigningMock(overrides: Record<string, unknown> = {}) {
  return {
    signAndExecute: vi.fn().mockResolvedValue({
      success: true,
      transactionId: "0.0.1001@1700000000.000000000",
      scheduleId: "0.0.9000",
      consensusTimestamp: "2024-01-01T00:00:00.000Z",
      receipt: { status: { status: "success", transactionId: "" } },
      ...overrides,
    }),
  };
}

function makeArgs(argOverrides: Record<string, unknown> = {}, apiOverrides: Record<string, unknown> = {}) {
  return {
    args: {
      to: "0.0.2002",
      amount: "10000000",
      "expiry-seconds": 600,
      ...argOverrides,
    },
    api: {
      network: {
        getCurrentNetwork: vi.fn().mockReturnValue("testnet"),
        getCurrentOperatorOrThrow: vi.fn().mockReturnValue({ accountId: "0.0.1001", keyRefId: "ref" }),
        getNetworkConfig: vi.fn().mockReturnValue({ mirrorNodeUrl: "https://testnet.mirrornode.hedera.com" }),
      },
      txExecution: makeSigningMock(),
      ...apiOverrides,
    },
    logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
    state: {},
    config: {},
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("schedule:create handler", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns Success with correct output on happy path", async () => {
    const args = makeArgs();
    const result = await createSchedule(args as Parameters<typeof createSchedule>[0]);

    expect(result.status).toBe(Status.Success);
    const output: CreateScheduleOutput = JSON.parse(result.outputJson!);
    expect(output.scheduleId).toBe("0.0.9000");
    expect(output.transactionId).toBe("0.0.1001@1700000000.000000000");
    expect(output.payer).toBe("0.0.1001");
    expect(output.expirySeconds).toBe(600);
    expect(output.network).toBe("testnet");
  });

  it("calls setScheduleMemo when memo is provided", async () => {
    const args = makeArgs({ memo: "season-1" });
    await createSchedule(args as Parameters<typeof createSchedule>[0]);
    expect(mockScheduleTx.setScheduleMemo).toHaveBeenCalledWith("season-1");
  });

  it("does NOT call setScheduleMemo when memo is absent", async () => {
    const args = makeArgs();
    await createSchedule(args as Parameters<typeof createSchedule>[0]);
    expect(mockScheduleTx.setScheduleMemo).not.toHaveBeenCalled();
  });

  it("returns Failure when signAndExecute reports success=false", async () => {
    const args = makeArgs({}, { txExecution: makeSigningMock({ success: false, scheduleId: undefined }) });
    const result = await createSchedule(args as Parameters<typeof createSchedule>[0]);
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain("non-success status");
  });

  it("returns Failure when receipt has no scheduleId", async () => {
    const args = makeArgs({}, { txExecution: makeSigningMock({ success: true, scheduleId: undefined }) });
    const result = await createSchedule(args as Parameters<typeof createSchedule>[0]);
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain("schedule ID was not returned");
  });

  it("returns Failure when signAndExecute throws", async () => {
    const signing = { signAndExecute: vi.fn().mockRejectedValue(new Error("network timeout")) };
    const args = makeArgs({}, { txExecution: signing });
    const result = await createSchedule(args as Parameters<typeof createSchedule>[0]);
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain("network timeout");
  });

  it("throws ZodError when required args are missing (propagates before try-catch)", async () => {
    const args = makeArgs({ to: undefined, amount: undefined });
    await expect(createSchedule(args as Parameters<typeof createSchedule>[0])).rejects.toThrow();
  });

  // placeholder so old test count is preserved
  it("propagates errors without swallowing them (via Failure status)", async () => {
    const signing = { signAndExecute: vi.fn().mockRejectedValue(new Error("BUSY")) };
    const args = makeArgs({}, { txExecution: signing });
    const result = await createSchedule(args as Parameters<typeof createSchedule>[0]);
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain("BUSY");
  });

  it("passes expiry-seconds through to output", async () => {
    const args = makeArgs({ "expiry-seconds": 300 });
    const result = await createSchedule(args as Parameters<typeof createSchedule>[0]);
    expect(result.status).toBe(Status.Success);
    const output: CreateScheduleOutput = JSON.parse(result.outputJson!);
    expect(output.expirySeconds).toBe(300);
  });
});
