import { describe, expect, it } from "vitest";
import { applyAction, applyDemoEvent, evaluateBed, freshnessFor, metrics, runHarness, seedSnapshot } from "../shared/careflow";

describe("Care Flow shared decision engine", () => {
  it("passes all ten product test cases", () => {
    const results = runHarness();
    expect(results).toHaveLength(10);
    expect(results.every(result => result.pass)).toBe(true);
  });

  it("does not make a conflicting bed safe", () => {
    const snapshot = seedSnapshot();
    const bed = snapshot.beds.find(item => item.id === "b-s1-04");
    expect(bed?.state).toBe("Conflict");
    expect(bed?.freshness).toBe("Conflicting");
    expect(bed?.safeAvailableAt).toBeNull();
    expect(bed?.blocker).toContain("Available");
  });

  it("halts turnover when a clinician revokes a discharge order", () => {
    const snapshot = seedSnapshot();
    const next = applyAction(snapshot, "revokeDischarge", "p-1042", "Clinician");
    const patient = next.patients.find(item => item.id === "p-1042");
    const bed = next.beds.find(item => item.id === "b-n2-14");
    expect(patient?.dischargeOrder).toBe("Revoked");
    expect(patient?.state).toBe("Blocked");
    expect(patient?.clinicalReadyAt).toBeNull();
    expect(bed?.state).toBe("Occupied");
    expect(bed?.safeAvailableAt).toBeNull();
    expect(next.auditLog[0]).toMatchObject({ action: "revokeDischarge", role: "Clinician", recordId: "p-1042", previousState: "Discharge ready", newState: "Blocked" });
  });

  it("blocks safe availability when telemetry is stale", () => {
    const snapshot = seedSnapshot();
    const safeBed = snapshot.beds.find(item => item.id === "b-n1-08")!;
    const staleBed = evaluateBed({ ...safeBed, lastUpdatedAt: "2026-09-06T14:20:00.000Z" }, snapshot.settings);
    expect(staleBed.freshness).toBe("Stale");
    expect(staleBed.state).not.toBe("Safe");
    expect(staleBed.blocker).toContain("stale");
  });

  it("calculates measured turnover delay against the baseline", () => {
    const snapshot = seedSnapshot();
    const result = metrics(snapshot);
    expect(result.turnoverDelayMinutes).toBe(78);
    expect(result.baselineTurnoverMinutes).toBe(96);
    expect(result.turnoverDelayStatus).toBe("Measured");
  });

  it("rejects protected actions for the wrong role", () => {
    expect(() => applyAction(seedSnapshot(), "markSafe", "b-n2-14", "Clinician")).toThrow(/Unauthorized/);
  });

  it("uses configured freshness thresholds", () => {
    const settings = { agingMinutes: 10, staleMinutes: 40, escalationMinutes: 120, autoRefresh: true };
    expect(freshnessFor(new Date("2026-09-06T15:35:00.000Z").toISOString(), settings)).toBe("Stale");
  });

  it("handles missing or unknown state without crashing", () => {
    const snapshot = seedSnapshot();
    const unknown = { ...snapshot.beds[0], id: "b-unknown", lastUpdatedAt: null, sourceValues: { bedSystem: "???", facilities: "???", ehr: "???" } };
    expect(evaluateBed(unknown, snapshot.settings).state).toBe("Unknown");
  });

  it("advances the deterministic demo to a safe bed", () => {
    let snapshot = seedSnapshot();
    for (let i = 0; i < 6; i += 1) snapshot = applyDemoEvent(snapshot);
    expect(snapshot.demoEvent).toBe(6);
    expect(snapshot.beds.find(item => item.id === "b-n2-14")?.state).toBe("Safe");
  });
});
