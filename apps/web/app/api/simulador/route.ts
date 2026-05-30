import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { valorEmpreendimento, tipoObra, prazo } = await req.json();

  const ltv = {
    TERRENO: 0.7,
    CONSTRUCAO: 0.8,
    ACABAMENTO: 0.85,
    COMPRADOR: 0.8,
  }[tipoObra] || 0.75;

  const taxaAno = {
    TERRENO: 0.12,
    CONSTRUCAO: 0.1,
    ACABAMENTO: 0.09,
    COMPRADOR: 0.11,
  }[tipoObra] || 0.1;

  const valorMaximoFinanciavel = valorEmpreendimento * ltv;
  const taxaMensal = taxaAno / 12;
  const numParcelas = prazo;

  const fator = (Math.pow(1 + taxaMensal, numParcelas) - 1) / (taxaMensal * Math.pow(1 + taxaMensal, numParcelas));
  const parcelaMedia = valorMaximoFinanciavel / fator;

  return NextResponse.json({
    valorMaximoFinanciavel: Math.round(valorMaximoFinanciavel),
    parcelaMedia: Math.round(parcelaMedia),
    taxaMensal: (taxaMensal * 100).toFixed(2),
    taxaAno: (taxaAno * 100).toFixed(2),
    ltv: (ltv * 100).toFixed(0),
    totalJuros: Math.round((parcelaMedia * numParcelas) - valorMaximoFinanciavel),
  });
}
