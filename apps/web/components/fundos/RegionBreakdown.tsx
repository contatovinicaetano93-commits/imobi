import { mockRegionPerformance } from "@/lib/fundos-mock-data";
import { formatarBRL } from "@imbobi/core";

export function RegionBreakdown() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {mockRegionPerformance.map((region) => (
        <div key={region.region} className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{region.region}</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600">Portfolio</span>
                <span className="text-sm font-bold text-gray-900">
                  {formatarBRL(region.portfolio)}
                </span>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600">Obras</span>
                <span className="text-sm font-bold text-gray-900">{region.works}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600">ROI Realizado</span>
                <span className="text-sm font-bold text-green-600">
                  {(region.roi * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Inadimplência</span>
                <span className="text-sm font-bold text-orange-600">
                  {(region.defaultRate * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
