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
import { UserRole, LoginSchema, SignupSchema } from '@uniride/core';
import { Colors, Spacing, BorderRadius, Shadow, FontFamily } from '../src/theme';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { t, isRTL } = useTranslation();

  const validate = () => {
    setErrors({});
    try {
      if (isSignup) {
        SignupSchema.parse({ email, password, fullName, role: selectedRole });
      } else {
        LoginSchema.parse({ email, password });
      }
      return true;
    } catch (err: any) {
      const newErrors: Record<string, string> = {};
      err.errors?.forEach((e: any) => {
        newErrors[e.path[0]] = t(e.message);
      });
      setErrors(newErrors);
      return false;
    }
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      Alert.alert(t('error'), error.message);
    }
    setLoading(false);
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      Alert.alert(t('error'), error.message);
    } else if (data.session) {
      Alert.alert(t('success'), t('account_created'));
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
          <Text style={styles.appNameAr}>{t('welcome').split(' ')[0]}</Text>
          <Text style={styles.tagline}>{t('uniride_tagline')}</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{isSignup ? t('signup') : t('login')}</Text>

          {isSignup && (
            <View style={{ marginBottom: Spacing.md }}>
              <View style={[styles.inputWrapper, errors.fullName && styles.inputError]}>
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
              {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
            </View>
          )}

          <View style={{ marginBottom: Spacing.md }}>
            <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
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
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={{ marginBottom: Spacing.md }}>
            <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
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
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {isSignup && (
            <View style={styles.roleSection}>
              <Text style={[styles.roleLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t('i_am')}</Text>
              <View style={[styles.roleRow, isRTL && { flexDirection: 'row-reverse' }]}>
                {(['student', 'driver'] as UserRole[]).map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[styles.roleChip, selectedRole === role && styles.roleChipActive]}
                    onPress={() => setSelectedRole(role)}
                  >
                    <Ionicons
                      name={role === 'student' ? 'school-outline' : 'car-outline'}
                      size={16}
                      color={selectedRole === role ? Colors.white : Colors.primary}
                    />
                    <Text
                      style={[
                        styles.roleChipText,
                        selectedRole === role && styles.roleChipTextActive,
                      ]}
                    >
                      {t(role)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

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
            <TouchableOpacity style={styles.forgotButton}>
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
    backgroundColor: Colors.white,
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
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputIcon: {
    marginRight: Spacing.xs,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.text,
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
  errorText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
    marginHorizontal: Spacing.xs,
  },
  // Role
  roleSection: {
    marginBottom: Spacing.lg,
  },
  roleLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  roleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    gap: Spacing.xs,
  },
  roleChipActive: {
    backgroundColor: Colors.primary,
  },
  roleChipText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.primary,
  },
  roleChipTextActive: {
    color: Colors.white,
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
