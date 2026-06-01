import { Injectable } from "@nestjs/common";
import { SimuladorInput, SimuladorResult } from "@imbobi/schemas";

@Injectable()
export class SimuladorService {
  calcular(input: SimuladorInput): SimuladorResult {
    const ltv =
      {
        TERRENO: 0.7,
        CONSTRUCAO: 0.8,
        ACABAMENTO: 0.85,
        COMPRADOR: 0.8,
      }[input.tipoObra] || 0.75;

    const taxaAno =
      {
        TERRENO: 0.12,
        CONSTRUCAO: 0.1,
        ACABAMENTO: 0.09,
        COMPRADOR: 0.11,
      }[input.tipoObra] || 0.1;

    const valorMaximoFinanciavel = input.valorEmpreendimento * ltv;
    const taxaMensal = taxaAno / 12;
    const numParcelas = input.prazo;

    const fator =
      (Math.pow(1 + taxaMensal, numParcelas) - 1) /
      (taxaMensal * Math.pow(1 + taxaMensal, numParcelas));
    const parcelaMedia = valorMaximoFinanciavel / fator;

    return {
      valorMaximoFinanciavel: Math.round(valorMaximoFinanciavel),
      parcelaMedia: Math.round(parcelaMedia),
      taxaMensal: (taxaMensal * 100).toFixed(2),
      taxaAno: (taxaAno * 100).toFixed(2),
      ltv: (ltv * 100).toFixed(0),
      totalJuros: Math.round(
        parcelaMedia * numParcelas - valorMaximoFinanciavel,
      ),
    };
  }
}
