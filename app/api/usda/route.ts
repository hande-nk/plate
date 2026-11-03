// T29. GET /api/usda?q=chicken%20cutlet -> up to 6 slim USDA FoodData Central results.
// The data.gov key stays on the server (USDA_API_KEY, a Vercel Secret, never NEXT_PUBLIC).
// Only signed-in Plate users can call it: the request must carry their Supabase access token.
// Values from the search endpoint are per 100 g. USDA data is public domain (CC0).

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { UsdaFood } from "@/core/estimate";

export const runtime = "nodejs";

type FdcNutrient = { nutrientNumber?: string; nutrientId?: number; value?: number };
type FdcFood = {
  fdcId: number; description: string; dataType: string; brandOwner?: string; brandName?: string;
  servingSize?: number; servingSizeUnit?: string; foodNutrients?: FdcNutrient[];
};

// Energy (kcal) 208 / 1008, protein 203 / 1003, fat 204 / 1004, carbs 205 / 1005.
function nutrient(f: FdcFood, num: string, id: number): number | null {
  const n = f.foodNutrients?.find((x) => x.nutrientNumber === num || x.nutrientId === id);
  return typeof n?.value === "number" ? n.value : null;
}

export async function GET(req: Request) {
  const key = process.env.USDA_API_KEY;
  if (!key) return NextResponse.json({ error: "USDA_API_KEY is not set" }, { status: 500 });

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  const { data: user, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user.user) return NextResponse.json({ error: "sign in first" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 80);
  if (!q) return NextResponse.json({ error: "q is required" }, { status: 400 });

  const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: q, pageSize: 12, dataType: ["Branded", "Survey (FNDDS)", "SR Legacy", "Foundation"] }),
    next: { revalidate: 60 * 60 * 24 * 7 },   // the same search is cached for a week
  });
  if (!res.ok) return NextResponse.json({ error: `USDA said ${res.status}` }, { status: 502 });
  const data = (await res.json()) as { foods?: FdcFood[] };

  const foods: UsdaFood[] = (data.foods ?? []).map((f): UsdaFood | null => {
    const kcal = nutrient(f, "208", 1008);
    if (kcal === null) return null;
    const grams = f.servingSizeUnit && /^(g|grm)$/i.test(f.servingSizeUnit) && f.servingSize ? f.servingSize : null;
    return {
      fdcId: f.fdcId,
      name: f.description,
      brand: f.brandName ?? f.brandOwner ?? null,
      kind: f.dataType === "Branded" ? "branded" : "generic",
      per100g: { kcal, protein: nutrient(f, "203", 1003), carbs: nutrient(f, "205", 1005), fat: nutrient(f, "204", 1004) },
      servingG: grams,
    };
  }).filter((x): x is UsdaFood => x !== null).slice(0, 6);

  return NextResponse.json({ foods });
}