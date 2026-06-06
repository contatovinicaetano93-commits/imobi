"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function TermosPage() {
  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #1B4FD8 0%, #1e40af 100%)" }}>
      {/* Header fixo */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3" style={{ background: "#1B4FD8", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <Link href="/cadastro">
          <button className="text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white/10 transition">
            ← Voltar
          </button>
        </Link>
        <span style={{ color: "white", fontWeight: 700 }}>imbobi</span>
        <div className="ml-auto h-1 w-6 rounded-full" style={{ backgroundColor: "#22c55e" }} />
      </div>

      <div className="max-w-3xl mx-auto p-4 pb-12">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="h-1.5 w-full" style={{ backgroundColor: "#16a34a" }} />
          <div className="p-6 sm:p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Termos de Serviço
          </h1>
          <p className="text-sm text-gray-500">
            Última atualização: {new Date().toLocaleDateString("pt-BR")}
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none text-gray-700">
          <h2 className="text-2xl font-semibold mt-8 mb-4">1. Aceitação dos Termos</h2>
          <p>
            Ao acessar e usar a plataforma imbobi, você aceita estar vinculado
            por estes Termos de Serviço e todas as políticas incorporadas por
            referência. Se não concordar com qualquer parte destes termos, você
            não pode usar nossos serviços.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">2. Descrição do Serviço</h2>
          <p>
            imbobi é uma plataforma digital que oferece:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Processamento de solicitações de crédito construtor</li>
            <li>
              Validação de identidade (KYC) e conformidade AML
            </li>
            <li>Rastreamento e validação de estágios de construção via GPS</li>
            <li>
              Liberação de fundos baseada em evidência de trabalho
            </li>
            <li>Dashboard de gerenciamento de projetos</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">3. Elegibilidade</h2>
          <p>Para usar imbobi, você deve:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Ter no mínimo 18 anos de idade</li>
            <li>Ser residente no Brasil</li>
            <li>Ter capacidade legal para contratar</li>
            <li>Fornecer informações precisas e completas</li>
            <li>
              Cumprir todas as leis, regulamentações e termos
              aplicáveis
            </li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">4. Criação de Conta</h2>
          <p>
            Você é responsável por manter a confidencialidade de suas
            credenciais de login. É sua responsabilidade:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Fornecer informações precisas ao registrar</li>
            <li>Manter sua senha segura</li>
            <li>Notificar-nos imediatamente de acesso não autorizado</li>
            <li>
              Aceitar responsabilidade por todas as atividades em sua
              conta
            </li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">5. Processo de Solicitação de Crédito</h2>
          <p>
            Ao solicitar crédito através imbobi, você compreende que:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>
              Suas informações serão processadas para análise de crédito
            </li>
            <li>
              Vamos realizar verificações KYC e conformidade AML
            </li>
            <li>
              A aprovação não é garantida e está sujeita aos nossos
              critérios de risco
            </li>
            <li>
              Você concede permissão para consultar score de crédito
              (bureaus)
            </li>
            <li>
              Histórico de crédito será compartilhado com lenders
              autorizados
            </li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">6. Validação de Obra & GPS</h2>
          <p>
            Você concorda em:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>
              Fornecer localização GPS precisa do projeto de
              construção
            </li>
            <li>
              Submeter fotos de evidência autênticas do progresso do
              trabalho
            </li>
            <li>
              Permitir que a geolocalização seja validada no servidor
              (não pode ser ignorada)
            </li>
            <li>
              Aceitar que falsificação de evidência resultará em
              rescisão imediata
            </li>
            <li>
              Não usar a plataforma para atividades fraudulentas ou
              ilegais
            </li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">7. Liberação de Fundos</h2>
          <p>
            A liberação de fundos é condicional a:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>
              Conclusão bem-sucedida de estágios de projeto
              pré-aprovados
            </li>
            <li>Validação de evidência (fotos + GPS) pelos gerentes</li>
            <li>Conformidade com Termos de Serviço</li>
            <li>
              Nenhuma investigação de fraude em andamento ou suspeita
            </li>
          </ul>
          <p>
            imbobi se reserva o direito de atrasar ou reter fundos se
            houver suspeita de fraude ou não conformidade.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">8. Gerenciador de Obra</h2>
          <p>
            Se você for um gerenciador de projeto:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Você é responsável pelas decisões de aprovação/rejeição</li>
            <li>
              Suas ações são auditadas e registradas para conformidade
            </li>
            <li>
              Você não deve aceitar subornos ou incentivos para
              aprovações falsas
            </li>
            <li>
              Você será pessoalmente responsável por fraude ou conluio
            </li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">9. Proibições</h2>
          <p>Você não deve:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Usar a plataforma para fraude ou atividades ilegais</li>
            <li>Hacker, modificar ou obter acesso não autorizado</li>
            <li>Falsificar fotos de evidência ou dados de GPS</li>
            <li>Assediar, ameaçar ou discriminar outros usuários</li>
            <li>Violar leis de proteção de dados ou privacidade</li>
            <li>Fazer spam, phishing ou atividades de malware</li>
            <li>
              Enviar informações falsas ou enganosas para aprovação
              de crédito
            </li>
            <li>
              Vender, transferir ou atribuir sua conta a terceiros
            </li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">10. Suspensão e Encerramento</h2>
          <p>
            imbobi pode suspender ou encerrar sua conta sem aviso prévio se:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>
              Você violar estes Termos de Serviço ou qualquer política
            </li>
            <li>Nós detectarmos atividade fraudulenta ou suspeita</li>
            <li>
              Você não cumprir regulamentações de crédito ou KYC
            </li>
            <li>
              Sua conta está em violação de lei ou regulação
              aplicável
            </li>
            <li>
              Você não responde a verificações de conformidade em
              tempo hábil
            </li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">11. Limitação de Responsabilidade</h2>
          <p>
            Na máxima extensão permitida por lei:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>
              imbobi não é responsável por danos indiretos, acidentais
              ou punitivos
            </li>
            <li>
              Nossa responsabilidade total não excede o valor que você
              pagou em 30 dias
            </li>
            <li>
              imbobi não garante aprovação de crédito ou liberação de
              fundos
            </li>
            <li>
              Você usa a plataforma por sua conta e risco
            </li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">12. Garantias de Isenção</h2>
          <p>
            A plataforma é fornecida "COMO ESTÁ" sem garantias de:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Disponibilidade contínua ou sem erros</li>
            <li>Precisão de cálculos de crédito ou score</li>
            <li>Segurança de transmissão de dados</li>
            <li>Conformidade com seus requisitos específicos</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">13. Conformidade Legal</h2>
          <p>
            imbobi operacionaliza em conformidade com:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018)</li>
            <li>Regulamentações de Prevenção de Lavagem de Dinheiro (AML)</li>
            <li>Conheça Seu Cliente (KYC)</li>
            <li>Leis de Crédito ao Consumidor e Proteção</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">14. Alterações nos Termos</h2>
          <p>
            imbobi pode modificar estes Termos a qualquer momento. Notificaremos você sobre mudanças materiais. O uso continuado após notificação
            constitui aceitação dos termos modificados.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">15. Lei Aplicável</h2>
          <p>
            Estes Termos são regidos pelas leis do Brasil. Qualquer disputa será resolvida nos tribunais brasileiros competentes.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">16. Contato</h2>
          <p>
            Para perguntas sobre estes Termos, entre em contato:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Email: legal@imbobi.com.br</li>
            <li>Suporte: support@imbobi.com.br</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-4">
            Ao usar imbobi, você concorda com estes Termos de Serviço e com nossa Política de Privacidade.
          </p>
          <Link href="/login">
            <button
              className="text-white font-bold py-2.5 px-6 rounded-xl text-sm hover:opacity-90 transition"
              style={{ backgroundColor: "#16a34a" }}
            >
              Voltar ao Login
            </button>
          </Link>
        </div>
        </div>{/* fecha p-6 */}
        </div>{/* fecha card */}
      </div>{/* fecha max-w-3xl */}
    </div>{/* fecha outer */}
  );
}
