import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { formatPrice } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/Toast";
import { apiRequest, queryClient } from "@/lib/query-client";

type Tab = "dashboard" | "users" | "items" | "transactions" | "rentals";

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const isWide = width > 700;

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/admin/stats"],
    enabled: !!user?.isAdmin,
  });

  const { data: adminUsers } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!user?.isAdmin && activeTab === "users",
  });

  const { data: adminItems } = useQuery<any[]>({
    queryKey: ["/api/admin/items"],
    enabled: !!user?.isAdmin && activeTab === "items",
  });

  const { data: adminTxns } = useQuery<any[]>({
    queryKey: ["/api/admin/transactions"],
    enabled: !!user?.isAdmin && activeTab === "transactions",
  });

  const { data: adminRentals } = useQuery<any[]>({
    queryKey: ["/api/admin/rentals"],
    enabled: !!user?.isAdmin && activeTab === "rentals",
  });

  const banMutation = useMutation({
    mutationFn: async ({ id, banned }: { id: string; banned: boolean }) => {
      const res = await apiRequest("PUT", `/api/admin/users/${id}/ban`, { banned });
      return res.json();
    },
    onSuccess: (data) => {
      showToast(data.message, "success");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: () => showToast("작업 실패", "error"),
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/items/${id}`);
      return res.json();
    },
    onSuccess: () => {
      showToast("삭제 완료", "success");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/items"] });
    },
    onError: () => showToast("삭제 실패", "error"),
  });

  if (!user?.isAdmin) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>관리자 권한이 필요합니다</Text>
        <Pressable onPress={() => router.back()} style={styles.errorBtn}>
          <Text style={styles.errorBtnText}>돌아가기</Text>
        </Pressable>
      </View>
    );
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "dashboard", label: "대시보드", icon: "grid-outline" },
    { key: "users", label: "사용자", icon: "people-outline" },
    { key: "items", label: "물건", icon: "cube-outline" },
    { key: "rentals", label: "대여", icon: "swap-horizontal-outline" },
    { key: "transactions", label: "거래", icon: "receipt-outline" },
  ];

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          { paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 8 },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>관리자 대시보드</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={isWide ? styles.wideLayout : undefined}>
        <ScrollView
          horizontal={!isWide}
          showsHorizontalScrollIndicator={false}
          style={isWide ? styles.sidebar : styles.tabScroll}
          contentContainerStyle={isWide ? undefined : styles.tabScrollContent}
        >
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              style={[
                isWide ? styles.sidebarItem : styles.tabChip,
                activeTab === tab.key &&
                  (isWide ? styles.sidebarItemActive : styles.tabChipActive),
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon as any}
                size={16}
                color={
                  activeTab === tab.key ? Colors.white : Colors.textSecondary
                }
              />
              <Text
                style={[
                  isWide ? styles.sidebarText : styles.tabChipText,
                  activeTab === tab.key &&
                    (isWide ? styles.sidebarTextActive : styles.tabChipTextActive),
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView
          style={isWide ? styles.mainContent : undefined}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        >
          {activeTab === "dashboard" && (
            <View>
              <View style={styles.statGrid}>
                <View style={styles.dashCard}>
                  <Ionicons name="people" size={28} color="#2196F3" />
                  <Text style={styles.dashValue}>
                    {statsLoading ? "..." : stats?.totalUsers || 0}
                  </Text>
                  <Text style={styles.dashLabel}>전체 사용자</Text>
                </View>
                <View style={styles.dashCard}>
                  <MaterialCommunityIcons name="swap-horizontal" size={28} color={Colors.success} />
                  <Text style={styles.dashValue}>
                    {statsLoading ? "..." : stats?.activeRentals || 0}
                  </Text>
                  <Text style={styles.dashLabel}>활성 대여</Text>
                </View>
                <View style={styles.dashCard}>
                  <MaterialCommunityIcons name="cash-lock" size={28} color={Colors.primary} />
                  <Text style={styles.dashValue}>
                    {statsLoading
                      ? "..."
                      : formatPrice(stats?.totalHeldMoney || 0)}
                  </Text>
                  <Text style={styles.dashLabel}>보유 금액</Text>
                </View>
              </View>
            </View>
          )}

          {activeTab === "users" &&
            (adminUsers || []).map((u: any) => (
              <View key={u.id} style={styles.listCard}>
                <View style={styles.listCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listCardTitle}>{u.nickname}</Text>
                    <Text style={styles.listCardSub}>{u.email}</Text>
                    <Text style={styles.listCardSub}>
                      잔액: {formatPrice(u.balance)} · 신뢰: {u.trustScore}점
                    </Text>
                  </View>
                  <View style={styles.listCardActions}>
                    {u.isAdmin && (
                      <View style={[styles.badge, { backgroundColor: "#2196F3" + "20" }]}>
                        <Text style={[styles.badgeText, { color: "#2196F3" }]}>
                          관리자
                        </Text>
                      </View>
                    )}
                    {u.isBanned && (
                      <View style={[styles.badge, { backgroundColor: Colors.error + "20" }]}>
                        <Text style={[styles.badgeText, { color: Colors.error }]}>
                          정지
                        </Text>
                      </View>
                    )}
                    {!u.isAdmin && (
                      <Pressable
                        style={[
                          styles.actionSmall,
                          {
                            backgroundColor: u.isBanned
                              ? Colors.success
                              : Colors.error,
                          },
                        ]}
                        onPress={() =>
                          banMutation.mutate({
                            id: u.id,
                            banned: !u.isBanned,
                          })
                        }
                      >
                        <Text style={styles.actionSmallText}>
                          {u.isBanned ? "해제" : "정지"}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            ))}

          {activeTab === "items" &&
            (adminItems || []).map((item: any) => (
              <View key={item.id} style={styles.listCard}>
                <View style={styles.listCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listCardTitle}>
                      {item.title}
                      {item.isDeleted ? " (삭제됨)" : ""}
                    </Text>
                    <Text style={styles.listCardSub}>
                      {item.category} · {formatPrice(item.pricePerDay)}/일
                    </Text>
                  </View>
                  {!item.isDeleted && (
                    <Pressable
                      style={[styles.actionSmall, { backgroundColor: Colors.error }]}
                      onPress={() => deleteItemMutation.mutate(item.id)}
                    >
                      <Text style={styles.actionSmallText}>삭제</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))}

          {activeTab === "rentals" &&
            (adminRentals || []).map((r: any) => (
              <View key={r.id} style={styles.listCard}>
                <View style={styles.listCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listCardTitle}>
                      대여 #{r.id}
                    </Text>
                    <Text style={styles.listCardSub}>
                      상태: {r.status} · 대여료: {formatPrice(r.totalFee)} · 보증금: {formatPrice(r.depositHeld)}
                    </Text>
                    <Text style={styles.listCardSub}>
                      {r.startDate} ~ {r.endDate}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor:
                          r.status === "renting" || r.status === "paid"
                            ? Colors.success + "20"
                            : Colors.textLight + "20",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        {
                          color:
                            r.status === "renting" || r.status === "paid"
                              ? Colors.success
                              : Colors.textSecondary,
                        },
                      ]}
                    >
                      {r.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

          {activeTab === "transactions" &&
            (adminTxns || []).map((t: any) => (
              <View key={t.id} style={styles.listCard}>
                <View style={styles.listCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listCardTitle}>{t.description}</Text>
                    <Text style={styles.listCardSub}>
                      유형: {t.type} ·{" "}
                      {new Date(t.createdAt).toLocaleDateString("ko-KR")}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.txnAmount,
                      {
                        color: t.amount >= 0 ? Colors.success : Colors.error,
                      },
                    ]}
                  >
                    {t.amount >= 0 ? "+" : ""}
                    {formatPrice(Math.abs(t.amount))}
                  </Text>
                </View>
              </View>
            ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  errorText: {
    fontFamily: "NotoSansKR_500Medium",
    fontSize: 16,
    color: Colors.textSecondary,
  },
  errorBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  errorBtnText: {
    fontFamily: "NotoSansKR_500Medium",
    fontSize: 14,
    color: Colors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 18,
    color: Colors.textPrimary,
  },
  wideLayout: { flexDirection: "row", flex: 1 },
  sidebar: {
    width: 180,
    backgroundColor: Colors.white,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    paddingTop: 12,
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 10,
    marginBottom: 4,
  },
  sidebarItemActive: { backgroundColor: Colors.secondary },
  sidebarText: {
    fontFamily: "NotoSansKR_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  sidebarTextActive: { color: Colors.white },
  mainContent: { flex: 1 },
  tabScroll: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    maxHeight: 52,
  },
  tabScrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    flexDirection: "row",
  },
  tabChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
  },
  tabChipActive: { backgroundColor: Colors.secondary },
  tabChipText: {
    fontFamily: "NotoSansKR_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  tabChipTextActive: { color: Colors.white },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  dashCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  dashValue: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 22,
    color: Colors.textPrimary,
  },
  dashLabel: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  listCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  listCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  listCardTitle: {
    fontFamily: "NotoSansKR_500Medium",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  listCardSub: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  listCardActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontFamily: "NotoSansKR_500Medium", fontSize: 11 },
  actionSmall: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionSmallText: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 12,
    color: Colors.white,
  },
  txnAmount: { fontFamily: "NotoSansKR_700Bold", fontSize: 14 },
});
