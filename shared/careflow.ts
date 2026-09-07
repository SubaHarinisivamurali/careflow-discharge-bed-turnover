export type Role =
  | "Hospital Coordinator"
  | "Clinician"
  | "Nurse / Ward Staff"
  | "Cleaning / Facilities"
  | "Bed Manager / Administrator";

export type Freshness = "Fresh" | "Aging" | "Stale" | "Missing" | "Conflicting";
export type PatientState = "Clinical review" | "Ready pending order" | "Discharge ready" | "Blocked";
export type BedState = "Occupied" | "Discharge pending" | "Cleaning requested" | "Cleaning" | "Inspection" | "Safe" | "Conflict" | "Unknown";
export type TurnoverStage = "Discharge Pending" | "Cleaning Requested" | "Cleaning" | "Inspection" | "Safe";
export type Severity = "Critical" | "High" | "Medium" | "Info";

export type TimelineEvent = { at: string; label: string; actor: string; detail: string };
export type ClinicalSignals = {
  specialistReview: "Complete" | "Pending" | "Missing";
  nursingChecklist: "Complete" | "Pending" | "Missing";
  patientEducation: "Complete" | "Pending" | "Missing";
  transportPlan: "Complete" | "Pending" | "Missing";
};

export type PatientRecord = {
  id: string;
  patientId: string;
  ward: string;
  bed: string;
  specialty: string;
  acuity: "Routine" | "Priority" | "High";
  state: PatientState;
  clinicalSignals: ClinicalSignals;
  dischargeOrder: "Signed" | "Missing" | "Pending";
  blocker: string | null;
  freshness: Freshness;
  updatedAt: string | null;
  responsibleRole: Role;
  evidence: string[];
  timeline: TimelineEvent[];
};

export type BedRecord = {
  id: string;
  bed: string;
  ward: string;
  specialty: string;
  state: BedState;
  patientId: string | null;
  turnoverStage: TurnoverStage | null;
  priority: "Routine" | "Priority" | "Urgent";
  freshness: Freshness;
  lastUpdatedAt: string | null;
  blocker: string | null;
  sourceValues: { bedSystem: string; facilities: string; ehr: string };
  responsibleRole: Role;
  evidence: string[];
  timeline: TimelineEvent[];
};

export type AlertRecord = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  recordId: string;
  source: string;
  createdAt: string;
  acknowledged: boolean;
};

export type Settings = { agingMinutes: number; staleMinutes: number; escalationMinutes: number; autoRefresh: boolean };
export type AppSnapshot = { patients: PatientRecord[]; beds: BedRecord[]; alerts: AlertRecord[]; settings: Settings; demoEvent: number; demoTotal: number; auditLog: TimelineEvent[] };

const now = new Date("2026-09-06T16:20:00.000Z");
const iso = (minutesAgo: number | null) => minutesAgo === null ? null : new Date(now.getTime() - minutesAgo * 60_000).toISOString();

export const DEFAULT_SETTINGS: Settings = { agingMinutes: 30, staleMinutes: 90, escalationMinutes: 120, autoRefresh: true };

const timeline = (id: string, detail: string, minutesAgo = 8): TimelineEvent[] => [
  { at: iso(minutesAgo)!, label: "Source update", actor: "Synthetic integration", detail },
  { at: iso(minutesAgo + 18)!, label: "Record opened", actor: "Care Flow", detail: `Evidence bundle created for ${id}` },
];

export const seedPatients = (): PatientRecord[] => [
  { id: "p-1042", patientId: "CF-1042", ward: "North 2", bed: "N2-14", specialty: "General Medicine", acuity: "Priority", state: "Discharge ready", clinicalSignals: { specialistReview: "Complete", nursingChecklist: "Complete", patientEducation: "Complete", transportPlan: "Complete" }, dischargeOrder: "Signed", blocker: null, freshness: "Fresh", updatedAt: iso(6), responsibleRole: "Clinician", evidence: ["Consultant review signed 09:56", "Nursing checklist complete", "Discharge order DO-1042 signed"], timeline: timeline("CF-1042", "All readiness signals present; waiting for turnover coordination") },
  { id: "p-1187", patientId: "CF-1187", ward: "South 1", bed: "S1-06", specialty: "Cardiology", acuity: "High", state: "Blocked", clinicalSignals: { specialistReview: "Pending", nursingChecklist: "Complete", patientEducation: "Pending", transportPlan: "Missing" }, dischargeOrder: "Missing", blocker: "Specialist review and discharge order missing", freshness: "Aging", updatedAt: iso(44), responsibleRole: "Clinician", evidence: ["Cardiology review requested 09:16", "No signed discharge order"], timeline: timeline("CF-1187", "Cardiology review remains open", 44) },
  { id: "p-1099", patientId: "CF-1099", ward: "North 2", bed: "N2-03", specialty: "Orthopedics", acuity: "Routine", state: "Ready pending order", clinicalSignals: { specialistReview: "Complete", nursingChecklist: "Complete", patientEducation: "Pending", transportPlan: "Complete" }, dischargeOrder: "Pending", blocker: "Patient education still pending", freshness: "Fresh", updatedAt: iso(18), responsibleRole: "Nurse / Ward Staff", evidence: ["Orthopedic review complete", "Education checklist has one open item"], timeline: timeline("CF-1099", "Education item assigned to ward team", 18) },
  { id: "p-1210", patientId: "CF-1210", ward: "East 3", bed: "E3-11", specialty: "Paediatrics", acuity: "Priority", state: "Blocked", clinicalSignals: { specialistReview: "Missing", nursingChecklist: "Missing", patientEducation: "Missing", transportPlan: "Missing" }, dischargeOrder: "Missing", blocker: "Readiness data missing", freshness: "Missing", updatedAt: null, responsibleRole: "Clinician", evidence: ["No recent clinical readiness packet"], timeline: timeline("CF-1210", "Expected readiness packet not received", 1) },
  { id: "p-1164", patientId: "CF-1164", ward: "South 1", bed: "S1-02", specialty: "General Medicine", acuity: "Routine", state: "Clinical review", clinicalSignals: { specialistReview: "Complete", nursingChecklist: "Pending", patientEducation: "Complete", transportPlan: "Complete" }, dischargeOrder: "Pending", blocker: "Nursing checklist pending", freshness: "Stale", updatedAt: iso(132), responsibleRole: "Nurse / Ward Staff", evidence: ["Last nursing update is outside the configured stale threshold"], timeline: timeline("CF-1164", "No nursing update received within threshold", 132) },
];

export const seedBeds = (): BedRecord[] => [
  { id: "b-n2-14", bed: "N2-14", ward: "North 2", specialty: "General Medicine", state: "Discharge pending", patientId: "CF-1042", turnoverStage: "Discharge Pending", priority: "Priority", freshness: "Fresh", lastUpdatedAt: iso(6), blocker: "Awaiting patient departure confirmation", sourceValues: { bedSystem: "Occupied", facilities: "Not started", ehr: "Discharge order signed" }, responsibleRole: "Hospital Coordinator", evidence: ["Discharge order DO-1042", "Bed system last refreshed 09:54"], timeline: timeline("N2-14", "Discharge order signed; bed has not yet been released", 6) },
  { id: "b-s1-04", bed: "S1-04", ward: "South 1", specialty: "Cardiology", state: "Conflict", patientId: null, turnoverStage: "Cleaning", priority: "Urgent", freshness: "Conflicting", lastUpdatedAt: iso(12), blocker: "Bed system says Available; facilities says Cleaning Active", responsibleRole: "Bed Manager / Administrator", evidence: ["Bed system: Available at 09:48", "Facilities: Cleaning Active at 09:49", "Safe availability held until human verification"], sourceValues: { bedSystem: "Available", facilities: "Cleaning Active", ehr: "Vacated" }, timeline: timeline("S1-04", "Conflicting source values detected; no automatic resolution", 12) },
  { id: "b-n2-03", bed: "N2-03", ward: "North 2", specialty: "Orthopedics", state: "Occupied", patientId: "CF-1099", turnoverStage: null, priority: "Routine", freshness: "Fresh", lastUpdatedAt: iso(18), blocker: "Patient education pending", responsibleRole: "Nurse / Ward Staff", evidence: ["Linked patient CF-1099 is not clinically discharged"], sourceValues: { bedSystem: "Occupied", facilities: "Not started", ehr: "Occupied" }, timeline: timeline("N2-03", "Occupied; linked discharge readiness is incomplete", 18) },
  { id: "b-e3-11", bed: "E3-11", ward: "East 3", specialty: "Paediatrics", state: "Occupied", patientId: "CF-1210", turnoverStage: null, priority: "Priority", freshness: "Missing", lastUpdatedAt: null, blocker: "No current readiness packet", responsibleRole: "Clinician", evidence: ["No current EHR readiness packet"], sourceValues: { bedSystem: "Occupied", facilities: "Not started", ehr: "Unknown" }, timeline: timeline("E3-11", "Expected EHR state is missing", 1) },
  { id: "b-s1-02", bed: "S1-02", ward: "South 1", specialty: "General Medicine", state: "Occupied", patientId: "CF-1164", turnoverStage: null, priority: "Routine", freshness: "Stale", lastUpdatedAt: iso(132), blocker: "Nursing source stale", responsibleRole: "Nurse / Ward Staff", evidence: ["Last source update 132 minutes ago"], sourceValues: { bedSystem: "Occupied", facilities: "Not started", ehr: "Occupied" }, timeline: timeline("S1-02", "Source freshness is outside threshold", 132) },
  { id: "b-n1-08", bed: "N1-08", ward: "North 1", specialty: "General Medicine", state: "Safe", patientId: null, turnoverStage: "Safe", priority: "Routine", freshness: "Fresh", lastUpdatedAt: iso(9), blocker: null, responsibleRole: "Cleaning / Facilities", evidence: ["Cleaning completed 09:46", "Inspection passed 09:51", "Bed manager verified safe status"], sourceValues: { bedSystem: "Available", facilities: "Clean + Inspected", ehr: "Vacant" }, timeline: timeline("N1-08", "Safe bed available for next allocation", 9) },
  { id: "b-e3-05", bed: "E3-05", ward: "East 3", specialty: "Paediatrics", state: "Cleaning", patientId: null, turnoverStage: "Cleaning", priority: "Urgent", freshness: "Fresh", lastUpdatedAt: iso(23), blocker: "Cleaning completion not recorded", responsibleRole: "Cleaning / Facilities", evidence: ["Cleaning request CR-2031 accepted 09:37", "Completion evidence missing"], sourceValues: { bedSystem: "Vacant", facilities: "Cleaning Active", ehr: "Vacant" }, timeline: timeline("E3-05", "Cleaning is active; completion is pending", 23) },
];

export const seedAlerts = (): AlertRecord[] => [
  { id: "a-001", severity: "Critical", title: "Conflicting bed state", detail: "S1-04 is Available in the bed system but Cleaning Active in facilities.", recordId: "b-s1-04", source: "Bed system + Facilities", createdAt: iso(12)!, acknowledged: false },
  { id: "a-002", severity: "High", title: "Missing cleaning completion", detail: "E3-05 has an active cleaning request with no completion evidence.", recordId: "b-e3-05", source: "Facilities", createdAt: iso(23)!, acknowledged: false },
  { id: "a-003", severity: "High", title: "Stale specialist review", detail: "CF-1164 has a stale nursing source and cannot advance readiness.", recordId: "p-1164", source: "EHR", createdAt: iso(132)!, acknowledged: false },
  { id: "a-004", severity: "Medium", title: "Missing discharge order", detail: "CF-1187 has complete nursing work but no signed discharge order.", recordId: "p-1187", source: "EHR", createdAt: iso(44)!, acknowledged: false },
  { id: "a-005", severity: "Info", title: "Safe bed available", detail: "N1-08 passed cleaning and inspection and is ready for allocation.", recordId: "b-n1-08", source: "Facilities + Bed Manager", createdAt: iso(9)!, acknowledged: false },
];

export function freshnessFor(updatedAt: string | null, settings: Settings, conflict = false): Freshness {
  if (conflict) return "Conflicting";
  if (!updatedAt) return "Missing";
  const minutes = (now.getTime() - new Date(updatedAt).getTime()) / 60_000;
  if (minutes >= settings.staleMinutes) return "Stale";
  if (minutes >= settings.agingMinutes) return "Aging";
  return "Fresh";
}

export function evaluatePatient(patient: PatientRecord, settings: Settings): PatientRecord {
  const signals = Object.values(patient.clinicalSignals);
  const missing = signals.filter(v => v === "Missing").length;
  const pending = signals.filter(v => v === "Pending").length;
  const freshness = freshnessFor(patient.updatedAt, settings);
  let state: PatientState = "Clinical review";
  let blocker: string | null = null;
  if (missing > 0 || freshness === "Missing" || freshness === "Stale") {
    state = "Blocked";
    blocker = freshness === "Stale" ? "Source data is stale" : freshness === "Missing" ? "Readiness data missing" : "Required clinical signal missing";
  } else if (pending > 0) {
    state = "Ready pending order";
    blocker = patient.clinicalSignals.patientEducation === "Pending" ? "Patient education pending" : "Clinical signal pending";
  } else if (patient.dischargeOrder !== "Signed") {
    state = "Ready pending order";
    blocker = "Signed discharge order required";
  } else {
    state = "Discharge ready";
    blocker = null;
  }
  return { ...patient, state, blocker, freshness };
}

export function evaluateBed(bed: BedRecord, settings: Settings): BedRecord {
  const conflict = bed.sourceValues.bedSystem === "Available" && bed.sourceValues.facilities.includes("Cleaning");
  const freshness = freshnessFor(bed.lastUpdatedAt, settings, conflict);
  if (conflict) return { ...bed, state: "Conflict", freshness, blocker: "Bed system says Available; facilities says Cleaning Active" };
  if (!bed.lastUpdatedAt) return { ...bed, state: "Unknown", freshness, blocker: "Source state missing" };
  return { ...bed, freshness };
}

export function seedSnapshot(): AppSnapshot {
  const settings = { ...DEFAULT_SETTINGS };
  return { patients: seedPatients().map(p => evaluatePatient(p, settings)), beds: seedBeds().map(b => evaluateBed(b, settings)), alerts: seedAlerts(), settings, demoEvent: 0, demoTotal: 6, auditLog: [{ at: now.toISOString(), label: "Demo initialized", actor: "Care Flow", detail: "Synthetic hospital operations scenario loaded" }] };
}

export function metrics(snapshot: AppSnapshot) {
  const safe = snapshot.beds.filter(b => b.state === "Safe").length;
  const turnover = snapshot.beds.filter(b => ["Discharge pending", "Cleaning requested", "Cleaning", "Inspection"].includes(b.state)).length;
  const ready = snapshot.patients.filter(p => p.state === "Discharge ready").length;
  const blocked = snapshot.patients.filter(p => p.state === "Blocked").length;
  const attention = [...snapshot.beds, ...snapshot.patients].filter(r => ["Stale", "Missing", "Conflicting"].includes(r.freshness)).length;
  return { totalBeds: snapshot.beds.length, occupiedBeds: snapshot.beds.filter(b => b.state === "Occupied").length, safeBeds: safe, turnoverBeds: turnover, dischargeReady: ready, blocked, attention, safeConversion: Math.round((safe / snapshot.beds.length) * 100), readinessRate: Math.round((ready / snapshot.patients.length) * 100), avgTurnoverMinutes: 78 };
}

export function canAction(role: Role, action: string): boolean {
  const allowed: Record<string, Role[]> = {
    acknowledgeAlert: ["Hospital Coordinator", "Bed Manager / Administrator"],
    verifyConflict: ["Bed Manager / Administrator", "Hospital Coordinator"],
    signDischarge: ["Clinician"],
    completeCleaning: ["Cleaning / Facilities"],
    passInspection: ["Cleaning / Facilities", "Bed Manager / Administrator"],
    markSafe: ["Bed Manager / Administrator"],
    updateClinical: ["Clinician", "Nurse / Ward Staff"],
  };
  return allowed[action]?.includes(role) ?? false;
}

export function applyAction(snapshot: AppSnapshot, action: string, recordId: string, role: Role): AppSnapshot {
  const next = structuredClone(snapshot) as AppSnapshot;
  if (!canAction(role, action)) throw new Error(`Unauthorized: ${role} cannot ${action}`);
  const at = now.toISOString();
  if (action === "acknowledgeAlert") {
    const alert = next.alerts.find(a => a.id === recordId); if (alert) alert.acknowledged = true;
  }
  if (action === "verifyConflict") {
    const bed = next.beds.find(b => b.id === recordId); if (bed) { bed.sourceValues.facilities = "Verified Available"; bed.state = "Safe"; bed.turnoverStage = "Safe"; bed.freshness = "Fresh"; bed.blocker = null; bed.evidence.push(`Conflict manually verified by ${role}`); bed.timeline.unshift({ at, label: "Human verification", actor: role, detail: "Conflicting source values reviewed; safe state authorized" }); }
  }
  if (action === "signDischarge") {
    const patient = next.patients.find(p => p.id === recordId); if (patient) { patient.dischargeOrder = "Signed"; patient.updatedAt = at; patient.timeline.unshift({ at, label: "Discharge order signed", actor: role, detail: "Human clinician confirmation recorded" }); }
  }
  if (action === "completeCleaning") {
    const bed = next.beds.find(b => b.id === recordId); if (bed) { bed.state = "Inspection"; bed.turnoverStage = "Inspection"; bed.sourceValues.facilities = "Cleaned — inspection required"; bed.lastUpdatedAt = at; bed.freshness = "Fresh"; bed.blocker = "Inspection required"; bed.timeline.unshift({ at, label: "Cleaning completed", actor: role, detail: "Facilities completion evidence recorded" }); }
  }
  if (action === "passInspection") {
    const bed = next.beds.find(b => b.id === recordId); if (bed) { bed.state = "Safe"; bed.turnoverStage = "Safe"; bed.sourceValues.facilities = "Clean + Inspected"; bed.lastUpdatedAt = at; bed.freshness = "Fresh"; bed.blocker = null; bed.timeline.unshift({ at, label: "Inspection passed", actor: role, detail: "Human inspection evidence recorded" }); }
  }
  if (action === "markSafe") {
    const bed = next.beds.find(b => b.id === recordId); if (bed) { bed.state = "Safe"; bed.turnoverStage = "Safe"; bed.blocker = null; bed.timeline.unshift({ at, label: "Safe bed authorized", actor: role, detail: "Bed Manager confirmed safe availability" }); }
  }
  if (action === "updateClinical") {
    const patient = next.patients.find(p => p.id === recordId); if (patient) { patient.clinicalSignals.patientEducation = "Complete"; patient.updatedAt = at; patient.timeline.unshift({ at, label: "Clinical readiness updated", actor: role, detail: "Ward team updated a readiness signal" }); }
  }
  next.patients = next.patients.map(p => evaluatePatient(p, next.settings));
  next.beds = next.beds.map(b => evaluateBed(b, next.settings));
  next.auditLog.unshift({ at, label: action, actor: role, detail: `${recordId} changed through an authorized human action` });
  return next;
}

export function applyDemoEvent(snapshot: AppSnapshot): AppSnapshot {
  if (snapshot.demoEvent >= snapshot.demoTotal) return snapshot;
  const next = structuredClone(snapshot) as AppSnapshot;
  next.demoEvent += 1;
  const at = new Date(now.getTime() + next.demoEvent * 60_000).toISOString();
  const events: [string, string, string][] = [
    ["b-n2-14", "Discharge confirmation received", "Hospital Coordinator"],
    ["b-n2-14", "Cleaning requested", "Hospital Coordinator"],
    ["b-n2-14", "Cleaning completed", "Cleaning / Facilities"],
    ["b-n2-14", "Inspection passed", "Bed Manager / Administrator"],
    ["b-n2-14", "Safe availability authorized", "Bed Manager / Administrator"],
    ["b-n2-14", "Next allocation held for human decision", "Hospital Coordinator"],
  ];
  const [recordId, label, actor] = events[next.demoEvent - 1];
  const bed = next.beds.find(b => b.id === recordId);
  if (bed) {
    if (next.demoEvent === 1) { bed.state = "Cleaning requested"; bed.turnoverStage = "Cleaning Requested"; bed.sourceValues.bedSystem = "Vacant"; bed.blocker = "Cleaning requested"; }
    if (next.demoEvent === 2) { bed.state = "Cleaning"; bed.turnoverStage = "Cleaning"; bed.sourceValues.facilities = "Cleaning Active"; bed.blocker = "Cleaning completion pending"; }
    if (next.demoEvent === 3) { bed.state = "Inspection"; bed.turnoverStage = "Inspection"; bed.sourceValues.facilities = "Cleaned — inspection required"; bed.blocker = "Inspection required"; }
    if (next.demoEvent === 4 || next.demoEvent === 5 || next.demoEvent === 6) { bed.state = "Safe"; bed.turnoverStage = "Safe"; bed.sourceValues.facilities = "Clean + Inspected"; bed.blocker = next.demoEvent === 6 ? "Allocation remains a human decision" : null; }
    bed.lastUpdatedAt = at; bed.freshness = "Fresh"; bed.timeline.unshift({ at, label, actor, detail: "Deterministic demo event applied" });
  }
  next.auditLog.unshift({ at, label, actor, detail: "Demo event advanced without autonomous clinical or bed allocation" });
  return next;
}

export type HarnessResult = { id: string; description: string; expected: string; actual: string; pass: boolean; explanation: string };
export function runHarness(): HarnessResult[] {
  const base = seedSnapshot();
  const unauthorized = (() => { try { applyAction(base, "markSafe", "b-n2-14", "Clinician"); return false; } catch { return true; } })();
  const missing = base.patients.find(p => p.id === "p-1210")!;
  const stale = base.patients.find(p => p.id === "p-1164")!;
  const conflict = base.beds.find(b => b.id === "b-s1-04")!;
  const unknown: BedRecord = { ...base.beds[0], id: "b-unknown", lastUpdatedAt: null, sourceValues: { bedSystem: "???", facilities: "???", ehr: "???" } };
  const checks = [
    ["TC-001", "Complete clinical signals plus signed order are discharge ready", base.patients[0].state === "Discharge ready", "Discharge ready"],
    ["TC-002", "Missing clinical data blocks readiness", missing.state === "Blocked", "Blocked"],
    ["TC-003", "Stale data blocks readiness", stale.state === "Blocked" && stale.freshness === "Stale", "Blocked / Stale"],
    ["TC-004", "Conflicting bed state never becomes safe automatically", conflict.state === "Conflict" && conflict.freshness === "Conflicting", "Conflict / Conflicting"],
    ["TC-005", "Unknown bed state is handled gracefully", evaluateBed(unknown, base.settings).state === "Unknown", "Unknown"],
    ["TC-006", "Unauthorized protected action is rejected", unauthorized, "Rejected"],
    ["TC-007", "Settings thresholds affect freshness", freshnessFor(iso(44), { ...base.settings, agingMinutes: 10, staleMinutes: 40, escalationMinutes: 120, autoRefresh: true }) === "Stale", "Stale"],
    ["TC-008", "Cleaning completion advances to inspection", applyAction(base, "completeCleaning", "b-e3-05", "Cleaning / Facilities").beds.find(b => b.id === "b-e3-05")?.state === "Inspection", "Inspection"],
    ["TC-009", "Inspection plus authorized verification creates a safe bed", applyAction(applyAction(base, "completeCleaning", "b-e3-05", "Cleaning / Facilities"), "passInspection", "b-e3-05", "Bed Manager / Administrator").beds.find(b => b.id === "b-e3-05")?.state === "Safe", "Safe"],
    ["TC-010", "Demo reaches final safe-bed outcome", (() => { let s = base; for (let i = 0; i < 6; i++) s = applyDemoEvent(s); return s.demoEvent === 6 && s.beds.find(b => b.id === "b-n2-14")?.state === "Safe"; })(), "Event 6 / Safe"],
  ] as const;
  return checks.map(([id, description, pass, expected]) => ({ id, description, expected, actual: pass ? expected : "Observed rule mismatch", pass, explanation: pass ? "Assertion passed against the shared deterministic rule engine." : "The shared rule engine returned an unexpected result." }));
}
