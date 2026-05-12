'use client';

import React from 'react';
import { useLogout, useNavigation, useGetIdentity } from '@refinedev/core';
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
import { useRouter, usePathname } from 'next/navigation';

const DRAWER_WIDTH = 260;

const NAV_ITEMS = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { label: 'Users', icon: <PeopleIcon />, path: '/profiles' },
  { label: 'Drivers', icon: <PersonIcon />, path: '/drivers' },
  { label: 'Institutions', icon: <SchoolIcon />, path: '/institutions' },
  { label: 'Routes', icon: <AltRouteIcon />, path: '/routes' },
  { label: 'Live Trips', icon: <DirectionsBusIcon />, path: '/trips' },
  { label: 'Subscriptions', icon: <CardMembershipIcon />, path: '/subscriptions' },
  { label: 'License Batches', icon: <LayersIcon />, path: '/license_batches' },
  { label: 'Licenses', icon: <ConfirmationNumberIcon />, path: '/licenses' },
  { label: 'Analytics', icon: <BarChartIcon />, path: '/analytics' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { mutate: logout } = useLogout();
  const { data: identity } = useGetIdentity();

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, textAlign: 'center', borderBottom: '1px solid #eee' }}>
        <Typography variant="h6" fontWeight="bold" color="primary">
          UniRide Admin
        </Typography>
      </Box>
      <List sx={{ flex: 1 }}>
        {NAV_ITEMS.map((item) => (
          <ListItemButton
            key={item.path}
            selected={pathname === item.path}
            onClick={() => {
              router.push(item.path);
              setMobileOpen(false);
            }}
            sx={{
              mx: 1,
              borderRadius: 1,
              mb: 0.5,
              '&.Mui-selected': {
                backgroundColor: 'primary.light',
                color: 'primary.contrastText',
                '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ p: 2, borderTop: '1px solid #eee' }}>
        <ListItemButton onClick={() => logout()} sx={{ borderRadius: 1 }}>
          <ListItemIcon sx={{ minWidth: 40 }}>
            <LogoutIcon color="error" />
          </ListItemIcon>
          <ListItemText primary="Logout" sx={{ color: 'error.main' }} />
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
                {(identity as { name?: string })?.name?.[0]?.toUpperCase() || 'A'}
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
