"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

function calculatePasswordStrength(password: string): PasswordStrength {
  let score = 0;

  // Length checks
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Character variety checks
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;

  const strengthMap: Record<number, PasswordStrength> = {
    0: { score: 0, label: "Muito fraca", color: "text-red-600" },
    1: { score: 1, label: "Fraca", color: "text-orange-600" },
    2: { score: 2, label: "Razoável", color: "text-yellow-600" },
    3: { score: 3, label: "Boa", color: "text-lime-600" },
    4: { score: 4, label: "Forte", color: "text-green-600" },
    5: { score: 5, label: "Muito forte", color: "text-green-700" },
    6: { score: 6, label: "Excelente", color: "text-green-700" },
  };

  return strengthMap[score] || strengthMap[0];
}

export function ChangePasswordForm() {
  const router = useRouter();
  const toast = useToast();

  const [formState, setFormState] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const passwordStrength = calculatePasswordStrength(formState.newPassword);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formState.currentPassword) {
      newErrors.currentPassword = "Senha atual é obrigatória";
    }

    if (!formState.newPassword) {
      newErrors.newPassword = "Nova senha é obrigatória";
    } else if (formState.newPassword.length < 8) {
      newErrors.newPassword = "Senha deve ter no mínimo 8 caracteres";
    } else if (passwordStrength.score < 3) {
      newErrors.newPassword = "Senha é muito fraca. Use maiúsculas, minúsculas, números e símbolos";
    }

    if (formState.newPassword !== formState.confirmPassword) {
      newErrors.confirmPassword = "As senhas não conferem";
    }

    if (formState.currentPassword === formState.newPassword) {
      newErrors.newPassword = "Nova senha deve ser diferente da atual";
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

      const response = await fetch(`${API_URL}/usuarios/me/seguranca/alterar-senha`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          senhaAtual: formState.currentPassword,
          novaSenha: formState.newPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = data.message || "Falha ao alterar senha";

        if (response.status === 400) {
          if (message.includes("atual")) {
            setErrors({ currentPassword: "Senha atual incorreta" });
          } else {
            toast.error(message);
          }
        } else {
          toast.error(message);
        }
        return;
      }

      setSuccess(true);
      setFormState({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Senha alterada com sucesso!");

      // Redirect after success
      setTimeout(() => {
        router.push("/dashboard/perfil");
      }, 2000);
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Erro ao alterar senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 rounded-2xl border border-green-200 p-8 text-center">
        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-green-900 mb-2">Senha alterada com sucesso!</h3>
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
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
      {/* Current Password */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Senha Atual</label>
        <div className="relative">
          <input
            type={showPasswords.current ? "text" : "password"}
            name="currentPassword"
            value={formState.currentPassword}
            onChange={handleChange}
            className={`w-full px-4 py-2.5 rounded-lg border ${
              errors.currentPassword ? "border-red-300" : "border-gray-200"
            } bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            placeholder="Digite sua senha atual"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() =>
              setShowPasswords((prev) => ({
                ...prev,
                current: !prev.current,
              }))
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            disabled={loading}
          >
            {showPasswords.current ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
        {errors.currentPassword && (
          <p className="text-sm text-red-600 mt-1">{errors.currentPassword}</p>
        )}
      </div>

      {/* New Password */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Nova Senha</label>
        <div className="relative">
          <input
            type={showPasswords.new ? "text" : "password"}
            name="newPassword"
            value={formState.newPassword}
            onChange={handleChange}
            className={`w-full px-4 py-2.5 rounded-lg border ${
              errors.newPassword ? "border-red-300" : "border-gray-200"
            } bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            placeholder="Digite uma nova senha"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() =>
              setShowPasswords((prev) => ({
                ...prev,
                new: !prev.new,
              }))
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            disabled={loading}
          >
            {showPasswords.new ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Password Strength Indicator */}
        {formState.newPassword && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    passwordStrength.score === 0
                      ? "w-0"
                      : passwordStrength.score === 1
                      ? "w-1/6 bg-red-500"
                      : passwordStrength.score === 2
                      ? "w-2/6 bg-orange-500"
                      : passwordStrength.score === 3
                      ? "w-3/6 bg-yellow-500"
                      : passwordStrength.score === 4
                      ? "w-4/6 bg-lime-500"
                      : "w-full bg-green-500"
                  }`}
                />
              </div>
              <span className={`text-xs font-semibold ${passwordStrength.color}`}>
                {passwordStrength.label}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {formState.newPassword.length < 8
                ? "Mínimo 8 caracteres"
                : "Use uma mistura de maiúsculas, minúsculas, números e símbolos para melhor segurança"}
            </p>
          </div>
        )}

        {errors.newPassword && (
          <p className="text-sm text-red-600 mt-1">{errors.newPassword}</p>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Confirmar Senha</label>
        <div className="relative">
          <input
            type={showPasswords.confirm ? "text" : "password"}
            name="confirmPassword"
            value={formState.confirmPassword}
            onChange={handleChange}
            className={`w-full px-4 py-2.5 rounded-lg border ${
              errors.confirmPassword ? "border-red-300" : "border-gray-200"
            } bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            placeholder="Confirme a nova senha"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() =>
              setShowPasswords((prev) => ({
                ...prev,
                confirm: !prev.confirm,
              }))
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            disabled={loading}
          >
            {showPasswords.confirm ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-red-600 mt-1">{errors.confirmPassword}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-100">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "Alterando..." : "Alterar Senha"}
        </button>
        <button
          type="button"
          onClick={() => {
            setFormState({ currentPassword: "", newPassword: "", confirmPassword: "" });
            setErrors({});
          }}
          className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 disabled:opacity-50 transition-colors"
          disabled={loading}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
