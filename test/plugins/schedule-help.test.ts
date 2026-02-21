// @vitest-environment node
/**
 * test/plugins/schedule-help.test.ts
 *
 * Smoke tests for the schedule plugin:
 * - Modules load without error
 * - Exported handler API shape is correct
 * - No Hedera SDK transaction types are re-exported from the plugin layer
 */

import { vi, describe, it, expect } from "vitest";

// Stub @hashgraph/sdk so handlers load without a real SDK install
vi.mock("@hashgraph/sdk", async () => {
  const actual = await vi.importActual<typeof import("@hashgraph/sdk")>("@hashgraph/sdk");
  return {
    ...actual,
    Hbar: { fromTinybars: vi.fn().mockReturnValue({}) },
    Timestamp: vi.fn().mockImplementation(() => ({})),
    TransferTransaction: vi.fn().mockImplementation(() => ({ addHbarTransfer: vi.fn().mockReturnThis() })),
    ScheduleCreateTransaction: vi.fn().mockImplementation(() => ({
      setScheduledTransaction: vi.fn().mockReturnThis(),
      setExpirationTime: vi.fn().mockReturnThis(),
      setWaitForExpiry: vi.fn().mockReturnThis(),
      setScheduleMemo: vi.fn().mockReturnThis(),
    })),
  };
});

describe("schedule plugin — handler exports", () => {
  it("create handler exports createSchedule as a function", async () => {
    const mod = await import("@/plugins/schedule/commands/create/handler");
    expect(typeof mod.createSchedule).toBe("function");
  });

  it("status handler exports getScheduleStatus as a function", async () => {
    const mod = await import("@/plugins/schedule/commands/status/handler");
    expect(typeof mod.getScheduleStatus).toBe("function");
  });

  it("watch handler exports watchSchedule as a function", async () => {
    const mod = await import("@/plugins/schedule/commands/watch/handler");
    expect(typeof mod.watchSchedule).toBe("function");
  });
});

describe("schedule plugin — index barrel exports", () => {
  it("re-exports create, status, watch namespaces", async () => {
    const plugin = await import("@/plugins/schedule");
    expect(typeof plugin.create).toBe("object");
    expect(typeof plugin.status).toBe("object");
    expect(typeof plugin.watch).toBe("object");
  });

  it("exports createSchedule inside the create namespace", async () => {
    const plugin = await import("@/plugins/schedule");
    expect(typeof (plugin.create as Record<string, unknown>)["createSchedule"]).toBe("function");
  });

  it("exports getScheduleStatus inside the status namespace", async () => {
    const plugin = await import("@/plugins/schedule");
    expect(typeof (plugin.status as Record<string, unknown>)["getScheduleStatus"]).toBe("function");
  });

  it("exports watchSchedule inside the watch namespace", async () => {
    const plugin = await import("@/plugins/schedule");
    expect(typeof (plugin.watch as Record<string, unknown>)["watchSchedule"]).toBe("function");
  });

  it("exports buildHandlerArgs from adapter", async () => {
    const plugin = await import("@/plugins/schedule");
    expect(typeof plugin.buildHandlerArgs).toBe("function");
  });
});

describe("schedule plugin — no Hedera SDK re-exports", () => {
  it("create handler does not re-export SDK transaction types", async () => {
    const mod = await import("@/plugins/schedule/commands/create/handler") as Record<string, unknown>;
    expect(mod["TransferTransaction"]).toBeUndefined();
    expect(mod["ScheduleCreateTransaction"]).toBeUndefined();
    expect(mod["ScheduleInfoQuery"]).toBeUndefined();
  });

  it("status handler does not re-export SDK types", async () => {
    const mod = await import("@/plugins/schedule/commands/status/handler") as Record<string, unknown>;
    expect(mod["ScheduleInfoQuery"]).toBeUndefined();
    expect(mod["ScheduleCreateTransaction"]).toBeUndefined();
  });

  it("watch handler does not re-export SDK types", async () => {
    const mod = await import("@/plugins/schedule/commands/watch/handler") as Record<string, unknown>;
    expect(mod["Client"]).toBeUndefined();
    expect(mod["ScheduleCreateTransaction"]).toBeUndefined();
  });
});
