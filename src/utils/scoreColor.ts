export function getColorForScore(score: number): string {
  if (score >= 95) return '#14532d'; // green-900
  if (score >= 90) return '#166534'; // green-800
  if (score >= 85) return '#15803d'; // green-700
  if (score >= 80) return '#16a34a'; // green-600
  if (score >= 75) return '#22c55e'; // green-500
  if (score >= 70) return '#ca8a04'; // yellow-600
  if (score >= 65) return '#eab308'; // yellow-500
  if (score >= 50) return '#facc15'; // yellow-400
  if (score >= 30) return '#f97316'; // orange-500
  if (score >= 10) return '#b45309'; // amber-700
  return '#78350f'; // amber-900
}
