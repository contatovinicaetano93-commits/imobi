"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { Loader2, CheckCircle } from "lucide-react";

const BANKS: Record<string, string> = {
  "001": "Banco do Brasil",
  "033": "Banco Santander",
  "104": "Caixa Econômica Federal",
  "237": "Bradesco",
  "341": "Itau",
  "422": "Banco Safra",
  "633": "Banco Bradesco BBI",
  "654": "Banco Banco Daycoval",
  "655": "Banco Votorantim",
  "748": "Banco BRB",
  "756": "Banco do Cooperativo",
  "760": "Banco Victoria",
  "842": "Banco Credilibro",
  "860": "BanBajaj",
  "999": "Outro",
};

const ACCOUNT_TYPES = {
  CORRENTE: "Conta Corrente",
  POUPANCA: "Conta Poupança",
  SALARIO: "Conta Salário",
};

interface BankAccountData {
  banco: string;
  agencia: string;
  agenciaDv?: string;
  conta: string;
  contaDv?: string;
  tipoConta: "CORRENTE" | "POUPANCA" | "SALARIO";
  titularNome: string;
  titularCpf: string;
}

interface Errors {
  [key: string]: string;
}

export function BankAccountForm() {
  const router = useRouter();
  const toast = useToast();

  const [formState, setFormState] = useState<BankAccountData>({
    banco: "001",
    agencia: "",
    agenciaDv: "",
    conta: "",
    contaDv: "",
    tipoConta: "CORRENTE",
    titularNome: "",
    titularCpf: "",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [success, setSuccess] = useState(false);
  const [existingData, setExistingData] = useState<Partial<BankAccountData> | null>(null);

  // Load existing data on mount
  useEffect(() => {
    const loadBankData = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
        const token = localStorage.getItem("access_token");

        const response = await fetch(`${API_URL}/usuarios/me/conta-bancaria`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data) {
            setExistingData(data);
            setFormState((prev) => ({ ...prev, ...data }));
          }
        }
      } catch (error) {
        console.error("Error loading bank data:", error);
      }
    };

    loadBankData();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Errors = {};

    if (!formState.banco) {
      newErrors.banco = "Banco é obrigatório";
    }

    if (!formState.agencia || formState.agencia.length < 4) {
      newErrors.agencia = "Agência deve ter no mínimo 4 dígitos";
    }

    if (!formState.conta || formState.conta.length < 5) {
      newErrors.conta = "Conta deve ter no mínimo 5 dígitos";
    }

    if (!formState.tipoConta) {
      newErrors.tipoConta = "Tipo de conta é obrigatório";
    }

    if (!formState.titularNome || formState.titularNome.length < 3) {
      newErrors.titularNome = "Nome do titular é obrigatório";
    }

    if (!formState.titularCpf) {
      newErrors.titularCpf = "CPF do titular é obrigatório";
    } else {
      const cpf = formState.titularCpf.replace(/\D/g, "");
      if (cpf.length !== 11) {
        newErrors.titularCpf = "CPF deve ter 11 dígitos";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
      const token = localStorage.getItem("access_token");

      const response = await fetch(`${API_URL}/usuarios/me/conta-bancaria`, {
        method: existingData ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          banco: formState.banco,
          agencia: formState.agencia,
          agenciaDv: formState.agenciaDv || undefined,
          conta: formState.conta,
          contaDv: formState.contaDv || undefined,
          tipoConta: formState.tipoConta,
          titularNome: formState.titularNome,
          titularCpf: formState.titularCpf.replace(/\D/g, ""),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(
          data.message || "Falha ao salvar dados bancários"
        );
        return;
      }

      setSuccess(true);
      toast.success("Dados bancários salvos com sucesso!");

      setTimeout(() => {
        router.push("/dashboard/perfil");
      }, 2000);
    } catch (error) {
      console.error("Error saving bank account:", error);
      toast.error("Erro ao salvar dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 rounded-2xl border border-green-200 p-8 text-center">
        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-green-900 mb-2">
          Dados bancários salvos!
        </h3>
        <p className="text-sm text-green-800 mb-6">
          Você será redirecionado para seu perfil em alguns segundos...
        </p>
        <a
          href="/dashboard/perfil"
          className="inline-block text-sm font-semibold text-green-700 hover:text-green-800"
        >
          Ir para perfil agora →
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6"
    >
      {/* Titular Info */}
      <div className="space-y-4 pb-6 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Titular da Conta</h3>

        {/* Titular Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Nome Completo
          </label>
          <input
            type="text"
            name="titularNome"
            value={formState.titularNome}
            onChange={handleChange}
            className={`w-full px-4 py-2.5 rounded-lg border ${
              errors.titularNome ? "border-red-300" : "border-gray-200"
            } bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            placeholder="João da Silva"
            disabled={loading}
          />
          {errors.titularNome && (
            <p className="text-sm text-red-600 mt-1">{errors.titularNome}</p>
          )}
        </div>

        {/* Titular CPF */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            CPF
          </label>
          <input
            type="text"
            name="titularCpf"
            value={formState.titularCpf}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "").slice(0, 11);
              setFormState((prev) => ({ ...prev, titularCpf: value }));
              if (errors.titularCpf) {
                setErrors((prev) => {
                  const newErrors = { ...prev };
                  delete newErrors.titularCpf;
                  return newErrors;
                });
              }
            }}
            className={`w-full px-4 py-2.5 rounded-lg border ${
              errors.titularCpf ? "border-red-300" : "border-gray-200"
            } bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            placeholder="123.456.789-10"
            disabled={loading}
            maxLength={11}
          />
          {errors.titularCpf && (
            <p className="text-sm text-red-600 mt-1">{errors.titularCpf}</p>
          )}
        </div>
      </div>

      {/* Bank Selection */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Banco
          </label>
          <select
            name="banco"
            value={formState.banco}
            onChange={handleChange}
            className={`w-full px-4 py-2.5 rounded-lg border ${
              errors.banco ? "border-red-300" : "border-gray-200"
            } bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            disabled={loading}
          >
            <option value="">Selecione um banco</option>
            {Object.entries(BANKS).map(([code, name]) => (
              <option key={code} value={code}>
                {code} - {name}
              </option>
            ))}
          </select>
          {errors.banco && (
            <p className="text-sm text-red-600 mt-1">{errors.banco}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Tipo de Conta
          </label>
          <select
            name="tipoConta"
            value={formState.tipoConta}
            onChange={handleChange}
            className={`w-full px-4 py-2.5 rounded-lg border ${
              errors.tipoConta ? "border-red-300" : "border-gray-200"
            } bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            disabled={loading}
          >
            {Object.entries(ACCOUNT_TYPES).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
          {errors.tipoConta && (
            <p className="text-sm text-red-600 mt-1">{errors.tipoConta}</p>
          )}
        </div>
      </div>

      {/* Agency and Account */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Dados da Conta</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Agência
            </label>
            <input
              type="text"
              name="agencia"
              value={formState.agencia}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 5);
                setFormState((prev) => ({ ...prev, agencia: value }));
                if (errors.agencia) {
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.agencia;
                    return newErrors;
                  });
                }
              }}
              className={`w-full px-4 py-2.5 rounded-lg border ${
                errors.agencia ? "border-red-300" : "border-gray-200"
              } bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              placeholder="1234"
              disabled={loading}
              maxLength={5}
            />
            {errors.agencia && (
              <p className="text-sm text-red-600 mt-1">{errors.agencia}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              DV da Agência (opcional)
            </label>
            <input
              type="text"
              name="agenciaDv"
              value={formState.agenciaDv}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 1);
                setFormState((prev) => ({ ...prev, agenciaDv: value }));
              }}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="X"
              disabled={loading}
              maxLength={1}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Conta
            </label>
            <input
              type="text"
              name="conta"
              value={formState.conta}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 12);
                setFormState((prev) => ({ ...prev, conta: value }));
                if (errors.conta) {
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.conta;
                    return newErrors;
                  });
                }
              }}
              className={`w-full px-4 py-2.5 rounded-lg border ${
                errors.conta ? "border-red-300" : "border-gray-200"
              } bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              placeholder="123456789"
              disabled={loading}
              maxLength={12}
            />
            {errors.conta && (
              <p className="text-sm text-red-600 mt-1">{errors.conta}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              DV da Conta (opcional)
            </label>
            <input
              type="text"
              name="contaDv"
              value={formState.contaDv}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 1);
                setFormState((prev) => ({ ...prev, contaDv: value }));
              }}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="X"
              disabled={loading}
              maxLength={1}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-100">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "Salvando..." : "Salvar Dados Bancários"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard/perfil")}
          className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 disabled:opacity-50 transition-colors"
          disabled={loading}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
