"use client";

import { useEffect, useRef } from "react";

export type ScoreHistory = {
  data: string;
  score: number;
  motivo: string;
};

type ScoreDynamicsProps = {
  historia: ScoreHistory[];
  scoreAtual: number;
};

function getScoreColor(score: number) {
  if (score >= 800) return { bg: "bg-green-100", text: "text-green-700", bar: "bg-green-500" };
  if (score >= 700) return { bg: "bg-blue-100", text: "text-blue-700", bar: "bg-blue-500" };
  if (score >= 600) return { bg: "bg-yellow-100", text: "text-yellow-700", bar: "bg-yellow-500" };
  return { bg: "bg-red-100", text: "text-red-700", bar: "bg-red-500" };
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", {
    month: "short",
    day: "numeric",
  });
}

export function ScoreDynamics({ historia, scoreAtual }: ScoreDynamicsProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || historia.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const padding = 40;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;

    // Clear canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const y = padding + (height / 10) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.stroke();

      // Score labels
      const scoreLabel = 1000 - i * 100;
      ctx.fillStyle = "#9ca3af";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(scoreLabel.toString(), padding - 10, y + 4);
    }

    // Draw line chart
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.beginPath();

    const points = historia.map((h, i) => ({
      x: padding + (width / (historia.length - 1 || 1)) * i,
      y: padding + height - (h.score / 1000) * height,
      score: h.score,
    }));

    points.forEach((point, i) => {
      if (i === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });

    ctx.stroke();

    // Draw points
    ctx.fillStyle = "#3b82f6";
    points.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      ctx.fill();

      // Circle border
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw highlight for current score
    const currentPoint = points[points.length - 1];
    if (currentPoint) {
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(currentPoint.x, currentPoint.y, 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [historia]);

  const colors = getScoreColor(scoreAtual);
  const _minScore = Math.min(...historia.map((h) => h.score));
  const _maxScore = Math.max(...historia.map((h) => h.score));
  const trend =
    historia.length >= 2
      ? historia[historia.length - 1].score - historia[0].score
      : 0;

  return (
    <div className="space-y-6">
      {/* Current Score */}
      <div className={`rounded-2xl border p-6 ${colors.bg}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Score Atual</p>
            <p className={`text-4xl font-bold ${colors.text}`}>{scoreAtual}</p>
          </div>

          <div className="text-right">
            <p className="text-sm font-medium text-gray-700 mb-2">Tendência</p>
            <div className="flex items-center gap-2">
              <span
                className={`text-2xl font-bold ${
                  trend >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {trend >= 0 ? "+" : ""}{trend}
              </span>
              <span className="text-xl">
                {trend >= 0 ? "📈" : "📉"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      {historia.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Evolução do Score</h3>
          <div ref={chartRef} className="w-full overflow-x-auto">
            <canvas
              ref={canvasRef}
              width={600}
              height={300}
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Histórico</h3>
        <div className="space-y-3">
          {historia.map((item, index) => {
            const itemColors = getScoreColor(item.score);
            const previous =
              index > 0 ? historia[index - 1].score : item.score;
            const change = item.score - previous;

            return (
              <div
                key={index}
                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">
                      {item.score}
                    </span>
                    {index !== 0 && (
                      <span
                        className={`text-xs font-semibold ${
                          change >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {change >= 0 ? "+" : ""}{change}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{item.motivo}</p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-500 mb-1">
                    {formatDate(item.data)}
                  </p>
                  <div className={`inline-block px-2 py-1 rounded text-xs font-semibold ${itemColors.bg} ${itemColors.text}`}>
                    {item.score >= 800
                      ? "Excelente"
                      : item.score >= 700
                        ? "Bom"
                        : item.score >= 600
                          ? "Médio"
                          : "Baixo"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
