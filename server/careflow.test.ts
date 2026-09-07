import { describe, expect, it } from "vitest";
import { applyAction, applyDemoEvent, evaluateBed, freshnessFor, runHarness, seedSnapshot } from "../shared/careflow";

describe("Care Flow shared decision engine", () => {
  it("passes all ten product test cases", () => {
    const results = runHarness();
    expect(results).toHaveLength(10);
    expect(results.every(result => result.pass)).toBe(true);
  });

  it("never auto-resolves a conflicting bed", () => {
    const snapshot = seedSnapshot();
    const bed = snapshot.beds.find(item => item.id === "b-s1-04");
    expect(bed?.state).toBe("Conflict");
    expect(bed?.freshness).toBe("Conflicting");
    expect(bed?.blocker).toContain("Available");
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
    const unknown = { ...snapshot.beds[0], lastUpdatedAt: null, sourceValues: { bedSystem: "???", facilities: "???", ehr: "???" } };
    expect(evaluateBed(unknown, snapshot.settings).state).toBe("Unknown");
  });

  it("advances the deterministic demo to a safe bed", () => {
    let snapshot = seedSnapshot();
    for (let i = 0; i < 6; i += 1) snapshot = applyDemoEvent(snapshot);
    expect(snapshot.demoEvent).toBe(6);
    expect(snapshot.beds.find(item => item.id === "b-n2-14")?.state).toBe("Safe");
  });
});
