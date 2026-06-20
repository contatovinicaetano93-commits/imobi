import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const BIOMETRY_ENABLED_KEY = "biometryEnabled";

export async function isBiometryAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;
  return LocalAuthentication.isEnrolledAsync();
}

export async function isBiometryEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync(BIOMETRY_ENABLED_KEY)) === "true";
}

export async function setBiometryEnabled(enabled: boolean) {
  if (enabled) {
    await SecureStore.setItemAsync(BIOMETRY_ENABLED_KEY, "true");
  } else {
    await SecureStore.deleteItemAsync(BIOMETRY_ENABLED_KEY);
  }
}

export async function authenticateWithBiometry(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Desbloquear imbobi",
    cancelLabel: "Usar senha",
    disableDeviceFallback: false,
  });
  return result.success;
}
