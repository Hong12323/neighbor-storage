import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Image,
  Platform,
  TextInput,
  RefreshControl,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { categories, formatPrice, formatRelativeTime } from "@/lib/mock-data";
import { ProCardShimmer, ItemCardShimmer } from "@/components/ui/ShimmerPlaceholder";
import { EmptyState } from "@/components/ui/EmptyState";
import { queryClient } from "@/lib/query-client";
import { useAuth } from "@/lib/auth-context";

const SCREEN_WIDTH = Dimensions.get("window").width;

function ProPartnerCard({ item }: { item: any }) {
  return (
    <Pressable
      style={styles.proCard}
      onPress={() =>
        router.push({ pathname: "/item/[id]", params: { id: item.id.toString() } })
      }
    >
      <Image
        source={{ uri: item.images?.[0] || "https://picsum.photos/200" }}
        style={styles.proImage}
      />
      <View style={styles.proGradient} />
      <View style={styles.proOverlay}>
        <View style={styles.proBadge}>
          <MaterialCommunityIcons name="crown" size={11} color={Colors.primary} />
          <Text style={styles.proBadgeText}>PRO</Text>
        </View>
      </View>
      <View style={styles.proInfo}>
        <Text style={styles.proTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.proMeta}>
          <Text style={styles.proShop}>{item.location}</Text>
          <View style={styles.proRating}>
            <Ionicons name="star" size={10} color={Colors.primary} />
            <Text style={styles.proRatingText}>{item.rating}</Text>
          </View>
        </View>
        <Text style={styles.proPrice}>
          {formatPrice(item.pricePerDay)}
          <Text style={styles.proPriceUnit}>/일</Text>
        </Text>
      </View>
    </Pressable>
  );
}

function ItemCard({ item }: { item: any }) {
  return (
    <Pressable
      style={styles.itemCard}
      onPress={() =>
        router.push({ pathname: "/item/[id]", params: { id: item.id.toString() } })
      }
    >
      <View style={styles.itemImageContainer}>
        <Image
          source={{ uri: item.images?.[0] || "https://picsum.photos/200" }}
          style={styles.itemImage}
        />
        {item.isProItem && (
          <View style={styles.itemProTag}>
            <MaterialCommunityIcons name="shield-check" size={10} color={Colors.white} />
          </View>
        )}
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.itemMeta}>
          <Text style={styles.itemLocation}>{item.location}</Text>
          <Text style={styles.itemDot}>·</Text>
          <Text style={styles.itemTime}>
            {formatRelativeTime(item.createdAt)}
          </Text>
        </View>
        <Text style={styles.itemPrice}>
          {formatPrice(item.pricePerDay)}
          <Text style={styles.itemPriceUnit}>/일</Text>
        </Text>
        <View style={styles.itemBottom}>
          <View style={styles.itemTags}>
            {item.canDeliver && (
              <View style={styles.expressTag}>
                <Ionicons name="flash" size={9} color={Colors.white} />
                <Text style={styles.expressTagText}>퀵</Text>
              </View>
            )}
            {item.canTeach && (
              <View style={styles.teachTag}>
                <Feather name="book-open" size={9} color={Colors.primaryDark} />
                <Text style={styles.teachTagText}>레슨</Text>
              </View>
            )}
          </View>
          <View style={styles.itemStats}>
            <Ionicons name="heart" size={11} color={Colors.textLight} />
            <Text style={styles.itemStatText}>{item.likeCount}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchText, setSearchText] = useState("");

  const {
    data: allItems = [],
    isLoading: loading,
    isError,
    refetch,
  } = useQuery<any[]>({
    queryKey: ["/api/items"],
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const proItems = allItems.filter((i: any) => i.isProItem);

  const filteredItems = (() => {
    let items = allItems;
    if (searchText) {
      const q = searchText.toLowerCase();
      items = items.filter(
        (i: any) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q),
      );
    } else if (selectedCategory !== "전체") {
      items = items.filter((i: any) => i.category === selectedCategory);
    }
    return items;
  })();

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          {
            paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 4,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <Pressable style={styles.locationBtn}>
            <Ionicons name="location-sharp" size={18} color={Colors.primary} />
            <Text style={styles.locationText}>
              {user?.location || "오전동"}
            </Text>
            <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} />
          </Pressable>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => setSearchVisible(!searchVisible)}
              style={styles.iconBtn}
              testID="search-btn"
            >
              <Ionicons
                name={searchVisible ? "close" : "search"}
                size={22}
                color={Colors.textPrimary}
              />
            </Pressable>
            <Pressable style={styles.iconBtn}>
              <Ionicons
                name="notifications-outline"
                size={22}
                color={Colors.textPrimary}
              />
              <View style={styles.notifDot} />
            </Pressable>
          </View>
        </View>
        {searchVisible && (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="어떤 물건이 필요하세요?"
              placeholderTextColor={Colors.textLight}
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
              testID="search-input"
            />
            {!!searchText && (
              <Pressable onPress={() => setSearchText("")}>
                <Ionicons name="close-circle" size={16} color={Colors.textLight} />
              </Pressable>
            )}
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {!searchVisible && proItems.length > 0 && (
          <View style={styles.proSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <MaterialCommunityIcons
                  name="crown"
                  size={18}
                  color={Colors.primary}
                />
                <Text style={styles.sectionTitle}>우리 동네 프로 파트너</Text>
              </View>
              <Text style={styles.sectionSubtitle}>검증된 전문 대여 업체</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.proList}
            >
              {loading ? (
                <>
                  <ProCardShimmer />
                  <ProCardShimmer />
                  <ProCardShimmer />
                </>
              ) : (
                proItems.map((item: any) => (
                  <ProPartnerCard key={item.id} item={item} />
                ))
              )}
            </ScrollView>
          </View>
        )}

        <View style={styles.categorySection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}
          >
            {categories.map((cat) => (
              <Pressable
                key={cat}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat && styles.categoryChipActive,
                ]}
                onPress={() => {
                  setSelectedCategory(cat);
                  setSearchText("");
                }}
                testID={`cat-${cat}`}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === cat && styles.categoryTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>
              {searchText
                ? `"${searchText}" 검색 결과`
                : selectedCategory === "전체"
                  ? "최근 등록된 물건"
                  : selectedCategory}
            </Text>
            <Text style={styles.recentCount}>{filteredItems.length}개</Text>
          </View>
          {loading ? (
            <>
              <ItemCardShimmer />
              <ItemCardShimmer />
              <ItemCardShimmer />
            </>
          ) : isError ? (
            <EmptyState
              icon="alert-circle-outline"
              title="데이터를 불러올 수 없어요"
              subtitle="당겨서 새로고침 해주세요"
            />
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon="search-outline"
              title="등록된 물건이 없어요"
              subtitle="물건을 등록해 보세요"
            />
          ) : (
            filteredItems.map((item: any) => (
              <ItemCard key={item.id} item={item} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 44,
  },
  locationBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  locationText: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 20,
    color: Colors.textPrimary,
  },
  headerActions: { flexDirection: "row", gap: 2 },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  notifDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    marginTop: 4,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 14,
    color: Colors.textPrimary,
    padding: 0,
  },
  scrollView: { flex: 1 },
  proSection: { paddingTop: 14 },
  sectionHeader: { paddingHorizontal: 16, marginBottom: 10 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitle: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 17,
    color: Colors.textPrimary,
  },
  sectionSubtitle: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
    marginLeft: 24,
  },
  proList: { paddingHorizontal: 16, gap: 10 },
  proCard: {
    width: 168,
    borderRadius: 16,
    backgroundColor: Colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  proImage: { width: 168, height: 115 },
  proGradient: {
    position: "absolute",
    top: 75,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: "transparent",
  },
  proOverlay: { position: "absolute", top: 8, left: 8 },
  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  proBadgeText: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 10,
    color: Colors.primaryDark,
  },
  proInfo: { padding: 10, paddingTop: 8 },
  proTitle: {
    fontFamily: "NotoSansKR_500Medium",
    fontSize: 13,
    color: Colors.textPrimary,
  },
  proMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 3,
  },
  proShop: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
  },
  proRating: { flexDirection: "row", alignItems: "center", gap: 2 },
  proRatingText: {
    fontFamily: "NotoSansKR_500Medium",
    fontSize: 10,
    color: Colors.textSecondary,
  },
  proPrice: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 15,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  proPriceUnit: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 11,
    color: Colors.textLight,
  },
  categorySection: { marginTop: 14 },
  categoryList: { paddingHorizontal: 16, gap: 7 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  categoryText: {
    fontFamily: "NotoSansKR_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  categoryTextActive: { color: Colors.white },
  recentSection: { paddingHorizontal: 16, marginTop: 18 },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  recentTitle: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 17,
    color: Colors.textPrimary,
  },
  recentCount: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 13,
    color: Colors.textLight,
  },
  itemCard: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  itemImageContainer: { position: "relative" },
  itemImage: { width: 120, height: 120 },
  itemProTag: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: { flex: 1, padding: 12, justifyContent: "space-between" },
  itemTitle: {
    fontFamily: "NotoSansKR_500Medium",
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  itemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  itemLocation: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 11,
    color: Colors.textLight,
  },
  itemDot: { color: Colors.textLight, fontSize: 11 },
  itemTime: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 11,
    color: Colors.textLight,
  },
  itemPrice: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 16,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  itemPriceUnit: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 11,
    color: Colors.textLight,
  },
  itemBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  itemTags: { flexDirection: "row", gap: 5 },
  expressTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: Colors.accent,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  expressTagText: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 9,
    color: Colors.white,
  },
  teachTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#FFF8E1",
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  teachTagText: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 9,
    color: Colors.primaryDark,
  },
  itemStats: { flexDirection: "row", alignItems: "center", gap: 3 },
  itemStatText: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 11,
    color: Colors.textLight,
  },
});
