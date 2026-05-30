import { NextRequest, NextResponse } from "next/server";

type TipoObra = "TERRENO" | "CONSTRUCAO" | "ACABAMENTO" | "COMPRADOR";

export async function POST(req: NextRequest) {
  const { valorEmpreendimento, tipoObra, prazo } = await req.json() as {
    valorEmpreendimento: number;
    tipoObra: TipoObra;
    prazo: number;
  };

  const ltvMap: Record<TipoObra, number> = {
    TERRENO: 0.7,
    CONSTRUCAO: 0.8,
    ACABAMENTO: 0.85,
    COMPRADOR: 0.8,
  };

  const taxaAnoMap: Record<TipoObra, number> = {
    TERRENO: 0.12,
    CONSTRUCAO: 0.1,
    ACABAMENTO: 0.09,
    COMPRADOR: 0.11,
  };

  const ltv = ltvMap[tipoObra];
  const taxaAnoRate = taxaAnoMap[tipoObra];
  const valorMaximoFinanciavel = valorEmpreendimento * ltv;
  const taxaMensal = taxaAnoRate / 12;
  const numParcelas = prazo;

  const fator = (Math.pow(1 + taxaMensal, numParcelas) - 1) / (taxaMensal * Math.pow(1 + taxaMensal, numParcelas));
  const parcelaMedia = valorMaximoFinanciavel / fator;

  return NextResponse.json({
    valorMaximoFinanciavel: Math.round(valorMaximoFinanciavel),
    parcelaMedia: Math.round(parcelaMedia),
    taxaMensal: (taxaMensal * 100).toFixed(2),
    taxaAno: (taxaAnoRate * 100).toFixed(2),
    ltv: (ltv * 100).toFixed(0),
    totalJuros: Math.round((parcelaMedia * numParcelas) - valorMaximoFinanciavel),
  });
}
