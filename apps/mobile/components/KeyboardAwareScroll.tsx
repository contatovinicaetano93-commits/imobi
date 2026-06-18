import { useEffect, useState, ReactNode } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  ViewStyle,
} from "react-native";

type Props = ScrollViewProps & {
  children: ReactNode;
  /** Compensa header + status bar (iOS). */
  keyboardVerticalOffset?: number;
  style?: ViewStyle;
};

/**
 * ScrollView que sobe com o teclado — evita campos ficarem escondidos.
 * Android: use também softwareKeyboardLayoutMode: "resize" no app.config.
 */
export default function KeyboardAwareScroll({
  children,
  keyboardVerticalOffset = Platform.OS === "ios" ? 90 : 0,
  contentContainerStyle,
  style,
  ...scrollProps
}: Props) {
  const [kbPadding, setKbPadding] = useState(24);

  useEffect(() => {
    const show = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hide = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = Keyboard.addListener(show, (e) => {
      setKbPadding(e.endCoordinates.height + 24);
    });
    const onHide = Keyboard.addListener(hide, () => setKbPadding(24));
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <ScrollView
        {...scrollProps}
        style={styles.flex}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[contentContainerStyle, { paddingBottom: kbPadding }]}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
