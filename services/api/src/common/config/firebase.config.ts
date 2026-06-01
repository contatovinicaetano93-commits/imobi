export interface FirebaseConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
}

export function getFirebaseConfig(): FirebaseConfig {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const nodeEnv = process.env.NODE_ENV || "development";

  if (!projectId || !privateKey || !clientEmail) {
    if (nodeEnv === "production") {
      throw new Error(
        "Firebase credentials (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL) are required in production",
      );
    }

    return {
      projectId: "mock-project",
      privateKey: "mock-key",
      clientEmail: "mock@example.com",
    };
  }

  return {
    projectId,
    privateKey,
    clientEmail,
  };
}

export function validateFirebaseConfig(config: FirebaseConfig): string[] {
  const errors: string[] = [];

  if (!config.projectId || typeof config.projectId !== "string") {
    errors.push("Firebase project ID is missing or invalid");
  }

  if (!config.privateKey || typeof config.privateKey !== "string") {
    errors.push("Firebase private key is missing or invalid");
  }

  if (!config.clientEmail || typeof config.clientEmail !== "string") {
    errors.push("Firebase client email is missing or invalid");
  }

  return errors;
}
