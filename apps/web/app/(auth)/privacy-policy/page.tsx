"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #1B4FD8 0%, #1e40af 100%)" }}>
      {/* Header fixo */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3" style={{ background: "#1B4FD8", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <Link href="/cadastro">
          <button className="text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white/10 transition">
            ← Voltar
          </button>
        </Link>
        <span style={{ color: "white", fontWeight: 700 }}>Imobi</span>
        <div className="ml-auto h-1 w-6 rounded-full" style={{ backgroundColor: "#22c55e" }} />
      </div>

      <div className="max-w-3xl mx-auto p-4 pb-12">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="h-1.5 w-full" style={{ backgroundColor: "#16a34a" }} />
          <div className="p-6 sm:p-8">
          <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Política de Privacidade
          </h1>
          <p className="text-sm text-gray-500">
            Última atualização: {new Date().toLocaleDateString("pt-BR")}
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none text-gray-700">
          <h2 className="text-2xl font-semibold mt-8 mb-4">1. Introdução</h2>
          <p>
            A Imobi ("Empresa") está comprometida com a proteção de seus dados
            pessoais. Esta Política de Privacidade explica como coletamos,
            usamos, compartilhamos e protegemos suas informações quando você
            usa nossos serviços.
          </p>
          <p>
            A Imobi opera em conformidade com a Lei Geral de Proteção de Dados
            (LGPD - Lei nº 13.709/2018) e regulamentações aplicáveis.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">
            2. Informações Que Coletamos
          </h2>
          <p>Coletamos as seguintes categorias de dados pessoais:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>
              <strong>Informações de Identificação:</strong> Nome completo, CPF,
              data de nascimento
            </li>
            <li>
              <strong>Informações de Contato:</strong> Email, telefone, endereço
            </li>
            <li>
              <strong>Dados de Localização:</strong> Coordenadas GPS coletadas
              durante validação de obra (com sua permissão)
            </li>
            <li>
              <strong>Documentos de KYC:</strong> Cópias de documentos de
              identidade, selfies, comprovante de residência
            </li>
            <li>
              <strong>Dados de Crédito:</strong> Informações sobre solicitações
              de crédito, aprovações e histórico
            </li>
            <li>
              <strong>Dados de Obra:</strong> Fotos de evidência,
              características do imóvel, progresso de construção
            </li>
            <li>
              <strong>Tokens de Notificação:</strong> Firebase Cloud Messaging
              tokens para notificações push
            </li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">
            3. Base Legal Para Processamento
          </h2>
          <p>
            Processamos seus dados pessoais com base nas seguintes bases
            legais:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>
              <strong>Cumprimento de Contrato:</strong> Para executar nossos
              serviços de crédito e validação de obra
            </li>
            <li>
              <strong>Consentimento:</strong> Para fins adicionais como
              marketing e pesquisas
            </li>
            <li>
              <strong>Cumprimento de Obrigação Legal:</strong> Para KYC,
              prevenção de fraude e conformidade regulatória
            </li>
            <li>
              <strong>Interesse Legítimo:</strong> Para melhorar nossos serviços
              e segurança
            </li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">
            4. Como Usamos Seus Dados
          </h2>
          <p>Utilizamos suas informações para:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Processar sua solicitação de crédito</li>
            <li>Validar sua identidade e localização (KYC)</li>
            <li>
              Verificar conformidade com regulamentações de prevenção de fraude
            </li>
            <li>Calcular seu score de construtibilidade</li>
            <li>Gerenciar e acompanhar obras conectadas ao crédito</li>
            <li>Enviar notificações sobre status de crédito ou obra</li>
            <li>Melhorar e personalizar nossos serviços</li>
            <li>Cumprir obrigações legais e regulatórias</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">
            5. Compartilhamento de Dados
          </h2>
          <p>
            Compartilhamos seus dados com os seguintes tipos de terceiros,
            quando necessário:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>
              <strong>Provedores de Serviço:</strong> AWS (armazenamento), Redis
              (cache), Sentry (monitoramento), SendGrid (emails)
            </li>
            <li>
              <strong>Instituições Financeiras:</strong> Para processamento de
              crédito e conformidade AML
            </li>
            <li>
              <strong>Serviços de KYC:</strong> Unico e SERPRO para validação de
              identidade
            </li>
            <li>
              <strong>Gestores de Obra:</strong> Para fins de validação de etapas
            </li>
            <li>
              <strong>Autoridades Legais:</strong> Quando requerido por lei ou
              para prevenir fraude
            </li>
          </ul>
          <p>
            Não compartilhamos seus dados para marketing direto sem seu
            consentimento explícito.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">
            6. Retenção de Dados
          </h2>
          <p>Mantemos seus dados pessoais pelos seguintes períodos:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>
              <strong>Usuários Ativos:</strong> Enquanto a conta estiver ativa
            </li>
            <li>
              <strong>Contas Encerradas:</strong> 90 dias após exclusão da conta
              (permitindo recuperação)
            </li>
            <li>
              <strong>Documentos KYC:</strong> 5 anos (requisito legal AML)
            </li>
            <li>
              <strong>Logs de Auditoria:</strong> 7 anos (conformidade legal)
            </li>
            <li>
              <strong>Dados de Crédito:</strong> Período ativo do contrato + 5
              anos
            </li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">
            7. Seus Direitos
          </h2>
          <p>Sob a LGPD, você tem direito a:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>
              <strong>Acessar:</strong> Solicitar uma cópia de seus dados
              pessoais
            </li>
            <li>
              <strong>Corrigir:</strong> Atualizar informações imprecisas ou
              incompletas
            </li>
            <li>
              <strong>Deletar:</strong> Solicitar exclusão de seus dados
              (sujeito a exceções legais)
            </li>
            <li>
              <strong>Portar:</strong> Receber seus dados em formato estruturado
              e transferível
            </li>
            <li>
              <strong>Revogar Consentimento:</strong> Retirar consentimento para
              processamento futuro
            </li>
            <li>
              <strong>Optar:</strong> Recusar certos tipos de processamento (ex:
              marketing)
            </li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">
            8. Segurança de Dados
          </h2>
          <p>
            Implementamos medidas técnicas e organizacionais para proteger seus
            dados:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>
              Criptografia de dados em trânsito (HTTPS/TLS) e em repouso
            </li>
            <li>Autenticação JWT com 15 minutos de expiração</li>
            <li>
              Hash de senhas com bcrypt (12 rounds) - irreversível
            </li>
            <li>Validação de GPS no servidor (incontornável)</li>
            <li>Controle de acesso baseado em função (RBAC)</li>
            <li>Monitoramento via Sentry para detecção de anomalias</li>
            <li>Headers de segurança (CSP, HSTS, X-Frame-Options)</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">
            9. Cookies e Rastreamento
          </h2>
          <p>
            Usamos cookies e tokens de sessão para autenticação. Não usamos
            cookies de rastreamento. Você pode desabilitar cookies em seu
            navegador, mas pode afetar a funcionalidade.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">
            10. Alterações Esta Política
          </h2>
          <p>
            Podemos atualizar esta política ocasionalmente. Notificaremos você
            sobre mudanças materiais via email ou dentro do aplicativo.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">11. Contato</h2>
          <p>
            Se você tiver dúvidas sobre esta política ou seus direitos, entre
            em contato:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Email: privacidade@imbobi.com.br</li>
            <li>Endereço: [Adicionar endereço legal da empresa]</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">
            12. Encarregado de Proteção de Dados
          </h2>
          <p>
            Nossa equipe de conformidade está disponível para consultas sobre
            LGPD:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Email DPO: dpo@imbobi.com.br</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-4">
            Ao usar Imobi, você concorda com esta Política de Privacidade.
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
    </div>
  );
}
