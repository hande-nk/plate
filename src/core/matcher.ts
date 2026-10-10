/*
 Dish matcher scoring: the ML part.
 The model (CLIP) gives a similarity between the photo and each menu dish name.
 You turn those into probabilities, then mix in what you usually eat:

   P(dish | photo)  ~  softmax(sim / T)[dish]  x  prior[dish]^alpha

 prior comes from your own logs (how often you picked each dish).
 Dishes you've never logged get a small floor `epsilon` so they can still win.
 Normalize at the end so the result sums to 1, highest first.
*/

export interface ScoredDish { dishId: string; p: number }

export interface ScoreOptions {
  temperature?: number;  // default 0.01 (CLIP similarities are close together)
  alpha?: number;        // prior weight, default 0.5. 0 = ignore your history
  epsilon?: number;      // prior floor for unseen dishes, default 0.02
}

/** sims: similarity per dish on TODAY'S menu. prior: your history (need not sum to 1). */
export function scoreDishes(
  sims: Record<string, number>,
  prior: Record<string, number>,
  opts?: ScoreOptions,
): ScoredDish[] {

  //A small T means the top dish gets most of the probability
  const temperature = opts?.temperature ?? 0.01;
  //alpha = 0 means everything to the power 0, which is 1, so history is ignored.
  const alpha = opts?.alpha ?? 0.5;
  //A dish you’ve never logged gets the floor epsilon = 0.02, so new dishes can still win.
  const epsilon = opts?.epsilon ?? 0.02;

  const ids = Object.keys(sims); //what object, today's menu
  const scaled = ids.map(id => sims[id] / temperature); //scale by T
  const max = Math.max(...scaled);

  const raw = ids.map((id, i) => ({
    dishId: id,
    p: Math.exp(scaled[i] - max) * Math.pow(prior[id] ?? epsilon, alpha)
  }));

  const sum = raw.reduce((a, b) => a + b.p, 0);
  return raw
    .map(d => ({ ...d, p: d.p / sum }))
    .sort((a, b) => b.p - a.p); // highest first
  
}

/**
 * Personal prior from past logs: count each dish, add-one smoothing over `menu`,
 * normalize. Only dishes in `menu` appear in the output.
 */
export function buildPrior(loggedDishIds: string[], menu: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const id of loggedDishIds) {
    if (menu.includes(id)) {
      counts[id] = (counts[id] ?? 0) + 1;
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0) + menu.length; //add-one smoothing
  
  const prior: Record<string, number> = {};
  for (const id of menu) {
      prior[id] = ((counts[id] ?? 0) + 1) / total;
  }
  return prior;
}
