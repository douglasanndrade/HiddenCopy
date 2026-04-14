export const PLANS = [
  { id: "teste", name: "Teste", credits: 5, price: 79.9 },
  { id: "basico", name: "Básico", credits: 10, price: 139.9 },
  { id: "pro", name: "Pro", credits: 50, price: 349.9 },
] as const;

export type PlanId = (typeof PLANS)[number]["id"];

export function getPlan(id: string) {
  return PLANS.find((p) => p.id === id);
}
