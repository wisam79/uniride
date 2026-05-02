import FeatherIcon from "@/components/FeatherIcon";
import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Redirect, Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

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

function ClassicTabLayout({ role }: { role: "student" | "driver" }) {
  const { pendingRequest } = useApp();
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const isAndroid = Platform.OS === "android";

  return (
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
              ? `${colors.card}F7` // 0.97 opacity
              : colors.card,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 4,
          height: isWeb ? 84 : 64,
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
    </Tabs>
  );
}

export default function TabLayout() {
  const { isAuthenticated, user } = useApp();

  if (!isAuthenticated) return <Redirect href="/onboarding" />;

  const role = user?.role ?? "student";

  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout role={role} />;
  }
  return <ClassicTabLayout role={role} />;
}
