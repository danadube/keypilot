import { generateTransactionPaperwork } from "@/lib/forms-engine/generator/paperwork-generator";
import { loadMvpFormsEngineSeed } from "@/lib/forms-engine/seed/load-mvp-seed";

describe("forms-engine paperwork generator (MVP seed)", () => {
  it("generates California listing instances for residential SELL", () => {
    const { paperworkOptions } = loadMvpFormsEngineSeed();
    const { instances, template } = generateTransactionPaperwork({
      ctx: {
        transactionId: "txn-test-1",
        propertyState: "CA",
        propertyType: "residential",
        side: "SELL",
        flags: {},
      },
      options: {
        ...paperworkOptions,
        createId: (() => {
          let n = 0;
          return () => `id-${n++}`;
        })(),
      },
    });
    expect(template.id).toBe("tpl-ca-res-sell");
    expect(instances).toHaveLength(12);
    expect(instances.map((i) => i.shortCode).sort()).toEqual(
      ["AD", "AVID", "ESD", "FHDS", "FLD", "NHD", "RLA", "SA", "SPQ", "TDS", "WCMD", "WFA"].sort()
    );
    expect(instances.every((i) => i.transactionId === "txn-test-1")).toBe(true);
  });

  it("includes operational task when flag is set", () => {
    const { paperworkOptions } = loadMvpFormsEngineSeed();
    const { instances } = generateTransactionPaperwork({
      ctx: {
        transactionId: "txn-test-2",
        propertyState: "CA",
        propertyType: "residential",
        side: "BUY",
        flags: { needsSigningScheduled: true },
      },
      options: {
        ...paperworkOptions,
        createId: (() => {
          let n = 0;
          return () => `id-${n++}`;
        })(),
      },
    });
    const ops = instances.find((i) => i.sourceRuleId === "ops-schedule-signing");
    expect(ops?.bucket).toBe("operational_task");
  });
});
