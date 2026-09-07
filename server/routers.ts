import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { applyAction, applyDemoEvent, evaluateBed, evaluatePatient, runHarness, seedSnapshot, type AppSnapshot, type Role, type Settings } from "../shared/careflow";
import { z } from "zod";

let snapshot: AppSnapshot = seedSnapshot();

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  careFlow: router({
    snapshot: publicProcedure.query(() => snapshot),
    harness: publicProcedure.query(() => runHarness()),
    reset: publicProcedure.mutation(() => { snapshot = seedSnapshot(); return snapshot; }),
    demoNext: publicProcedure.mutation(() => { snapshot = applyDemoEvent(snapshot); return snapshot; }),
    action: publicProcedure
      .input(z.object({ action: z.string(), recordId: z.string(), role: z.string() }))
      .mutation(({ input }) => {
        snapshot = applyAction(snapshot, input.action, input.recordId, input.role as Role);
        return snapshot;
      }),
    settings: publicProcedure
      .input(z.object({ agingMinutes: z.number().int().min(1).max(240), staleMinutes: z.number().int().min(2).max(480), escalationMinutes: z.number().int().min(5).max(720), autoRefresh: z.boolean() }))
      .mutation(({ input }) => {
        const settings = input as Settings;
        snapshot = { ...snapshot, settings, patients: snapshot.patients.map(p => evaluatePatient(p, settings)), beds: snapshot.beds.map(b => evaluateBed(b, settings)) };
        return snapshot;
      }),
  }),
});

export type AppRouter = typeof appRouter;
