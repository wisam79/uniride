import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { Colors, FontFamily, Spacing, BorderRadius, Shadow } from '../src/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/hooks/useStore';
import { useTranslation } from '../src/hooks/useTranslation';

export default function ActivateLicenseScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { t, isRTL } = useTranslation();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleActivate = async () => {
    if (!code.trim() || code.trim().length !== 8) {
      Alert.alert(t('error'), t('invalid_code_length'));
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase.rpc('activate_license', {
        p_code: code.trim().toUpperCase(),
      });

      if (error) throw error;

      Alert.alert(t('success'), t('activation_success'), [
        { text: t('ok'), onPress: () => router.push('/') },
      ]);
    } catch (err: any) {
      Alert.alert(t('activation_failed'), err.message || t('invalid_code_error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons
            name={isRTL ? 'arrow-forward' : 'arrow-back'}
            size={24}
            color={Colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('activate_subscription')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="card-outline" size={80} color={Colors.primary} />
        </View>

        <Text style={styles.title}>{t('enter_license_code')}</Text>
        <Text style={styles.subtitle}>{t('activate_license_description')}</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={t('license_placeholder')}
            placeholderTextColor={Colors.textMuted}
            value={code}
            onChangeText={setCode}
            maxLength={8}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, (!code || code.length < 8 || isLoading) && styles.buttonDisabled]}
          onPress={handleActivate}
          disabled={!code || code.length < 8 || isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.buttonText}>{t('activate')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl + 20,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surfaceMuted,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.text,
  },
  content: {
    flex: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
    lineHeight: 24,
    paddingHorizontal: Spacing.md,
  },
  inputContainer: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xxxl,
    ...Shadow.sm,
  },
  input: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: 4,
    height: 60,
  },
  button: {
    width: '100%',
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  buttonDisabled: {
    backgroundColor: Colors.border,
  },
  buttonText: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.white,
  },
});
