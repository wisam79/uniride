import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadow, FontFamily } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../hooks/useTranslation';
import { useRouter } from 'expo-router';

import { Subscription } from '@uniride/core';

interface ActiveSubscriptionCardProps {
  activeSub: Partial<Subscription> & {
    routes?: {
      title?: string;
    } | null;
  };
  onTrackTrip: () => void;
}

export const ActiveSubscriptionCard: React.FC<ActiveSubscriptionCardProps> = ({ activeSub, onTrackTrip }) => {
  const { t, isRTL, language } = useTranslation();
  const router = useRouter();

  if (!activeSub.end_date) return null;

  return (
    <TouchableOpacity
      style={[styles.activeSubCard, isRTL && { flexDirection: 'row-reverse' }]}
      onPress={() => router.push('/subscriptions')}
      activeOpacity={0.9}
    >
      <View style={styles.activeSubIcon}>
        <Ionicons name="checkmark-circle" size={28} color={Colors.success} />
      </View>
      <View style={[styles.activeSubInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <Text style={styles.activeSubTitle}>{t('active_subscription')}</Text>
        <Text style={styles.activeSubRoute} numberOfLines={1}>
          {activeSub.routes?.title || t('route')}
        </Text>
        <View style={[styles.activeSubFooter, isRTL && { flexDirection: 'row-reverse' }]}>
          <Text style={styles.activeSubDate}>
            {t('expires')}: {new Date(activeSub.end_date).toLocaleDateString(language === 'ar' ? 'ar-IQ' : 'en-US')}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.trackMiniButton} onPress={onTrackTrip}>
        <Ionicons name="navigate" size={20} color={Colors.white} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  activeSubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.success,
    ...Shadow.md,
  },
  activeSubIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.successSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.sm,
  },
  activeSubInfo: {
    flex: 1,
    paddingHorizontal: Spacing.xs,
  },
  activeSubTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.success,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activeSubRoute: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.text,
    marginVertical: 2,
  },
  activeSubFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeSubDate: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.textMuted,
  },
  trackMiniButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
});
