import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FeatherIcon from "@/components/FeatherIcon";

const { width } = Dimensions.get("window");

interface Props {
  message: string;
  type: "success" | "error" | "info" | "warning";
  onDismiss: () => void;
  visible: boolean;
}

export function NotificationBanner({ message, type, onDismiss, visible }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const colors = {
    success: "#22C55E",
    error: "#EF4444",
    info: "#1A3C6E",
    warning: "#F59E0B",
  };

  const icons = {
    success: "check-circle",
    error: "x-circle",
    info: "info",
    warning: "alert-triangle",
  };

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        handleDismiss();
      }, 3500);
    } else {
      Animated.spring(translateY, {
        toValue: -120,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [visible]);

  const handleDismiss = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    Animated.spring(translateY, {
      toValue: -120,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  // Removed early return `if (!visible) return null;` to allow exit animation

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          backgroundColor: colors[type],
          paddingTop: insets.top + 12,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleDismiss}
        style={styles.content}
      >
        <FeatherIcon name={icons[type]} size={24} color="#FFF" />
        <Text style={styles.message}>{message}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingBottom: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  content: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  message: {
    color: "#FFF",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginRight: 12,
    textAlign: "right",
    flex: 1,
  },
});
