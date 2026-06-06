import type { LoginInput, CadastroUsuarioInput, TipoUsuario, KycStatus } from "@imbobi/schemas";
export interface UsuarioAutenticado {
    id: string;
    nome: string;
    email: string;
    tipo: TipoUsuario;
    kycStatus: KycStatus;
}
export interface AuthState {
    usuario: UsuarioAutenticado | null;
    token: string | null;
    loading: boolean;
    error: Error | null;
}
export interface AuthActions {
    login: (input: LoginInput) => Promise<boolean>;
    cadastrar: (input: CadastroUsuarioInput) => Promise<boolean>;
    logout: () => void;
    limparErro: () => void;
}
export declare function useAuth(onTokenChange?: (token: string | null) => void): AuthState & AuthActions;
