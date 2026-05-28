import * as Haptics from "expo-haptics";

/**
 * Haptic feedback utilities for enhanced UX
 */

export const haptics = {
  /**
   * Light tap feedback - for general button presses
   */
  tap: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics not available on all devices
    }
  },

  /**
   * Medium feedback - for important actions
   */
  impact: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Haptics not available
    }
  },

  /**
   * Heavy feedback - for critical actions
   */
  heavy: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      // Haptics not available
    }
  },

  /**
   * Success pattern - short notification
   */
  success: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Haptics not available
    }
  },

  /**
   * Warning pattern - medium notification
   */
  warning: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      // Haptics not available
    }
  },

  /**
   * Error pattern - error notification
   */
  error: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // Haptics not available
    }
  },

  /**
   * Selection feedback - for toggling/selection
   */
  selection: async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // Haptics not available
    }
  },
};
