import { NotificationBanner } from "@/components/NotificationBanner";
import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Redirect, Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import { useAuth, useNotification } from "@/context";
import { useColors } from "@/hooks/useColors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>الرئيسية</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="trips">
        <Icon sf={{ default: "map", selected: "map.fill" }} />
        <Label>السفرات</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>الملف</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const { appNotifications: notifications, dismissNotification } = useNotification();
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

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
            backgroundColor: isIOS
              ? "transparent"
              : colors.card,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            elevation: 4,
            height: 64,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
          },
          tabBarBackground: () =>
            isIOS ? (
              <BlurView
                intensity={100}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
              />
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
              return isIOS ? (
                <SymbolView name="house.fill" tintColor={color} size={size} />
              ) : (
                <SymbolView name="house.fill" tintColor={color} size={size} />
              );
            },
          }}
        />
        <Tabs.Screen
          name="trips"
          options={{
            title: "السفرات",
            tabBarIcon: ({ color, focused }) => {
              const size = focused ? 24 : 22;
              return isIOS ? (
                <SymbolView name="map.fill" tintColor={color} size={size} />
              ) : (
                <SymbolView name="map.fill" tintColor={color} size={size} />
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
                <SymbolView name="person.fill" tintColor={color} size={size} />
              );
            },
          }}
        />
      </Tabs>
    </View>
  );
}

export default function TabLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Redirect href="/onboarding" />;

  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}