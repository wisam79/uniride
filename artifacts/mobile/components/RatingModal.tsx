import React, { useState, useRef } from "react";
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
  Animated,
  ScrollView,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import FeatherIcon from "@/components/FeatherIcon";
import { supabase } from "@/lib/supabase";

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  tripId: string;
  driverName: string;
  onSubmitted?: () => void;
}

const QUICK_TAGS = ["نظيف 🧹", "محترف 👔", "منضبط ⏰", "سريع ⚡", "ودود 😊"];

const RATING_INFO = [
  { label: "", color: "#94A3B8" },
  { label: "سيئ جداً", color: "#EF4444" },
  { label: "سيئ", color: "#F97316" },
  { label: "مقبول", color: "#F59E0B" },
  { label: "جيد", color: "#84CC16" },
  { label: "ممتاز! ⭐", color: "#22C55E" },
];

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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const starAnimations = [
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
  ];

  const handleRating = (value: number) => {
    setRating(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Animate the selected star
    const index = value - 1;
    Animated.sequence([
      Animated.spring(starAnimations[index], {
        toValue: 1.3,
        useNativeDriver: true,
        speed: 50,
      }),
      Animated.spring(starAnimations[index], {
        toValue: 1.0,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const toggleTag = (tag: string) => {
    let newTags: string[];
    if (selectedTags.includes(tag)) {
      newTags = selectedTags.filter(t => t !== tag);
    } else {
      newTags = [...selectedTags, tag];
    }
    setSelectedTags(newTags);
    
    // Update comment with tags without overwriting
    const tagText = tag.split(" ")[0]; // Remove emoji for text
    setComment(prev => {
      if (newTags.includes(tag)) {
        return prev ? prev + "، " + tagText : tagText;
      } else {
        return prev.replace(new RegExp(`(، )?${tagText}( ،)?`, 'g'), '').replace(/^، | ،$/g, '').trim();
      }
    });
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setLoading(true);
    try {
      // Fetch the driver ID from the trip
      const { data: trip } = await supabase.from('trips').select('driver_id').eq('id', tripId).single();
      if (!trip) throw new Error("Trip not found");

      const { data: authData } = await supabase.auth.getSession();
      const userId = authData.session?.user?.id;
      if (!userId) throw new Error("User not authenticated");

      await supabase.from('reviews').insert({
        from_user_id: userId,
        to_user_id: trip.driver_id,
        rating,
        comment,
      });

      onSubmitted?.();
      onClose();
    } catch (error) {
      console.warn("Failed to submit rating", error);
    } finally {
      setLoading(false);
    }
  };

  const getSubmitButtonColor = () => {
    if (rating >= 4) return "#22C55E";
    if (rating === 3) return "#F59E0B";
    if (rating > 0) return "#EF4444";
    return colors.primary;
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
        <ScrollView contentContainerStyle={[styles.content, { backgroundColor: colors.card }]}>
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
                <Animated.Text style={[
                  styles.starText,
                  { 
                    color: star <= rating ? "#FFD700" : colors.border,
                    transform: [{ scale: starAnimations[star - 1] }]
                  }
                ]}>
                  {star <= rating ? "★" : "☆"}
                </Animated.Text>
              </TouchableOpacity>
            ))}
          </View>

          {rating > 0 && (
            <Text style={[styles.ratingLabel, { color: RATING_INFO[rating].color }]}>
              {RATING_INFO[rating].label}
            </Text>
          )}

          <View style={styles.tagsContainer}>
            {QUICK_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() => toggleTag(tag)}
                style={[
                  styles.tagChip,
                  { 
                    backgroundColor: selectedTags.includes(tag) ? colors.primary : colors.background,
                    borderColor: selectedTags.includes(tag) ? colors.primary : colors.border 
                  }
                ]}
              >
                <Text style={[
                  styles.tagText,
                  { color: selectedTags.includes(tag) ? colors.primaryForeground : colors.text }
                ]}>
                  {tag}
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
              { backgroundColor: getSubmitButtonColor(), opacity: rating === 0 || loading ? 0.6 : 1 },
            ]}
            onPress={handleSubmit}
            disabled={rating === 0 || loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
                {rating > 0 ? `إرسال تقييم ${"★".repeat(rating)}${"☆".repeat(5 - rating)}` : "إرسال التقييم"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.cancelButton} disabled={loading}>
            <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>إلغاء</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
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
    marginBottom: 24,
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
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  starText: {
    fontSize: 44,
  },
  ratingLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    marginBottom: 24,
  },
  tagsContainer: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  input: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    height: 100,
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
