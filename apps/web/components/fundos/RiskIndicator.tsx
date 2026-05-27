import { riskLevels } from "@/lib/fundos-mock-data";

interface RiskIndicatorProps {
  score: number;
}

export function RiskIndicator({ score }: RiskIndicatorProps) {
  const level = riskLevels[score as keyof typeof riskLevels] || riskLevels[3];

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${level.color}`}>
      {level.badge} {level.label}
    </span>
  );
}
