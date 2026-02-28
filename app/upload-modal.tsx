import React, { useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TextInput, Pressable, Platform, Switch, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { categories } from '@/lib/mock-data';
import { useToast } from '@/components/Toast';
import { apiRequest, queryClient } from '@/lib/query-client';
import { useAuth } from '@/lib/auth-context';

export default function UploadModal() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [deposit, setDeposit] = useState('');
  const [description, setDescription] = useState('');
  const [canTeach, setCanTeach] = useState(false);
  const [canDeliver, setCanDeliver] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isValid = title.length > 0 && category.length > 0 && price.length > 0 && deposit.length > 0;

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);

    try {
      const res = await apiRequest('POST', '/api/items', {
        title,
        category,
        pricePerDay: parseInt(price.replace(/,/g, ''), 10) || 0,
        deposit: parseInt(deposit.replace(/,/g, ''), 10) || 0,
        isProItem: false,
        canTeach,
        canDeliver,
        images: ['https://picsum.photos/seed/' + Date.now() + '/600/400'],
        description: description || title,
        location: user?.location || '오전동',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || '등록 실패');
      }

      queryClient.invalidateQueries({ queryKey: ['/api/items'] });

      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('물건이 성공적으로 등록되었습니다!', 'success');
      router.back();
    } catch (e: any) {
      showToast(e.message || '등록에 실패했습니다.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const uploadCategories = categories.filter(c => c !== '전체');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>물건 등록</Text>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={Colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable style={styles.imageUpload} testID="add-photo">
          <View style={styles.imageUploadIconWrap}>
            <Ionicons name="camera" size={24} color={Colors.primary} />
          </View>
          <Text style={styles.imageUploadTitle}>사진 추가</Text>
          <Text style={styles.imageUploadDesc}>최대 10장까지 등록 가능</Text>
        </Pressable>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>제목 <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="물건 이름을 입력하세요"
            placeholderTextColor={Colors.textLight}
            value={title}
            onChangeText={setTitle}
            maxLength={50}
            testID="title-input"
          />
          <Text style={styles.charCount}>{title.length}/50</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>카테고리 <Text style={styles.required}>*</Text></Text>
          <View style={styles.categoryGrid}>
            {uploadCategories.map(cat => (
              <Pressable
                key={cat}
                style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>{cat}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.priceRow}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>일 대여료 <Text style={styles.required}>*</Text></Text>
            <View style={styles.priceInputWrap}>
              <TextInput
                style={styles.priceInput}
                placeholder="10,000"
                placeholderTextColor={Colors.textLight}
                keyboardType="number-pad"
                value={price}
                onChangeText={setPrice}
                testID="price-input"
              />
              <Text style={styles.priceUnit}>원</Text>
            </View>
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>보증금 <Text style={styles.required}>*</Text></Text>
            <View style={styles.priceInputWrap}>
              <TextInput
                style={styles.priceInput}
                placeholder="30,000"
                placeholderTextColor={Colors.textLight}
                keyboardType="number-pad"
                value={deposit}
                onChangeText={setDeposit}
                testID="deposit-input"
              />
              <Text style={styles.priceUnit}>원</Text>
            </View>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>상세 설명</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="물건의 상태, 사용법, 대여 조건 등을 자세히 알려주세요"
            placeholderTextColor={Colors.textLight}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
            maxLength={500}
            testID="desc-input"
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>

        <View style={styles.toggleSection}>
          <Text style={styles.toggleSectionTitle}>추가 옵션</Text>
          <View style={styles.toggleCard}>
            <View style={styles.toggleRow}>
              <View style={[styles.toggleIconWrap, { backgroundColor: Colors.primary + '15' }]}>
                <Feather name="book-open" size={16} color={Colors.primary} />
              </View>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>사용법 안내 가능</Text>
                <Text style={styles.toggleDesc}>빌리는 분에게 사용법을 알려줄 수 있어요</Text>
              </View>
              <Switch
                value={canTeach}
                onValueChange={setCanTeach}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.white}
              />
            </View>
            <View style={styles.toggleDivider} />
            <View style={styles.toggleRow}>
              <View style={[styles.toggleIconWrap, { backgroundColor: Colors.accent + '15' }]}>
                <Ionicons name="flash" size={16} color={Colors.accent} />
              </View>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>이웃 퀵 배송 가능</Text>
                <Text style={styles.toggleDesc}>동네 이웃 라이더가 문 앞까지 배달</Text>
              </View>
              <Switch
                value={canDeliver}
                onValueChange={setCanDeliver}
                trackColor={{ false: Colors.border, true: Colors.accent }}
                thumbColor={Colors.white}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 8 }]}>
        <Pressable
          style={[styles.submitBtn, (!isValid || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || submitting}
          testID="submit-btn"
        >
          <Text style={[styles.submitBtnText, (!isValid || submitting) && styles.submitBtnTextDisabled]}>
            {submitting ? '등록 중...' : '등록하기'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontFamily: 'NotoSansKR_700Bold', fontSize: 18, color: Colors.textPrimary },
  scrollContent: { padding: 16 },
  imageUpload: {
    alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 130, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed',
    borderColor: Colors.primary + '50', backgroundColor: Colors.primary + '08',
    marginBottom: 20,
  },
  imageUploadIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  imageUploadTitle: { fontFamily: 'NotoSansKR_500Medium', fontSize: 14, color: Colors.primary },
  imageUploadDesc: { fontFamily: 'NotoSansKR_400Regular', fontSize: 12, color: Colors.textLight },
  field: { marginBottom: 18 },
  fieldLabel: { fontFamily: 'NotoSansKR_500Medium', fontSize: 14, color: Colors.textPrimary, marginBottom: 8 },
  required: { color: Colors.accent, fontSize: 14 },
  input: {
    backgroundColor: Colors.surface, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: 'NotoSansKR_400Regular', fontSize: 14, color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.border,
  },
  textArea: { height: 110, textAlignVertical: 'top' as const },
  charCount: { fontFamily: 'NotoSansKR_400Regular', fontSize: 11, color: Colors.textLight, textAlign: 'right', marginTop: 4 },
  priceRow: { flexDirection: 'row', gap: 12 },
  priceInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    paddingRight: 12,
  },
  priceInput: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: 'NotoSansKR_400Regular', fontSize: 14, color: Colors.textPrimary,
  },
  priceUnit: { fontFamily: 'NotoSansKR_400Regular', fontSize: 14, color: Colors.textLight },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  categoryChipActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  categoryText: { fontFamily: 'NotoSansKR_500Medium', fontSize: 13, color: Colors.textSecondary },
  categoryTextActive: { color: Colors.white },
  toggleSection: { marginTop: 4, marginBottom: 16 },
  toggleSectionTitle: { fontFamily: 'NotoSansKR_500Medium', fontSize: 14, color: Colors.textPrimary, marginBottom: 10 },
  toggleCard: { backgroundColor: Colors.surface, borderRadius: 14, overflow: 'hidden' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  toggleIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontFamily: 'NotoSansKR_500Medium', fontSize: 14, color: Colors.textPrimary },
  toggleDesc: { fontFamily: 'NotoSansKR_400Regular', fontSize: 11, color: Colors.textLight, marginTop: 2 },
  toggleDivider: { height: 1, backgroundColor: Colors.border, marginLeft: 58 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1, borderTopColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 4,
  },
  submitBtn: {
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: Colors.surfaceDark },
  submitBtnText: { fontFamily: 'NotoSansKR_700Bold', fontSize: 16, color: Colors.secondary },
  submitBtnTextDisabled: { color: Colors.textLight },
});
