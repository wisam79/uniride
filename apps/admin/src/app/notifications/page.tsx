'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { useTranslation } from 'react-i18next';
import { supabaseClient } from '../../providers/supabaseClient';

export default function NotificationsPage() {
  const { t } = useTranslation();
  const [targetRole, setTargetRole] = useState<'all' | 'student' | 'driver'>('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;

    setIsLoading(true);
    setResult(null);

    try {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            targetRole,
            title: title.trim(),
            body: body.trim(),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to send notification');
      }

      if (data.success) {
        setResult({ success: true, message: t('notifications.success', { sent: data.sent || 0 }) });
        setTitle('');
        setBody('');
      } else {
        setResult({ success: false, message: data.message || t('notifications.failed') });
      }
    } catch (err: unknown) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : t('notifications.failed'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        {t('notifications.titles.broadcast')}
      </Typography>

      <Card elevation={0} variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {result && (
            <Alert severity={result.success ? 'success' : 'error'} onClose={() => setResult(null)}>
              {result.message}
            </Alert>
          )}

          <FormControl fullWidth>
            <InputLabel>{t('notifications.fields.target')}</InputLabel>
            <Select
              value={targetRole}
              label={t('notifications.fields.target')}
              onChange={(e) => setTargetRole(e.target.value as 'all' | 'student' | 'driver')}
              disabled={isLoading}
            >
              <MenuItem value="all">{t('notifications.targets.all')}</MenuItem>
              <MenuItem value="student">{t('notifications.targets.student')}</MenuItem>
              <MenuItem value="driver">{t('notifications.targets.driver')}</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label={t('notifications.fields.title')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isLoading}
            variant="outlined"
          />

          <TextField
            fullWidth
            label={t('notifications.fields.body')}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={isLoading}
            multiline
            rows={4}
            variant="outlined"
          />

          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleSend}
            disabled={isLoading || !title.trim() || !body.trim()}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
            sx={{ py: 1.5, borderRadius: 2 }}
          >
            {t('notifications.send')}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
