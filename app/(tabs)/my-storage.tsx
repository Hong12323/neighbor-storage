import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Image,
  Platform,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Ionicons,
  MaterialCommunityIcons,
  Feather,
} from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { formatPrice } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/Toast";
import { apiRequest, queryClient } from "@/lib/query-client";
import { EmptyState } from "@/components/ui/EmptyState";
import { Shimmer } from "@/components/ui/ShimmerPlaceholder";

export default function MyStorageScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"active" | "history" | "wallet">("active");
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const { data: walletData, isLoading: walletLoading } = useQuery<{
    balance: number;
    transactions: any[];
  }>({
    queryKey: ["/api/wallet"],
    enabled: !!user,
  });

  const { data: rentalsData, isLoading: rentalsLoading } = useQuery<any[]>({
    queryKey: ["/api/rentals"],
    enabled: !!user,
  });

  const { data: itemsData } = useQuery<any[]>({
    queryKey: ["/api/items"],
  });

  const topupMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await apiRequest("POST", "/api/wallet/topup", { amount });
      return res.json();
    },
    onSuccess: (data) => {
      showToast(`${data.message} 잔액: ${formatPrice(data.balance)}`, "success");
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      refreshUser();
    },
    onError: () => showToast("충전에 실패했습니다", "error"),
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/wallet/withdraw", {
        amount: walletData?.balance || 0,
      });
      return res.json();
    },
    onSuccess: (data) => {
      showToast(data.message, "success");
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      refreshUser();
    },
    onError: () => showToast("출금 요청에 실패했습니다", "error"),
  });

  const loading = walletLoading || rentalsLoading;
  const balance = walletData?.balance ?? user?.balance ?? 0;
  const txns = walletData?.transactions || [];
  const allRentals = rentalsData || [];
  const activeRentals = allRentals.filter(
    (r: any) => r.status === "renting" || r.status === "requested" || r.status === "paid" || r.status === "accepted",
  );
  const historyRentals = allRentals.filter(
    (r: any) => r.status === "returned" || r.status === "completed" || r.status === "disputed",
  );
  const totalDeposits = activeRentals.reduce(
    (sum: number, r: any) => sum + (r.depositHeld || 0),
    0,
  );

  const getItemForRental = (itemId: number) => {
    return itemsData?.find((i: any) => i.id === itemId);
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      requested: "요청 중",
      accepted: "수락됨",
      paid: "결제 완료",
      renting: "대여 중",
      returned: "반납 완료",
      completed: "완료",
      disputed: "분쟁 중",
    };
    return map[status] || status;
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      requested: Colors.warning,
      accepted: "#2196F3",
      paid: "#2196F3",
      renting: Colors.success,
      returned: Colors.textLight,
      completed: Colors.success,
      disputed: Colors.error,
    };
    return map[status] || Colors.textSecondary;
  };

  const getTxnColor = (type: string) => {
    if (type === "CHARGE" || type === "EARNING" || type === "REFUND") return Colors.success;
    return Colors.error;
  };

  const getTxnSign = (amount: number) => (amount >= 0 ? "+" : "");

  const displayRecords = activeTab === "active" ? activeRentals : historyRentals;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          { paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 8 },
        ]}
      >
        <Text style={styles.headerTitle}>내 창고</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={styles.walletCard}>
          <View style={styles.walletTop}>
            <View style={styles.walletIconWrap}>
              <MaterialCommunityIcons name="wallet" size={22} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.walletLabel}>내 지갑 잔액</Text>
              {loading ? (
                <Shimmer width={120} height={28} style={{ marginTop: 4 }} />
              ) : (
                <Text style={styles.walletAmount}>{formatPrice(balance)}</Text>
              )}
            </View>
          </View>
          <View style={styles.walletDivider} />
          <View style={styles.walletBottom}>
            <View style={styles.walletInfoRow}>
              <Feather name="shield" size={14} color={Colors.success} />
              <Text style={styles.walletInfoText}>
                보증금 에스크로: {formatPrice(totalDeposits)}
              </Text>
            </View>
            <View style={styles.walletBtnRow}>
              <Pressable
                style={styles.topupBtn}
                onPress={() => topupMutation.mutate(50000)}
                disabled={topupMutation.isPending}
              >
                {topupMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.topupText}>+50,000원 충전</Text>
                )}
              </Pressable>
              <Pressable
                style={styles.withdrawBtn}
                onPress={() => withdrawMutation.mutate()}
                disabled={withdrawMutation.isPending || balance <= 0}
              >
                {withdrawMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Text style={styles.withdrawText}>출금하기</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{activeRentals.length}</Text>
            <Text style={styles.statLabel}>대여 중</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{historyRentals.length}</Text>
            <Text style={styles.statLabel}>이용 완료</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {itemsData?.filter((i: any) => i.ownerId === user?.id).length || 0}
            </Text>
            <Text style={styles.statLabel}>내 물건</Text>
          </View>
        </View>

        <View style={styles.tabRow}>
          {(
            [
              { key: "active", label: `대여 중 (${activeRentals.length})` },
              { key: "history", label: `이용 내역 (${historyRentals.length})` },
              { key: "wallet", label: "거래 내역" },
            ] as const
          ).map((tab) => (
            <Pressable
              key={tab.key}
              style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === "wallet" ? (
          txns.length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              iconFamily="material-community"
              title="거래 내역이 없어요"
              subtitle="충전하거나 대여를 시작해보세요"
            />
          ) : (
            txns.map((txn: any) => (
              <View key={txn.id} style={styles.txnCard}>
                <View style={styles.txnLeft}>
                  <View
                    style={[
                      styles.txnIconWrap,
                      { backgroundColor: getTxnColor(txn.type) + "15" },
                    ]}
                  >
                    <Ionicons
                      name={txn.amount >= 0 ? "arrow-down" : "arrow-up"}
                      size={16}
                      color={getTxnColor(txn.type)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txnDesc} numberOfLines={1}>
                      {txn.description}
                    </Text>
                    <Text style={styles.txnDate}>
                      {new Date(txn.createdAt).toLocaleDateString("ko-KR")}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[styles.txnAmount, { color: getTxnColor(txn.type) }]}
                >
                  {getTxnSign(txn.amount)}
                  {formatPrice(Math.abs(txn.amount))}
                </Text>
              </View>
            ))
          )
        ) : loading ? (
          <View style={styles.loadingContainer}>
            {[1, 2].map((i) => (
              <View key={i} style={styles.rentalCard}>
                <Shimmer width={90} height={90} borderRadius={0} />
                <View style={{ flex: 1, padding: 12, gap: 6 }}>
                  <Shimmer width="70%" height={14} />
                  <Shimmer width="50%" height={12} />
                  <Shimmer width="40%" height={14} />
                </View>
              </View>
            ))}
          </View>
        ) : displayRecords.length === 0 ? (
          <EmptyState
            icon="archive-off-outline"
            iconFamily="material-community"
            title={
              activeTab === "active"
                ? "대여 중인 물건이 없어요"
                : "이용 내역이 없어요"
            }
            subtitle="홈에서 필요한 물건을 찾아보세요"
          />
        ) : (
          displayRecords.map((record: any) => {
            const item = getItemForRental(record.itemId);
            return (
              <Pressable key={record.id} style={styles.rentalCard}>
                <Image
                  source={{
                    uri: item?.images?.[0] || "https://picsum.photos/seed/default/200/200",
                  }}
                  style={styles.rentalImage}
                />
                <View style={styles.rentalInfo}>
                  <View style={styles.rentalTop}>
                    <Text style={styles.rentalTitle} numberOfLines={1}>
                      {item?.title || "물건"}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            getStatusColor(record.status) + "18",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(record.status) },
                        ]}
                      >
                        {getStatusLabel(record.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.rentalDate}>
                    {record.startDate} ~ {record.endDate}
                  </Text>
                  <View style={styles.rentalBottom}>
                    <Text style={styles.rentalFee}>
                      {formatPrice(record.totalFee)}
                    </Text>
                    {record.depositHeld > 0 && (
                      <View style={styles.depositTag}>
                        <Feather name="lock" size={10} color={Colors.primary} />
                        <Text style={styles.depositText}>
                          {formatPrice(record.depositHeld)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 22,
    color: Colors.textPrimary,
  },
  walletCard: {
    margin: 16,
    borderRadius: 20,
    backgroundColor: Colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: "hidden",
  },
  walletTop: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 12,
  },
  walletIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  walletLabel: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  walletAmount: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 26,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  walletDivider: { height: 1, backgroundColor: Colors.border },
  walletBottom: { padding: 14, paddingHorizontal: 18 },
  walletInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  walletInfoText: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  walletBtnRow: { flexDirection: "row", gap: 10 },
  topupBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  topupText: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 13,
    color: Colors.secondary,
  },
  withdrawBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: "center",
  },
  withdrawText: {
    fontFamily: "NotoSansKR_500Medium",
    fontSize: 13,
    color: Colors.primary,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    backgroundColor: Colors.white,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statNumber: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 20,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  tabRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    gap: 6,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: Colors.white,
  },
  tabBtnActive: { backgroundColor: Colors.secondary },
  tabText: {
    fontFamily: "NotoSansKR_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  tabTextActive: { color: Colors.white },
  loadingContainer: { paddingHorizontal: 16 },
  rentalCard: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  rentalImage: {
    width: 90,
    height: 90,
    backgroundColor: Colors.surface,
  },
  rentalInfo: { flex: 1, padding: 10, justifyContent: "space-between" },
  rentalTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  rentalTitle: {
    fontFamily: "NotoSansKR_500Medium",
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 6,
  },
  statusBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  statusText: { fontFamily: "NotoSansKR_500Medium", fontSize: 10 },
  rentalDate: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 11,
    color: Colors.textLight,
  },
  rentalBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rentalFee: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  depositTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.primary + "12",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  depositText: {
    fontFamily: "NotoSansKR_500Medium",
    fontSize: 10,
    color: Colors.primary,
  },
  txnCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  txnLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  txnIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  txnDesc: {
    fontFamily: "NotoSansKR_500Medium",
    fontSize: 13,
    color: Colors.textPrimary,
  },
  txnDate: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 2,
  },
  txnAmount: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 14,
    marginLeft: 8,
  },
});
