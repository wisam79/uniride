import { Redirect } from "expo-router";
import React from "react";

import { useApp } from "@/context/AppContext";

export default function Index() {
  const { isAuthenticated } = useApp();

  if (!isAuthenticated) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
