export declare function getApiBaseUrl(): string;
declare class ApiError extends Error {
    status: number;
    code?: string | undefined;
    constructor(status: number, message: string, code?: string | undefined);
}
export declare const apiClient: {
    get: <T>(path: string, token?: string) => Promise<T>;
    post: <T>(path: string, body: unknown, token?: string) => Promise<T>;
    patch: <T>(path: string, body: unknown, token?: string) => Promise<T>;
    delete: <T>(path: string, token?: string) => Promise<T>;
};
export { ApiError };
