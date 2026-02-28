import React, { useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, Pressable, Image, Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useQuery, useMutation } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { formatPrice } from '@/lib/mock-data';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/Toast';
import { apiRequest, queryClient } from '@/lib/query-client';

type DeliveryMethod = 'pickup' | 'express';

export default function CheckoutScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [delivery, setDelivery] = useState<DeliveryMethod>('pickup');
  const [days, setDays] = useState(1);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const { data: item } = useQuery<any>({
    queryKey: ['/api/items', itemId],
    enabled: !!itemId,
  });

  const { data: owner } = useQuery<any>({
    queryKey: ['/api/users', item?.ownerId],
    enabled: !!item?.ownerId,
  });

  if (!item || !owner) {
    return (
      <View style={styles.errorContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const deliveryFee = delivery === 'express' ? 3000 : 0;
  const rentalFee = item.pricePerDay * days;
  const totalPayment = rentalFee + deliveryFee + item.deposit;

  const handleDeliveryChange = (method: DeliveryMethod) => {
    setDelivery(method);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await apiRequest('POST', '/api/rentals', {
        itemId: item.id,
        days,
        isDelivery: delivery === 'express',
      });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('대여 신청이 완료되었습니다!', 'success');
      queryClient.invalidateQueries({ queryKey: ['/api/rentals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
      refreshUser();
      setConfirmed(true);
    } catch (err: any) {
      const msg = err?.message?.includes(':') ? err.message.split(': ').slice(1).join(': ') : '오류가 발생했습니다';
      try {
        const parsed = JSON.parse(msg);
        showToast(parsed.message || '결제 실패', 'error');
      } catch {
        showToast(msg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (confirmed) {
    return (
      <View style={[styles.successContainer, { paddingTop: Platform.OS === 'web' ? webTopInset : insets.top }]}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.successContent}>
          <Animated.View entering={ZoomIn.delay(200).duration(400)} style={styles.successCircle}>
            <Ionicons name="checkmark" size={44} color={Colors.white} />
          </Animated.View>
          <Text style={styles.successTitle}>대여 신청 완료!</Text>
          <Text style={styles.successSubtitle}>소유자의 확인을 기다려 주세요</Text>
          <View style={styles.successCard}>
            <Image source={{ uri: item.images?.[0] || 'https://picsum.photos/200' }} style={styles.successImage} />
            <Text style={styles.successItem}>{item.title}</Text>
            <View style={styles.successDivider} />
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>기간</Text>
              <Text style={styles.successValue}>{days}일</Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>수령</Text>
              <Text style={styles.successValue}>{delivery === 'express' ? '이웃 퀵' : '직접 수령'}</Text>
            </View>
            <View style={styles.successDivider} />
            <View style={styles.successRow}>
              <Text style={styles.successTotalLabel}>총 결제</Text>
              <Text style={styles.successTotalValue}>{formatPrice(totalPayment)}</Text>
            </View>
          </View>
          <Pressable style={styles.successBtn} onPress={() => router.dismissAll()}>
            <Ionicons name="home-outline" size={18} color={Colors.secondary} />
            <Text style={styles.successBtnText}>홈으로</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: (Platform.OS === 'web' ? webTopInset : insets.top) + 4 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBackBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>대여 신청</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={styles.itemSummary}>
          <Image source={{ uri: item.images?.[0] || 'https://picsum.photos/200' }} style={styles.itemImage} />
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
            <View style={styles.itemOwnerRow}>
              <Image source={{ uri: owner.avatarUrl || `https://picsum.photos/seed/${owner.id}/100/100` }} style={styles.itemOwnerAvatar} />
              <Text style={styles.itemOwner}>{owner.nickname}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>대여 기간</Text>
          <View style={styles.daysSelector}>
            <Pressable
              style={[styles.daysBtn, days <= 1 && styles.daysBtnDisabled]}
              onPress={() => { if (days > 1) setDays(days - 1); }}
            >
              <Ionicons name="remove" size={20} color={days > 1 ? Colors.textPrimary : Colors.textLight} />
            </Pressable>
            <View style={styles.daysDisplay}>
              <Text style={styles.daysNumber}>{days}</Text>
              <Text style={styles.daysUnit}>일</Text>
            </View>
            <Pressable
              style={styles.daysBtn}
              onPress={() => setDays(days + 1)}
            >
              <Ionicons name="add" size={20} color={Colors.textPrimary} />
            </Pressable>
          </View>
          <View style={styles.quickDays}>
            {[1, 3, 5, 7].map(d => (
              <Pressable
                key={d}
                style={[styles.quickDayBtn, days === d && styles.quickDayBtnActive]}
                onPress={() => setDays(d)}
              >
                <Text style={[styles.quickDayText, days === d && styles.quickDayTextActive]}>{d}일</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>수령 방법</Text>
          <Pressable
            style={[styles.radioCard, delivery === 'pickup' && styles.radioCardActive]}
            onPress={() => handleDeliveryChange('pickup')}
            testID="pickup-option"
          >
            <View style={[styles.radio, delivery === 'pickup' && styles.radioActive]}>
              {delivery === 'pickup' && <View style={styles.radioInner} />}
            </View>
            <View style={styles.radioIconWrap}>
              <Feather name="map-pin" size={16} color={delivery === 'pickup' ? Colors.primary : Colors.textLight} />
            </View>
            <View style={styles.radioInfo}>
              <Text style={[styles.radioLabel, delivery === 'pickup' && styles.radioLabelActive]}>직접 수령</Text>
              <Text style={styles.radioDesc}>소유자와 약속한 장소에서 직접 만나 수령</Text>
            </View>
            <Text style={styles.radioPrice}>무료</Text>
          </Pressable>

          <Pressable
            style={[styles.radioCard, delivery === 'express' && styles.radioCardActive, { marginTop: 8 }]}
            onPress={() => handleDeliveryChange('express')}
            testID="express-option"
          >
            <View style={[styles.radio, delivery === 'express' && styles.radioActive]}>
              {delivery === 'express' && <View style={styles.radioInner} />}
            </View>
            <View style={[styles.radioIconWrap, delivery === 'express' && { backgroundColor: Colors.accent + '15' }]}>
              <Ionicons name="flash" size={16} color={delivery === 'express' ? Colors.accent : Colors.textLight} />
            </View>
            <View style={styles.radioInfo}>
              <Text style={[styles.radioLabel, delivery === 'express' && styles.radioLabelActive]}>이웃 퀵</Text>
              <Text style={styles.radioDesc}>동네 이웃이 직접 문 앞까지 배달</Text>
            </View>
            <Text style={styles.radioPriceExpress}>+3,000원</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>결제 내역</Text>
          <View style={styles.paymentCard}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>대여료 ({days}일 x {formatPrice(item.pricePerDay)})</Text>
              <Text style={styles.paymentValue}>{formatPrice(rentalFee)}</Text>
            </View>
            {deliveryFee > 0 && (
              <View style={styles.paymentRow}>
                <View style={styles.paymentLabelRow}>
                  <Ionicons name="flash" size={12} color={Colors.accent} />
                  <Text style={styles.paymentLabel}>이웃 퀵 배송비</Text>
                </View>
                <Text style={styles.paymentValue}>{formatPrice(deliveryFee)}</Text>
              </View>
            )}
            <View style={styles.paymentDivider} />
            <View style={styles.paymentRow}>
              <View style={styles.paymentLabelRow}>
                <Feather name="lock" size={12} color={Colors.primary} />
                <Text style={styles.paymentLabel}>보증금 (에스크로)</Text>
              </View>
              <Text style={styles.paymentDeposit}>{formatPrice(item.deposit)}</Text>
            </View>
            <View style={styles.escrowNote}>
              <Feather name="shield" size={13} color={Colors.success} />
              <Text style={styles.escrowText}>보증금은 안전하게 보관되며 반납 시 전액 환불됩니다.</Text>
            </View>
            <View style={styles.paymentDivider} />
            <View style={styles.paymentRow}>
              <Text style={styles.totalLabel}>총 결제 금액</Text>
              <Text style={styles.totalValue}>{formatPrice(totalPayment)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 8 }]}>
        <View style={styles.bottomTotal}>
          <Text style={styles.bottomTotalLabel}>총 결제</Text>
          <Text style={styles.bottomTotalValue}>{formatPrice(totalPayment)}</Text>
        </View>
        <Pressable style={[styles.confirmBtn, loading && { opacity: 0.6 }]} onPress={handleConfirm} disabled={loading} testID="confirm-btn">
          {loading ? (
            <ActivityIndicator size="small" color={Colors.secondary} />
          ) : (
            <Text style={styles.confirmBtnText}>결제하기</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  errorText: { fontFamily: 'NotoSansKR_500Medium', fontSize: 16, color: Colors.textSecondary },
  errorBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.primary },
  errorBtnText: { fontFamily: 'NotoSansKR_500Medium', fontSize: 14, color: Colors.white },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingBottom: 10,
    backgroundColor: Colors.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  headerBackBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'NotoSansKR_700Bold', fontSize: 18, color: Colors.textPrimary },
  itemSummary: {
    flexDirection: 'row', padding: 16,
    backgroundColor: Colors.white, marginBottom: 8,
  },
  itemImage: { width: 72, height: 72, borderRadius: 12, backgroundColor: Colors.surface },
  itemInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  itemTitle: { fontFamily: 'NotoSansKR_700Bold', fontSize: 15, color: Colors.textPrimary },
  itemOwnerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  itemOwnerAvatar: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.surface },
  itemOwner: { fontFamily: 'NotoSansKR_400Regular', fontSize: 13, color: Colors.textSecondary },
  section: { backgroundColor: Colors.white, padding: 16, marginBottom: 8 },
  sectionTitle: { fontFamily: 'NotoSansKR_700Bold', fontSize: 16, color: Colors.textPrimary, marginBottom: 12 },
  daysSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  daysBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  daysBtnDisabled: { opacity: 0.4 },
  daysDisplay: { flexDirection: 'row', alignItems: 'baseline', minWidth: 70, justifyContent: 'center' },
  daysNumber: { fontFamily: 'NotoSansKR_700Bold', fontSize: 32, color: Colors.textPrimary },
  daysUnit: { fontFamily: 'NotoSansKR_400Regular', fontSize: 16, color: Colors.textSecondary, marginLeft: 4 },
  quickDays: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 14 },
  quickDayBtn: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  quickDayBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  quickDayText: { fontFamily: 'NotoSansKR_500Medium', fontSize: 13, color: Colors.textSecondary },
  quickDayTextActive: { color: Colors.white },
  radioCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.white, gap: 10,
  },
  radioCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '06' },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.textLight,
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: Colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  radioIconWrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  radioInfo: { flex: 1 },
  radioLabel: { fontFamily: 'NotoSansKR_500Medium', fontSize: 14, color: Colors.textPrimary },
  radioLabelActive: { fontFamily: 'NotoSansKR_700Bold' },
  radioDesc: { fontFamily: 'NotoSansKR_400Regular', fontSize: 11, color: Colors.textLight, marginTop: 1 },
  radioPrice: { fontFamily: 'NotoSansKR_500Medium', fontSize: 13, color: Colors.textLight },
  radioPriceExpress: { fontFamily: 'NotoSansKR_700Bold', fontSize: 13, color: Colors.accent },
  paymentCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16 },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  paymentLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  paymentLabel: { fontFamily: 'NotoSansKR_400Regular', fontSize: 14, color: Colors.textSecondary },
  paymentValue: { fontFamily: 'NotoSansKR_500Medium', fontSize: 14, color: Colors.textPrimary },
  paymentDeposit: { fontFamily: 'NotoSansKR_500Medium', fontSize: 14, color: Colors.primary },
  paymentDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 6 },
  escrowNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.success + '0D', borderRadius: 10,
    padding: 10, marginBottom: 8,
  },
  escrowText: { fontFamily: 'NotoSansKR_400Regular', fontSize: 12, color: Colors.success, flex: 1 },
  totalLabel: { fontFamily: 'NotoSansKR_700Bold', fontSize: 16, color: Colors.textPrimary },
  totalValue: { fontFamily: 'NotoSansKR_700Bold', fontSize: 20, color: Colors.textPrimary },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 4,
  },
  bottomTotal: {},
  bottomTotalLabel: { fontFamily: 'NotoSansKR_400Regular', fontSize: 12, color: Colors.textSecondary },
  bottomTotalValue: { fontFamily: 'NotoSansKR_700Bold', fontSize: 20, color: Colors.textPrimary },
  confirmBtn: {
    paddingHorizontal: 36, paddingVertical: 14, borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  confirmBtnText: { fontFamily: 'NotoSansKR_700Bold', fontSize: 16, color: Colors.secondary },
  successContainer: { flex: 1, backgroundColor: Colors.white },
  successContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  successCircle: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
  },
  successTitle: { fontFamily: 'NotoSansKR_700Bold', fontSize: 24, color: Colors.textPrimary },
  successSubtitle: { fontFamily: 'NotoSansKR_400Regular', fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  successCard: {
    backgroundColor: Colors.surface, borderRadius: 18, padding: 20,
    width: '100%', marginTop: 24, alignItems: 'center',
  },
  successImage: { width: 60, height: 60, borderRadius: 12, backgroundColor: Colors.surfaceDark, marginBottom: 10 },
  successItem: { fontFamily: 'NotoSansKR_700Bold', fontSize: 15, color: Colors.textPrimary },
  successDivider: { height: 1, backgroundColor: Colors.border, width: '100%', marginVertical: 12 },
  successRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 6 },
  successLabel: { fontFamily: 'NotoSansKR_400Regular', fontSize: 13, color: Colors.textSecondary },
  successValue: { fontFamily: 'NotoSansKR_500Medium', fontSize: 13, color: Colors.textPrimary },
  successTotalLabel: { fontFamily: 'NotoSansKR_700Bold', fontSize: 15, color: Colors.textPrimary },
  successTotalValue: { fontFamily: 'NotoSansKR_700Bold', fontSize: 18, color: Colors.primary },
  successBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 28, paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: 14, backgroundColor: Colors.primary,
  },
  successBtnText: { fontFamily: 'NotoSansKR_700Bold', fontSize: 16, color: Colors.secondary },
});
