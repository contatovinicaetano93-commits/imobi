"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@imbobi/core";
import { getErrorMessage } from "@/lib/error-handler";

interface UseApiQueryOptions<T> {
  enabled?: boolean;
  onError?: (error: string) => void;
  onSuccess?: (data: T) => void;
}

export function useApiQuery<T>(
  queryFn: () => Promise<T>,
  options: UseApiQueryOptions<T> = {}
) {
  const { enabled = true, onError, onSuccess } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await queryFn();
      setData(result);
      onSuccess?.(result);
    } catch (e) {
      const errorMessage = getErrorMessage(e);
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) return;
    refetch();
  }, [enabled]);

  return { data, loading, error, refetch };
}

interface UseMutationOptions<T> {
  onError?: (error: string) => void;
  onSuccess?: (data: T) => void;
}

export function useApiMutation<T>(
  mutationFn: () => Promise<T>,
  options: UseMutationOptions<T> = {}
) {
  const { onError, onSuccess } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await mutationFn();
      setData(result);
      onSuccess?.(result);
      return result;
    } catch (e) {
      const errorMessage = getErrorMessage(e);
      setError(errorMessage);
      onError?.(errorMessage);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setError(null);
    setLoading(false);
  };

  return { data, loading, error, mutate, reset };
}
