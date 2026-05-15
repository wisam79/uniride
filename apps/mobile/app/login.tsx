import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../src/lib/supabase';
import { useTranslation } from '../src/hooks/useTranslation';
import { Colors, Typography, Spacing, BorderRadius, Shadow, FontFamily } from '../src/theme';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { t, isRTL } = useTranslation();

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      Alert.alert(t('error'), error.message);
    }
    setLoading(false);
  };

  const handleSignup = async () => {
    if (!email || !password || !fullName) return;
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          // NOTE: role in user_metadata is for display only
          // app_metadata.role is set by admin after signup
        },
      },
    });

    if (error) {
      Alert.alert(t('error'), error.message);
    } else if (data.session) {
      Alert.alert(t('hello'), t('account_created'));
    } else {
      Alert.alert(t('check_inbox_title'), t('check_inbox_msg'));
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Area */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="bus" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.appName}>UniRide</Text>
          <Text style={styles.appNameAr}>يوني رايد</Text>
          <Text style={styles.tagline}>{t('uniride_tagline')}</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{isSignup ? t('signup') : t('login')}</Text>

          {isSignup && (
            <View style={styles.inputWrapper}>
              <Ionicons
                name="person-outline"
                size={18}
                color={Colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={t('full_name')}
                placeholderTextColor={Colors.textMuted}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputWrapper}>
            <Ionicons
              name="mail-outline"
              size={18}
              color={Colors.textMuted}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              placeholder={t('email')}
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={Colors.textMuted}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, styles.inputPassword, isRTL && styles.inputRTL]}
              placeholder={t('password')}
              placeholderTextColor={Colors.textMuted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={Colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={isSignup ? handleSignup : handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.buttonText}>{isSignup ? t('signup') : t('login')}</Text>
            )}
          </TouchableOpacity>

          {!isSignup && (
            <TouchableOpacity
              style={styles.forgotButton}
              onPress={async () => {
                if (!email.trim()) {
                  Alert.alert(t('alert'), t('enter_email_first'));
                  return;
                }
                setLoading(true);
                const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
                setLoading(false);
                if (error) {
                  Alert.alert(t('error'), error.message);
                } else {
                  Alert.alert(t('sent'), t('reset_link_sent'));
                }
              }}
            >
              <Text style={styles.forgotText}>{t('forgot_password')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Switch Mode */}
        <TouchableOpacity onPress={() => setIsSignup(!isSignup)} style={styles.switchButton}>
          <Text style={styles.switchText}>
            {isSignup ? t('already_have_account') : t('dont_have_account')}
            <Text style={styles.switchLink}>{isSignup ? t('login') : t('signup')}</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxxl,
  },
  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  appName: {
    fontFamily: FontFamily.bold,
    fontSize: 32,
    color: Colors.white,
    letterSpacing: 1,
  },
  appNameAr: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    color: Colors.primary,
    marginTop: 2,
  },
  tagline: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadow.lg,
  },
  cardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    color: Colors.text,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  // Input
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputIcon: {
    marginLeft: Spacing.xs,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.text,
    textAlign: 'right',
  },
  inputRTL: {
    textAlign: 'right',
  },
  inputPassword: {
    flex: 1,
  },
  eyeButton: {
    padding: Spacing.xs,
  },
  // Button
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
    ...Shadow.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.white,
  },
  forgotButton: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  forgotText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.primary,
  },
  // Switch
  switchButton: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  switchText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.textMuted,
  },
  switchLink: {
    fontFamily: FontFamily.bold,
    color: Colors.primary,
  },
});
