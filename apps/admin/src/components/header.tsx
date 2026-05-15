'use client';

import React from 'react';
import { useGetIdentity } from '@refinedev/core';
import { AppBar, Avatar, Box, IconButton, Stack, Toolbar, Typography } from '@mui/material';
import { HamburgerMenu } from '@refinedev/mui';
import TranslateIcon from '@mui/icons-material/Translate';
import { useTranslation } from 'react-i18next';

export const Header: React.FC = () => {
  const { data: user } = useGetIdentity<{
    name: string;
    avatar: string;
  }>();

  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(nextLang);
    document.documentElement.lang = nextLang;
    document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr';
  };

  return (
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'background.paper' }}>
      <Toolbar>
        <HamburgerMenu />
        <Stack direction="row" width="100%" justifyContent="flex-end" alignItems="center">
          <IconButton onClick={toggleLanguage} sx={{ mr: 2 }}>
            <TranslateIcon />
            <Typography variant="body2" sx={{ ml: 1, fontWeight: 'bold' }}>
              {i18n.language === 'ar' ? 'EN' : 'عربي'}
            </Typography>
          </IconButton>

          <Stack direction="row" gap="16px" alignItems="center" justifyContent="center">
            {user?.name && (
              <Typography
                sx={{
                  display: {
                    xs: 'none',
                    sm: 'inline-block',
                  },
                }}
                variant="subtitle2"
                color="text.primary"
              >
                {user?.name}
              </Typography>
            )}
            <Avatar src={user?.avatar ?? undefined} alt={user?.name ?? ''}>
              {user?.name?.charAt(0) ?? 'A'}
            </Avatar>
          </Stack>
        </Stack>
      </Toolbar>
    </AppBar>
  );
};
