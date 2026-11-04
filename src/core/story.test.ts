import { describe, it, expect } from "vitest";
import { slotValues, fill, renderClue, type ClueCtx, type ClueTemplate } from "./story";

const TZ = "America/New_York";
// Mon Nov 2 2026, 12:30 local (EST, UTC-5)
const ctx: ClueCtx = { at: "2026-11-02T17:30:00Z", tz: TZ, hall: "hodge", dishes: ["Chicken Cutlet Wrap", "Green Goddess"], feeling: "satisfied", mentionDishes: true };

describe("slotValues", () => {
    it("hall name, local weekday, local time with am/pm, first dish lowercased, feeling", () => {
        expect(slotValues(ctx)).toEqual({ hall: "Hodgdon", day: "Monday", time: "12:30pm", dish: "chicken cutlet wrap", feeling: "satisfied" });
    });
    it("morning time and a different day in local time", () => {
        // 2026-10-30T13:00Z = Fri 9:00am EDT
        expect(slotValues({ ...ctx, at: "2026-10-30T13:00:00Z", hall: "kindlevan" })).toMatchObject({ day: "Friday", time: "9:00am", hall: "Kindlevan" });
    });
    it("late night crosses to the local day", () => {
        // 2026-11-03T03:15Z = Mon 10:15pm EST
        expect(slotValues({ ...ctx, at: "2026-11-03T03:15:00Z" })).toMatchObject({ day: "Monday", time: "10:15pm" });
    });
    it("missing things are null: no hall, unknown hall, no dishes, dishes switched off, no feeling", () => {
        expect(slotValues({ ...ctx, hall: null }).hall).toBeNull();
        expect(slotValues({ ...ctx, hall: "mars" }).hall).toBeNull();
        expect(slotValues({ ...ctx, dishes: [] }).dish).toBeNull();
        expect(slotValues({ ...ctx, mentionDishes: false }).dish).toBeNull();
        expect(slotValues({ ...ctx, feeling: null }).feeling).toBeNull();
    });
});

describe("fill", () => {
    const v = { hall: "Hodgdon", day: "Monday", time: "12:30pm", dish: null, feeling: "satisfied" };
    it("replaces every slot", () => {
        expect(fill("{hall}, {day}, {time}.", v)).toBe("Hodgdon, Monday, 12:30pm.");
    });
    it("an [optional part] disappears when any slot inside it is missing", () => {
        expect(fill("{day}.[ You had the {dish}.][ You felt {feeling}.]", v)).toBe("Monday. You felt satisfied.");
    });
    it("a required slot that is missing throws (the template must wrap it in [ ])", () => {
        expect(() => fill("You had the {dish}.", v)).toThrow();
    });
    it("an unknown slot throws, even inside [ ]", () => {
        expect(() => fill("[{mood}]", v)).toThrow();
    });
});

describe("renderClue", () => {
    const t: ClueTemplate = {
        frame: "[{hall}, ]{day}, {time}.[ You said the {dish} left you {feeling}.]",
        body: "Dewick's lentil soup uses cumin the way my grandmother did.",
        choiceLines: { priya: "Priya pretended to read the menu. Upside down.", bar: "The salad bar never leaves." },
    };
    it("frame + body, as Clue 3 reads on your real plate", () => {
        expect(renderClue(t, ctx, null)).toBe("Hodgdon, Monday, 12:30pm. You said the chicken cutlet wrap left you satisfied. Dewick's lentil soup uses cumin the way my grandmother did.");
    });
    it("adds the line for your choice", () => {
        expect(renderClue(t, ctx, "priya")).toMatch(/grandmother did\. Priya pretended to read the menu\. Upside down\.$/);
    });
    it("an unknown choice adds nothing", () => {
        expect(renderClue(t, ctx, "kerem")).toBe(renderClue(t, ctx, null));
    });
    it("a label snack with no hall and no feeling still reads cleanly (no stray commas or spaces)", () => {
        expect(renderClue(t, { ...ctx, hall: null, feeling: null }, null)).toBe("Monday, 12:30pm. Dewick's lentil soup uses cumin the way my grandmother did.");
    });
});