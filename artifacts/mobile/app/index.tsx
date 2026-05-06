import { Redirect } from "expo-router";
import React from "react";

import { useAuth } from "@/context";

export default function Index() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
