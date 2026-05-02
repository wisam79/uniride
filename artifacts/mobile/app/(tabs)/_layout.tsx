import FeatherIcon from "@/components/FeatherIcon";
import { NotificationBanner } from "@/components/NotificationBanner";
import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Redirect, Tabs, useRouter, usePathname } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import React, { useEffect, useRef } from "react";
import { Platform, StyleSheet, View, useColorScheme, Animated, TouchableOpacity } from "react-native";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function NativeTabLayout({ role }: { role: "student" | "driver" }) {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>الرئيسية</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="trips">
        <Icon sf={{ default: "car", selected: "car.fill" }} />
        <Label>{role === "student" ? "رحلاتي" : "الرحلات"}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="subscription">
        <Icon sf={{ default: "creditcard", selected: "creditcard.fill" }} />
        <Label>{role === "student" ? "اشتراكي" : "الأرباح"}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>الملف</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout({ role, isAdmin }: { role: "student" | "driver"; isAdmin: boolean }) {
  const { pendingRequest, notifications, dismissNotification, activeTrip } = useApp();
  const colors = useColors();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const pathname = usePathname();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const isAndroid = Platform.OS === "android";

  const fabScale = useRef(new Animated.Value(0)).current;
  const showFab = role === "student" && pathname === "/" && !activeTrip;

  useEffect(() => {
    if (showFab) {
      Animated.spring(fabScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      Animated.spring(fabScale, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  }, [showFab]);

  return (
    <View style={{ flex: 1 }}>
      {notifications.length > 0 && (
        <NotificationBanner
          message={notifications[0].message}
          type={notifications[0].type}
          visible={true}
          onDismiss={() => dismissNotification(notifications[0].id)}
        />
      )}
      <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS
            ? "transparent"
            : isAndroid
              ? `${colors.card}F7`
              : colors.card,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 4,
          height: isWeb ? 84 : 64,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          ...(isWeb ? { flexDirection: "row-reverse" as any } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 12,
          letterSpacing: -0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "الرئيسية",
          tabBarIcon: ({ color, focused }) => {
            const size = focused ? 24 : 22;
            const icon = isIOS ? (
              <SymbolView name="house.fill" tintColor={color} size={size} />
            ) : (
              <FeatherIcon name="home" size={size} color={color} />
            );

            if (role === "driver" && pendingRequest) {
              return (
                <View>
                  {icon}
                  <View
                    style={{
                      position: "absolute",
                      right: -2,
                      top: -2,
                      backgroundColor: "#EF4444",
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      borderWidth: 1.5,
                      borderColor: colors.card,
                    }}
                  />
                </View>
              );
            }
            return icon;
          },
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: role === "student" ? "رحلاتي" : "الرحلات",
          tabBarIcon: ({ color, focused }) => {
            const size = focused ? 24 : 22;
            return isIOS ? (
              <SymbolView name="car.fill" tintColor={color} size={size} />
            ) : (
              <FeatherIcon name="map" size={size} color={color} />
            );
          },
        }}
      />
      <Tabs.Screen
        name="subscription"
        options={{
          title: role === "student" ? "اشتراكي" : "الأرباح",
          tabBarIcon: ({ color, focused }) => {
            const size = focused ? 24 : 22;
            return isIOS ? (
              <SymbolView name="creditcard.fill" tintColor={color} size={size} />
            ) : (
              <FeatherIcon
                name={role === "student" ? "credit-card" : "dollar-sign"}
                size={size}
                color={color}
              />
            );
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "الملف",
          tabBarIcon: ({ color, focused }) => {
            const size = focused ? 24 : 22;
            return isIOS ? (
              <SymbolView name="person.fill" tintColor={color} size={size} />
            ) : (
              <FeatherIcon name="user" size={size} color={color} />
            );
          },
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "الإدارة",
          tabBarButton: isAdmin ? undefined : () => null,
          tabBarIcon: ({ color, focused }) => {
            const size = focused ? 24 : 22;
            return <FeatherIcon name="shield" size={size} color={color} />;
          },
          tabBarBadge: undefined,
        }}
      />
    </Tabs>
    {showFab && (
      <Animated.View
        style={[
          styles.fabContainer,
          {
            transform: [{ scale: fabScale }],
            backgroundColor: colors.accent,
            bottom: (isWeb ? 84 : 64) + 16,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.navigate({ pathname: "/", params: { openBooking: "true" } })}
          activeOpacity={0.8}
        >
          <FeatherIcon name="navigation" size={24} color="white" />
        </TouchableOpacity>
      </Animated.View>
    )}
    </View>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: "absolute",
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 100,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default function TabLayout() {
  const { isAuthenticated, user } = useApp();

  if (!isAuthenticated) return <Redirect href="/onboarding" />;

  const role = user?.role ?? "student";
  const isAdmin = user?.isAdmin ?? false;

  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout role={role} />;
  }
  return <ClassicTabLayout role={role} isAdmin={isAdmin} />;
}
