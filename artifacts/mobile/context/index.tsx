import React from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import { DriverProvider, useDriver } from "./DriverContext";
import { SubscriptionProvider, useSubscription } from "./SubscriptionContext";
import { TripProvider } from "./TripContext";
import { NotificationProvider } from "./NotificationContext";
import { InstitutionProvider } from "./InstitutionContext";

function AppInit({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { fetchDriverProfile } = useDriver();
  const { fetchSubscription, fetchPendingRequests } = useSubscription();

  React.useEffect(() => {
    if (!isLoading && user) {
      if (user.role === "driver") {
        fetchDriverProfile();
        fetchPendingRequests();
      }
      if (user.role === "student") {
        fetchSubscription();
      }
    }
  }, [user, isLoading]);

  return <>{children}</>;
}

export function RootProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <InstitutionProvider>
        <DriverProvider>
          <SubscriptionProvider>
            <TripProvider>
              <NotificationProvider>
                <AppInit>{children}</AppInit>
              </NotificationProvider>
            </TripProvider>
          </SubscriptionProvider>
        </DriverProvider>
      </InstitutionProvider>
    </AuthProvider>
  );
}

export { useAuth } from "./AuthContext";
export { useDriver } from "./DriverContext";
export { useSubscription, type SubscriptionPlan } from "./SubscriptionContext";
export { useTrip, type TripLocation } from "./TripContext";
export { useNotification } from "./NotificationContext";
export { useInstitution } from "./InstitutionContext";
export type { Profile, UserRole } from "./AuthContext";
export type { DriverProfile } from "./DriverContext";
export type { SubscriptionData, SubscriptionRequestData } from "./SubscriptionContext";
export type { TripData } from "./TripContext";
export type { NotificationData, AppNotification } from "./NotificationContext";
export type { Institution } from "./InstitutionContext";
