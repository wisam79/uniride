import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FeatherIcon from "@/components/FeatherIcon";
import { useColors } from "@/hooks/useColors";
export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  errorCount: number;
  onResetApp: () => Promise<void>;
}

export function ErrorFallback({ error, resetError, errorCount, onResetApp }: ErrorFallbackProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const monoFont = Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace",
  });

  const formatErrorDetails = (): string => {
    let details = `Error: ${error.message}\n\n`;
    if (error.stack) {
      details += `Stack Trace:\n${error.stack}`;
    }
    return details;
  };

  const timestamp = new Date().toLocaleString("ar-IQ", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {__DEV__ ? (
        <Pressable
          onPress={() => setIsModalVisible(true)}
          accessibilityLabel="عرض تفاصيل الخطأ"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.topButton,
            {
              top: insets.top + 16,
              backgroundColor: colors.card,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <FeatherIcon name="alert-circle" size={20} color={colors.foreground} />
        </Pressable>
      ) : null}

      <View style={styles.content}>
        <FeatherIcon name="alert-triangle" size={48} color={colors.primary} />
        <Text style={[styles.title, { color: colors.foreground }]}>عذراً، حدث خطأ غير متوقع</Text>
        <Text style={[styles.message, { color: colors.mutedForeground }]}>
          يمكنك إعادة المحاولة أو إعادة تشغيل التطبيق.
        </Text>

        {__DEV__ ? (
          <View style={[styles.errorPreview, { backgroundColor: colors.card }]}>
            <Text style={[styles.errorPreviewText, { color: colors.mutedForeground }]} numberOfLines={2}>
              {error.message}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={resetError}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <FeatherIcon name="refresh-cw" size={16} color={colors.primaryForeground} />
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
            إعادة المحاولة
          </Text>
        </Pressable>

        {errorCount >= 3 ? (
          <Pressable
            onPress={onResetApp}
            style={({ pressed }) => [
              styles.button,
              styles.resetButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <FeatherIcon name="power" size={16} color={colors.foreground} />
            <Text style={[styles.buttonText, { color: colors.foreground }]}>
              إعادة تشغيل التطبيق
            </Text>
          </Pressable>
        ) : null}
      </View>

      {__DEV__ ? (
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                    تفاصيل الخطأ
                  </Text>
                  <Text style={[styles.timestamp, { color: colors.mutedForeground }]}>
                    {timestamp}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setIsModalVisible(false)}
                  accessibilityLabel="إغلاق"
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <FeatherIcon name="x" size={24} color={colors.foreground} />
                </Pressable>
              </View>

              <ScrollView
                style={styles.modalScrollView}
                contentContainerStyle={[styles.modalScrollContent, { paddingBottom: insets.bottom + 16 }]}
                showsVerticalScrollIndicator
              >
                <View style={[styles.errorContainer, { backgroundColor: colors.card }]}>
                  <Text style={[styles.errorText, { color: colors.foreground, fontFamily: monoFont }]} selectable>
                    {formatErrorDetails()}
                  </Text>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    width: "100%",
    maxWidth: 600,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 36,
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  errorPreview: {
    width: "100%",
    padding: 12,
    borderRadius: 8,
  },
  errorPreviewText: {
    fontSize: 13,
    textAlign: "center",
  },
  topButton: {
    position: "absolute",
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 8,
    paddingHorizontal: 24,
    minWidth: 200,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resetButton: {
    borderWidth: 1,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    fontWeight: "600",
    textAlign: "center",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    width: "100%",
    height: "90%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
  },
  errorContainer: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    padding: 16,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    width: "100%",
  },
});