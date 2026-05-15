'use client';
import { useLogin } from '@refinedev/core';
import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import AccountCircle from '@mui/icons-material/AccountCircle';

const StyledPaper = styled(Paper)(({ theme }) => ({
  marginTop: theme.spacing(8),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: theme.spacing(4),
  width: '100%',
  maxWidth: 400,
}));

const StyledAvatar = styled('div')(({ theme }) => ({
  margin: theme.spacing(1),
  backgroundColor: theme.palette.primary.main,
  width: 64,
  height: 64,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
}));

const Form = styled('form')(({ theme }) => ({
  width: '100%',
  marginTop: theme.spacing(1),
}));

const SubmitButton = styled(Button)(({ theme }) => ({
  margin: theme.spacing(3, 0, 2),
}));

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const { mutate: login, isLoading } = useLogin();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError(null);
    login(
      { email, password },
      {
        onError: (err) => {
          setLoginError(err?.message || 'Login failed. Please check your credentials.');
        },
      },
    );
  };

  return (
    <Container component="main" maxWidth="xs">
      <StyledPaper elevation={3}>
        <StyledAvatar>
          <LockOutlinedIcon sx={{ color: '#fff', fontSize: 32 }} />
        </StyledAvatar>
        <Typography component="h1" variant="h5" fontWeight="bold" sx={{ mt: 2 }}>
          UniRide Admin
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Sign in to manage the platform
        </Typography>
        <Form onSubmit={handleSubmit}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            InputProps={{
              startAdornment: <AccountCircle color="action" sx={{ mr: 1 }} />,
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {loginError && (
            <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
              {loginError}
            </Alert>
          )}
          <SubmitButton
            type="submit"
            fullWidth
            variant="contained"
            disabled={isLoading}
            sx={{ mt: 3, mb: 2 }}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
          </SubmitButton>
        </Form>
      </StyledPaper>
    </Container>
  );
}
