'use client';

import React from 'react';
import { useLogout, useGetIdentity } from '@refinedev/core';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import PersonIcon from '@mui/icons-material/Person';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import LayersIcon from '@mui/icons-material/Layers';
import SchoolIcon from '@mui/icons-material/School';
import BarChartIcon from '@mui/icons-material/BarChart';
import FlagIcon from '@mui/icons-material/Flag';
import HistoryIcon from '@mui/icons-material/History';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PaymentsIcon from '@mui/icons-material/Payments';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';

const DRAWER_WIDTH = 260;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { mutate: logout } = useLogout();
  const { data: identity } = useGetIdentity<{ name?: string }>();

  const NAV_ITEMS = [
    { label: t('dashboard.title'), icon: <DashboardIcon />, path: '/' },
    { label: t('profiles.titles.list'), icon: <PeopleIcon />, path: '/profiles' },
    { label: t('drivers.titles.list'), icon: <PersonIcon />, path: '/drivers' },
    { label: t('institutions.titles.list'), icon: <SchoolIcon />, path: '/institutions' },
    { label: t('routes.titles.list'), icon: <AltRouteIcon />, path: '/routes' },
    { label: t('trips.titles.list'), icon: <DirectionsBusIcon />, path: '/trips' },
    { label: t('subscriptions.titles.list'), icon: <CardMembershipIcon />, path: '/subscriptions' },
    {
      label: t('license_batches.titles.list'),
      icon: <LayersIcon />,
      path: '/license_batches',
    },
    { label: t('licenses.titles.list'), icon: <ConfirmationNumberIcon />, path: '/licenses' },
    { label: t('payouts.titles.list'), icon: <PaymentsIcon />, path: '/payouts' },
    { label: t('analytics.title'), icon: <BarChartIcon />, path: '/analytics' },
    { label: t('feature_flags.titles.list'), icon: <FlagIcon />, path: '/feature-flags' },
    { label: t('audit_logs.titles.list'), icon: <HistoryIcon />, path: '/audit_logs' },
    {
      label: t('notifications.titles.broadcast'),
      icon: <NotificationsActiveIcon />,
      path: '/notifications',
    },
  ];

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#0f172a' }}>
      <Box sx={{ p: 2.5, textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Typography variant="h6" fontWeight="bold" color="#fff" letterSpacing={1}>
          UniRide Admin
        </Typography>
        <Typography
          variant="caption"
          color="rgba(255,255,255,0.5)"
          sx={{ mt: 0.5, display: 'block' }}
        >
          Management Dashboard
        </Typography>
      </Box>
      <List sx={{ flex: 1, pt: 1 }}>
        {NAV_ITEMS.map((item) => (
          <ListItemButton
            key={item.path}
            selected={
              pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))
            }
            onClick={() => {
              router.push(item.path);
              setMobileOpen(false);
            }}
            sx={{
              mx: 1.5,
              borderRadius: 1.5,
              mb: 0.3,
              py: 1,
              color: 'rgba(255,255,255,0.7)',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.08)',
                color: '#fff',
              },
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: '#fff',
                '&:hover': { bgcolor: 'primary.dark' },
                '& .MuiListItemIcon-root': { color: '#fff' },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>{item.icon}</ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
            />
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <ListItemButton
          onClick={() => logout()}
          sx={{
            mx: 1,
            borderRadius: 1.5,
            color: 'rgba(255,255,255,0.6)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: '#ef5350' },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary={t('buttons.logout')} primaryTypographyProps={{ fontSize: 14 }} />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { sm: `${DRAWER_WIDTH}px` },
          bgcolor: '#fff',
          borderBottom: '1px solid #eee',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { sm: 'none' }, color: 'text.primary' }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1, color: 'text.primary' }}>
            {NAV_ITEMS.find((i) => i.path === pathname)?.label || 'UniRide'}
          </Typography>
          {identity && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
                {identity.name?.[0]?.toUpperCase() ?? 'A'}
              </Avatar>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: 0 }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, bgcolor: '#fafafa' }}>
        {children}
      </Box>
    </Box>
  );
}
