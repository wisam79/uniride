'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { supabaseClient } from '../../providers/supabaseClient';

interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  description: string | null;
  updated_at: string;
}

const FLAG_ICONS: Record<string, string> = {
  realtime_tracking: '📡',
  push_notifications: '🔔',
  offline_mode: '📴',
  ratings_system: '⭐',
  zaincash_payment: '💳',
};

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchFlags = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabaseClient
        .from('feature_flags')
        .select('*')
        .order('name');
      if (fetchError) throw fetchError;
      setFlags(data as FeatureFlag[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load feature flags');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();

    // Realtime: reflect changes made by other admins
    const channel = supabaseClient
      .channel('admin-feature-flags')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feature_flags' }, () => {
        fetchFlags();
      })
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [fetchFlags]);

  const handleToggle = async (flag: FeatureFlag) => {
    setTogglingId(flag.id);
    setError(null);
    setSuccessMsg(null);
    try {
      const { error: updateError } = await supabaseClient
        .from('feature_flags')
        .update({ enabled: !flag.enabled, updated_at: new Date().toISOString() })
        .eq('id', flag.id);
      if (updateError) throw updateError;

      setFlags((prev) => prev.map((f) => (f.id === flag.id ? { ...f, enabled: !f.enabled } : f)));
      setSuccessMsg(`"${flag.name}" ${!flag.enabled ? 'enabled' : 'disabled'} successfully`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update flag');
    } finally {
      setTogglingId(null);
    }
  };

  if (isLoading && flags.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Feature Flags
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Toggle features in real-time — changes reflect immediately in the mobile app
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchFlags} disabled={isLoading} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {successMsg && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMsg}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {flags.map((flag) => (
          <Card
            key={flag.id}
            elevation={1}
            sx={{ borderLeft: `4px solid ${flag.enabled ? '#34C759' : '#ccc'}` }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography fontSize={28}>{FLAG_ICONS[flag.name] ?? '🚩'}</Typography>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {flag.name}
                      </Typography>
                      <Chip
                        label={flag.enabled ? 'Enabled' : 'Disabled'}
                        color={flag.enabled ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                    {flag.description && (
                      <Typography variant="body2" color="text.secondary">
                        {flag.description}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.disabled">
                      Last updated: {new Date(flag.updated_at).toLocaleString('ar-IQ')}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {togglingId === flag.id && <CircularProgress size={20} />}
                  <Switch
                    checked={flag.enabled}
                    onChange={() => handleToggle(flag)}
                    disabled={togglingId === flag.id}
                    color="success"
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
