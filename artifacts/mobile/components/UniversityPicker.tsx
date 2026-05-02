import React, { useState, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import FeatherIcon from "@/components/FeatherIcon";

interface UniversityPickerProps {
  value: string;
  onChange: (uni: string) => void;
  placeholder?: string;
}

const UNIVERSITIES = [
  "جامعة بغداد",
  "الجامعة التكنولوجية",
  "جامعة المستنصرية",
  "جامعة النهرين",
  "الجامعة الإسلامية",
  "جامعة الكوفة",
  "جامعة البصرة",
  "جامعة الموصل",
  "جامعة كربلاء",
  "جامعة ذي قار",
  "جامعة ميسان",
  "جامعة واسط",
  "جامعة القادسية",
  "جامعة تكريت",
  "جامعة الأنبار",
  "جامعة كركوك",
  "جامعة ديالى",
  "كلية الطب / بغداد",
  "المعهد التقني بغداد",
];

export default function UniversityPicker({
  value,
  onChange,
  placeholder = "اختر الجامعة",
}: UniversityPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState("");
  const colors = useColors();

  const filteredUniversities = useMemo(() => {
    return UNIVERSITIES.filter((uni) =>
      uni.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const handleSelect = (uni: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(uni);
    setModalVisible(false);
    setSearch("");
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.trigger,
          {
            borderColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.triggerLeft}>
          <FeatherIcon name="book-open" size={18} color={colors.muted} />
          <Text
            style={[
              styles.triggerText,
              { color: value ? colors.text : colors.muted },
            ]}
          >
            {value || placeholder}
          </Text>
        </View>
        <FeatherIcon name="chevron-down" size={18} color={colors.muted} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <View style={styles.dragHandle} />
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <FeatherIcon name="x" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <View
              style={[
                styles.searchInputWrapper,
                { borderColor: colors.border, backgroundColor: colors.card },
              ]}
            >
              <FeatherIcon name="search" size={18} color={colors.muted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="بحث عن جامعة..."
                placeholderTextColor={colors.muted}
                value={search}
                onChangeText={setSearch}
                textAlign="right"
              />
            </View>
          </View>

          <FlatList
            data={filteredUniversities}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isSelected = item === value;
              return (
                <TouchableOpacity
                  style={[
                    styles.itemRow,
                    isSelected && { backgroundColor: colors.primary + "15" },
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text
                    style={[
                      styles.itemText,
                      { color: isSelected ? colors.primary : colors.text },
                      isSelected && styles.itemTextBold,
                    ]}
                  >
                    {item}
                  </Text>
                  {isSelected && (
                    <FeatherIcon name="check" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
  },
  triggerLeft: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  triggerText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  modalContainer: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    paddingVertical: 10,
    position: "relative",
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
    marginBottom: 10,
  },
  closeButton: {
    position: "absolute",
    right: 20,
    top: 15,
  },
  searchContainer: {
    padding: 16,
  },
  searchInputWrapper: {
    flexDirection: "row-reverse",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  listContent: {
    paddingBottom: 40,
  },
  itemRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EEEEEE",
  },
  itemText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
  },
  itemTextBold: {
    fontFamily: "Inter_600SemiBold",
  },
});
