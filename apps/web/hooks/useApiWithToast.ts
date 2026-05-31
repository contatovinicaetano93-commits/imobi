"use client";

import { useToast } from "@/contexts/toast-context";
import { useApiQuery, useApiMutation } from "./useApiQuery";

interface UseApiWithToastQueryOptions<T> {
  enabled?: boolean;
  showError?: boolean;
  showSuccess?: boolean;
  errorMessage?: string;
  successMessage?: string;
  onError?: (error: string) => void;
  onSuccess?: (data: T) => void;
}

export function useApiQueryWithToast<T>(
  queryFn: () => Promise<T>,
  options: UseApiWithToastQueryOptions<T> = {}
) {
  const toast = useToast();
  const {
    enabled,
    showError = true,
    showSuccess = false,
    errorMessage,
    successMessage,
    onError: customOnError,
    onSuccess: customOnSuccess,
  } = options;

  const result = useApiQuery(queryFn, {
    enabled,
    onError: (error) => {
      if (showError) {
        toast.error(errorMessage || error, "Erro");
      }
      customOnError?.(error);
    },
    onSuccess: (data) => {
      if (showSuccess && successMessage) {
        toast.success(successMessage);
      }
      customOnSuccess?.(data);
    },
  });

  return result;
}

interface UseApiWithToastMutationOptions<T> {
  showError?: boolean;
  showSuccess?: boolean;
  errorMessage?: string;
  successMessage?: string;
  onError?: (error: string) => void;
  onSuccess?: (data: T) => void;
}

export function useApiMutationWithToast<T>(
  mutationFn: () => Promise<T>,
  options: UseApiWithToastMutationOptions<T> = {}
) {
  const toast = useToast();
  const {
    showError = true,
    showSuccess = true,
    errorMessage,
    successMessage,
    onError: customOnError,
    onSuccess: customOnSuccess,
  } = options;

  const result = useApiMutation(mutationFn, {
    onError: (error) => {
      if (showError) {
        toast.error(errorMessage || error, "Erro");
      }
      customOnError?.(error);
    },
    onSuccess: (data) => {
      if (showSuccess && successMessage) {
        toast.success(successMessage);
      }
      customOnSuccess?.(data);
    },
  });

  return result;
}
