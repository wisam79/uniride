import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadow, FontFamily } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../hooks/useTranslation';
import { useRouter } from 'expo-router';

export const LicenseActivationBanner: React.FC = () => {
  const { t, isRTL } = useTranslation();
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.licenseBanner}
      onPress={() => router.push('/activate')}
      activeOpacity={0.8}
    >
      <View style={styles.licenseBannerContent}>
        <Ionicons name="card-outline" size={24} color={Colors.primary} />
        <View>
          <Text style={styles.licenseBannerTitle}>{t('activate_new_license')}</Text>
          <Text style={styles.licenseBannerSubtitle}>{t('activate_license_description')}</Text>
        </View>
      </View>
      <Ionicons
        name={isRTL ? 'chevron-back' : 'chevron-forward'}
        size={20}
        color={Colors.border}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  licenseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  licenseBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  licenseBannerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.text,
    textAlign: 'right',
  },
  licenseBannerSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
});
