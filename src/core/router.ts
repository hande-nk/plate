/*
 Per-item router. Every item in a photo goes down exactly one path:
   plate          Carm or Dewick, matched against today's menu
   hodgdon-box    Hodgdon to-go box, matched against Hodgdon's menu
   tufts-packaged Grab-and-go item with a Tufts sticker, look up by name
   outside-snack  Anything with a full nutrition label, read the label
   app-order      Food ordered from UberEats or DoorDash
 Signals are cheap ones the phone already has. Decide in this order of trust:
   1. a nutrition label (it's the most exact source)
   2. a Tufts sticker
   3. the hall you're in + what the container looks like
*/

export type Hall = "carm" | "dewick" | "hodge" | "kindlevan" | "outside";
export type Route = "plate" | "hodgdon-box" | "tufts-packaged" | "outside-snack" | "app-order";

export interface ItemSignals {
  hasNutritionLabel: boolean;   // OCR found "Nutrition Facts" or "Calories"
  hasTuftsSticker: boolean;     // OCR found "Tufts Dining"
  container: "plate" | "box" | "wrapper" | "unknown" | "app";
  hall: Hall | null;            // from time + last check-in, may be null
}

export interface RouteDecision {
  route: Route;
  /** True when signals were thin and the app should ask with one tap. */
  confirm: boolean;
}

export function routeItem(s: ItemSignals): RouteDecision {
  //confirm tells the screen whether to double-check the route with you before logging
  if(s.hasNutritionLabel) {
    return { route: "outside-snack", confirm: false };
  } 
  
  if(s.hasTuftsSticker) {
    return { route: "tufts-packaged", confirm: false };
  }

  const diningHall = s.hall === "carm" || s.hall === "dewick";
  if(s.container === "plate" && diningHall) {
    return { route: "plate", confirm: false };
  }

  
  if(s.container === "box" && s.hall === "hodge") {
    return { route: "hodgdon-box", confirm: false };
  }

  if(s.container === "app") {
    return { route: "app-order", confirm: true };
  }

  if(s.container === "box") {
    return { route: "hodgdon-box", confirm: true };
  }

  if(s.container === "wrapper") {
    return { route: "tufts-packaged", confirm: true };
  }

  return { route: "plate", confirm: true };
}
