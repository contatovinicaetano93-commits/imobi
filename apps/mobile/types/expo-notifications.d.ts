declare module "expo-notifications" {
  export type PermissionStatus = "granted" | "denied" | "undetermined";

  export enum AndroidImportance {
    DEFAULT = 3,
    HIGH = 4,
    LOW = 2,
    MAX = 5,
    MIN = 1,
    NONE = 0,
  }

  export interface PermissionResponse {
    status: PermissionStatus;
    granted: boolean;
    canAskAgain: boolean;
    expires: string | number;
  }

  export interface NotificationChannel {
    name: string;
    importance: AndroidImportance;
    vibrationPattern?: number[];
    lightColor?: string;
  }

  export interface ExpoPushToken {
    type: "expo";
    data: string;
  }

  export interface GetExpoPushTokenOptions {
    projectId?: string;
  }

  export function getPermissionsAsync(): Promise<PermissionResponse>;
  export function requestPermissionsAsync(): Promise<PermissionResponse>;
  export function setNotificationChannelAsync(
    channelId: string,
    channel: Partial<NotificationChannel> & { name: string; importance: AndroidImportance },
  ): Promise<NotificationChannel | null>;
  export function getExpoPushTokenAsync(options?: GetExpoPushTokenOptions): Promise<ExpoPushToken>;
}
