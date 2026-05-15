'use client';

import { Authenticated, Refine } from '@refinedev/core';
import { RefineKbarProvider } from '@refinedev/kbar';
import { RefineSnackbarProvider, notificationProvider } from '@refinedev/mui';
import routerProvider from '@refinedev/nextjs-router';
import { authProvider } from './authProvider';
import { supabaseClient } from './supabaseClient';
import { dataProvider } from './dataProvider';
import { Suspense } from 'react';
import '../i18n';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <RefineKbarProvider>
      <RefineSnackbarProvider>
        <Suspense fallback={<div>Loading...</div>}>
          <Refine
            dataProvider={dataProvider}
            authProvider={authProvider}
            routerProvider={routerProvider}
            notificationProvider={notificationProvider}
            resources={[
              {
                name: 'profiles',
                list: '/profiles',
                show: '/profiles/show/:id',
                meta: { label: 'Users' },
              },
              {
                name: 'drivers',
                list: '/drivers',
                meta: { label: 'Drivers Management' },
              },
              {
                name: 'routes',
                list: '/routes',
                create: '/routes/create',
                edit: '/routes/edit/:id',
                show: '/routes/show/:id',
                meta: { label: 'Routes' },
              },
              {
                name: 'trips',
                list: '/trips',
                meta: { label: 'Live Trips' },
              },
              {
                name: 'subscriptions',
                list: '/subscriptions',
                meta: { label: 'Subscriptions' },
              },
              {
                name: 'license_batches',
                list: '/license_batches',
                create: '/license_batches/create',
                meta: { label: 'License Batches' },
              },
              {
                name: 'licenses',
                list: '/licenses',
                meta: { label: 'Licenses' },
              },
              {
                name: 'institutions',
                list: '/institutions',
                create: '/institutions/create',
                edit: '/institutions/edit/:id',
                meta: { label: 'Institutions' },
              },
              {
                name: 'feature_flags',
                list: '/feature-flags',
                meta: { label: 'Feature Flags' },
              },
            ]}
            options={{
              syncWithLocation: true,
              warnWhenUnsavedChanges: true,
            }}
          >
            {children}
          </Refine>
        </Suspense>
      </RefineSnackbarProvider>
    </RefineKbarProvider>
  );
};
