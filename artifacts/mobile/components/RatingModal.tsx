import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";
import FeatherIcon from "@/components/FeatherIcon";

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  tripId: string;
  driverName: string;
  onSubmitted?: () => void;
}

export default function RatingModal({
  visible,
  onClose,
  tripId,
  driverName,
  onSubmitted,
}: RatingModalProps) {
  const colors = useColors();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRating = (value: number) => {
    setRating(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setLoading(true);
    try {
      await api.post("/ratings", {
        tripId,
        rating,
        comment,
      });
      onSubmitted?.();
      onClose();
    } catch (error) {
      // Error handled by api.ts but we should stop loading
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={[styles.content, { backgroundColor: colors.card }]}>
          <View style={[styles.handle, { backgroundColor: colors.mutedForeground + "40" }]} />
          
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>تقييم الرحلة</Text>
            <Text style={[styles.driverName, { color: colors.mutedForeground }]}>
              {driverName}
            </Text>
          </View>

          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => handleRating(star)}
                style={styles.starButton}
              >
                <Text style={[
                  styles.starText,
                  { color: star <= rating ? "#FFD700" : colors.border }
                ]}>
                  {star <= rating ? "★" : "☆"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="أضف تعليقاً (اختياري)..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={4}
            value={comment}
            onChangeText={setComment}
            textAlign="right"
          />

          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: colors.primary, opacity: rating === 0 || loading ? 0.6 : 1 },
            ]}
            onPress={handleSubmit}
            disabled={rating === 0 || loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
                إرسال التقييم
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.cancelButton} disabled={loading}>
            <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>إلغاء</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    marginBottom: 24,
    alignSelf: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    marginBottom: 8,
  },
  driverName: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
  },
  starsContainer: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    gap: 12,
    marginBottom: 32,
  },
  starButton: {
    padding: 4,
  },
  starText: {
    fontSize: 40,
  },
  input: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    height: 120,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    marginBottom: 24,
    textAlignVertical: "top",
  },
  submitButton: {
    width: "100%",
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  submitText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
  },
  cancelButton: {
    padding: 12,
  },
  cancelText: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
  },
});
