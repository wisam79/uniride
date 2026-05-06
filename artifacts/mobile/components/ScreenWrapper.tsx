import FeatherIcon from "@/components/FeatherIcon";
import React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface ScreenWrapperProps {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  isLoading?: boolean;
  loadingMessage?: string;
  error?: string | null;
  onDismissError?: () => void;
  isEmpty?: boolean;
  emptyIcon?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  scrollEnabled?: boolean;
  contentContainerStyle?: object;
  safeAreaEdges?: ("top" | "bottom" | "left" | "right")[];
  bottomPadding?: number;
}

export default function ScreenWrapper({
  children,
  refreshing = false,
  onRefresh,
  isLoading = false,
  loadingMessage = "جاري التحميل...",
  error = null,
  onDismissError,
  isEmpty = false,
  emptyIcon = "inbox",
  emptyTitle = "لا توجد بيانات",
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  scrollEnabled = true,
  contentContainerStyle,
  safeAreaEdges = ["bottom"],
  bottomPadding = 100,
}: ScreenWrapperProps) {
  const colors = useColors();

  const emptyIconMap: Record<string, string> = {
    inbox: "inbox",
    map: "map",
    clock: "clock",
    users: "users",
    truck: "truck",
  };

  if (isLoading) {
    return (
      <SafeAreaView
        edges={safeAreaEdges}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            {loadingMessage}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={safeAreaEdges}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: "#FEE2E2", borderColor: "#FECACA" }]}>
          <FeatherIcon name="alert-circle" size={16} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
          {onDismissError && (
            <TouchableOpacity onPress={onDismissError} style={styles.errorDismiss}>
              <FeatherIcon name="x" size={14} color="#DC2626" />
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {isEmpty ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconBg, { backgroundColor: colors.secondary }]}>
            <FeatherIcon
              name={emptyIconMap[emptyIcon] || emptyIcon}
              size={40}
              color={colors.mutedForeground}
            />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{emptyTitle}</Text>
          {emptyDescription && (
            <Text style={[styles.emptyDescription, { color: colors.mutedForeground }]}>
              {emptyDescription}
            </Text>
          )}
          {emptyActionLabel && onEmptyAction && (
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: colors.primary }]}
              onPress={onEmptyAction}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyButtonText}>{emptyActionLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomPadding },
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={scrollEnabled}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      )}

      {isLoading && (
        <View style={[styles.overlaySpinner, { backgroundColor: "rgba(255,255,255,0.6)" }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#DC2626",
    textAlign: "right",
  },
  errorDismiss: {
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
  emptyButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  overlaySpinner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
});