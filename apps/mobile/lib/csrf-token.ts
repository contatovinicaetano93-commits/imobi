import AsyncStorage from "@react-native-async-storage/async-storage";

const CSRF_TOKEN_KEY = "csrfToken";
const CSRF_EXPIRY_KEY = "csrfTokenExpiry";
const CSRF_TOKEN_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CsrfTokenData {
  token: string;
  expiresAt: number;
}

/**
 * Fetches a new CSRF token from the API
 */
export async function fetchCsrfToken(): Promise<string> {
  const baseUrl = typeof process !== "undefined" ? (process.env.EXPO_PUBLIC_API_URL ?? "") : "";

  try {
    const res = await fetch(`${baseUrl}/api/v1/auth/csrf-token`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch CSRF token: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as { csrfToken: string };
    const token = data.csrfToken;

    // Save token and expiry time to AsyncStorage
    const expiresAt = Date.now() + CSRF_TOKEN_TTL;
    await saveCsrfToken(token, expiresAt);

    return token;
  } catch (error) {
    console.error("Error fetching CSRF token:", error);
    throw error;
  }
}

/**
 * Retrieves CSRF token from AsyncStorage
 * Returns null if token is expired or doesn't exist
 */
export async function getCsrfToken(): Promise<string | null> {
  try {
    const [token, expiryStr] = await Promise.all([
      AsyncStorage.getItem(CSRF_TOKEN_KEY),
      AsyncStorage.getItem(CSRF_EXPIRY_KEY),
    ]);

    if (!token || !expiryStr) {
      return null;
    }

    const expiresAt = parseInt(expiryStr, 10);
    const now = Date.now();

    // Check if token is expired
    if (now >= expiresAt) {
      // Token expired, clear it
      await clearCsrfToken();
      return null;
    }

    return token;
  } catch (error) {
    console.error("Error retrieving CSRF token:", error);
    return null;
  }
}

/**
 * Saves CSRF token to AsyncStorage
 */
export async function saveCsrfToken(token: string, expiresAt: number): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(CSRF_TOKEN_KEY, token),
      AsyncStorage.setItem(CSRF_EXPIRY_KEY, expiresAt.toString()),
    ]);
  } catch (error) {
    console.error("Error saving CSRF token:", error);
    throw error;
  }
}

/**
 * Clears CSRF token from AsyncStorage
 */
export async function clearCsrfToken(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(CSRF_TOKEN_KEY),
      AsyncStorage.removeItem(CSRF_EXPIRY_KEY),
    ]);
  } catch (error) {
    console.error("Error clearing CSRF token:", error);
    // Don't throw, just log - clearing shouldn't fail the operation
  }
}

/**
 * Gets a valid CSRF token, fetching a new one if needed
 */
export async function ensureCsrfToken(): Promise<string> {
  let token = await getCsrfToken();

  if (!token) {
    token = await fetchCsrfToken();
  }

  return token;
}
