import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useTranslation } from '../../src/hooks/useTranslation';
import { Colors, FontFamily, Spacing, BorderRadius, Shadow } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

export default function RatingScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert(t('alert'), t('please_rate'));
      return;
    }

    try {
      setIsSubmitting(true);
      const { error } = await supabase.rpc('submit_rating', {
        p_trip_id: tripId,
        p_rating: rating,
        p_comment: comment.trim() || null,
      });

      if (error) throw error;

      Alert.alert(t('thank_you'), t('rating_success'), [
        { text: t('ok'), onPress: () => router.push('/') },
      ]);
    } catch (err: any) {
      Alert.alert(t('error'), err.message || t('error_generic'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('how_was_trip')}</Text>
          <Text style={styles.subtitle}>{t('rating_subtitle')}</Text>
        </View>

        <View style={styles.starContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
              <Ionicons
                name={star <= rating ? 'star' : 'star-outline'}
                size={48}
                color={star <= rating ? Colors.warning : Colors.border}
              />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('additional_notes_optional')}
          </Text>
          <TextInput
            style={[styles.textInput, { textAlign: isRTL ? 'right' : 'left' }]}
            placeholder={t('comment_placeholder')}
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={4}
            value={comment}
            onChangeText={setComment}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, (rating === 0 || isSubmitting) && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={rating === 0 || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.submitText}>{t('submit_rating')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => router.push('/')}
          disabled={isSubmitting}
        >
          <Text style={styles.skipText}>{t('skip')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, alignItems: 'center', paddingTop: 80 },
  header: { alignItems: 'center', marginBottom: Spacing.xxxl },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 26,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  starContainer: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xxxl },
  inputContainer: { width: '100%', marginBottom: Spacing.xxxl },
  label: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'right',
  },
  textInput: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    height: 120,
    textAlignVertical: 'top',
    textAlign: 'right',
    fontFamily: FontFamily.regular,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  submitButton: {
    width: '100%',
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    ...Shadow.md,
  },
  disabledButton: { backgroundColor: Colors.border },
  submitText: { fontFamily: FontFamily.bold, fontSize: 18, color: Colors.white },
  skipButton: { padding: Spacing.md },
  skipText: { fontFamily: FontFamily.medium, fontSize: 16, color: Colors.textMuted },
});
