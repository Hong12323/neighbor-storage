import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Image,
  Platform,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { formatPrice, formatRelativeTime } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/Toast";
import { apiRequest, queryClient } from "@/lib/query-client";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function ImageCarousel({ images }: { images: string[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const safeImages =
    images && images.length > 0
      ? images
      : ["https://picsum.photos/seed/default/600/400"];
  return (
    <View>
      <FlatList
        data={safeImages}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(
            e.nativeEvent.contentOffset.x / SCREEN_WIDTH,
          );
          setActiveIndex(idx);
        }}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={styles.heroImage} />
        )}
      />
      {safeImages.length > 1 && (
        <View style={styles.dotsRow}>
          {safeImages.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [liked, setLiked] = useState(false);
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const { data: item, isLoading } = useQuery<any>({
    queryKey: ["/api/items", id],
    enabled: !!id,
  });

  const { data: owner } = useQuery<any>({
    queryKey: ["/api/users", item?.ownerId],
    enabled: !!item?.ownerId,
  });

  const { data: ownerItems = [] } = useQuery<any[]>({
    queryKey: ["/api/items"],
    enabled: !!owner,
    select: (data: any[]) =>
      data
        .filter(
          (i: any) =>
            i.ownerId === item?.ownerId && i.id !== item?.id && !i.isDeleted,
        )
        .slice(0, 5),
  });

  const { data: reviews = [] } = useQuery<any[]>({
    queryKey: ["/api/reviews/item", id],
    enabled: !!id,
  });

  const chatMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/chat/rooms", {
        otherUserId: item.ownerId,
        itemId: item.id,
      });
      return res.json();
    },
    onSuccess: (room) => {
      router.push({
        pathname: "/chat-room",
        params: { roomId: room.id.toString() },
      });
    },
    onError: () => showToast("채팅방 생성 실패", "error"),
  });

  if (isLoading || !item) {
    return (
      <View style={styles.errorContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!owner) {
    return (
      <View style={styles.errorContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const handleLike = () => {
    setLiked(!liked);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleChat = () => {
    chatMutation.mutate();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View>
          <ImageCarousel images={item.images || []} />
          <Pressable
            style={[
              styles.floatingBack,
              {
                top:
                  (Platform.OS === "web" ? webTopInset : insets.top) + 8,
              },
            ]}
            onPress={() => router.back()}
            testID="back-btn"
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={Colors.textPrimary}
            />
          </Pressable>
          <Pressable
            style={[
              styles.floatingShare,
              {
                top:
                  (Platform.OS === "web" ? webTopInset : insets.top) + 8,
              },
            ]}
          >
            <Ionicons
              name="share-outline"
              size={20}
              color={Colors.textPrimary}
            />
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.badgeRow}>
            {item.isProItem && (
              <View style={styles.proBadge}>
                <MaterialCommunityIcons
                  name="shield-check"
                  size={13}
                  color={Colors.success}
                />
                <Text style={styles.proBadgeText}>Pro 검수 완료</Text>
              </View>
            )}
            {item.canDeliver && (
              <View style={styles.expressBadge}>
                <Ionicons name="flash" size={11} color={Colors.white} />
                <Text style={styles.expressBadgeText}>이웃 퀵</Text>
              </View>
            )}
            {item.canTeach && (
              <View style={styles.teachBadge}>
                <Feather
                  name="book-open"
                  size={11}
                  color={Colors.primaryDark}
                />
                <Text style={styles.teachBadgeText}>레슨</Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>{item.title}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.category}>{item.category}</Text>
            <Text style={styles.dotText}>·</Text>
            <Text style={styles.location}>{item.location}</Text>
            <Text style={styles.dotText}>·</Text>
            <Text style={styles.time}>
              {formatRelativeTime(item.createdAt)}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={14} color={Colors.textLight} />
              <Text style={styles.statText}>{item.viewCount}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons
                name="heart-outline"
                size={14}
                color={Colors.textLight}
              />
              <Text style={styles.statText}>{item.likeCount}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="star" size={14} color={Colors.primary} />
              <Text style={styles.statText}>
                {item.rating} ({item.reviewCount})
              </Text>
            </View>
          </View>

          <View style={styles.priceCard}>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>일 대여료</Text>
              <Text style={styles.priceValue}>
                {formatPrice(item.pricePerDay)}
              </Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>보증금 (에스크로)</Text>
              <Text style={styles.depositValue}>
                {formatPrice(item.deposit)}
              </Text>
            </View>
          </View>

          {item.canTeach && (
            <View style={styles.teachCard}>
              <View style={styles.teachIcon}>
                <Feather name="book-open" size={20} color={Colors.primary} />
              </View>
              <View style={styles.teachInfo}>
                <Text style={styles.teachTitle}>사용법 알려드려요</Text>
                <Text style={styles.teachSubtitle}>
                  물건 사용이 처음이어도 걱정 마세요!
                </Text>
              </View>
            </View>
          )}

          <View style={styles.ownerSection}>
            <Pressable style={styles.ownerCard}>
              <Image
                source={{
                  uri:
                    owner.avatarUrl ||
                    `https://picsum.photos/seed/${owner.id}/100/100`,
                }}
                style={styles.ownerAvatar}
              />
              <View style={styles.ownerInfo}>
                <View style={styles.ownerNameRow}>
                  <Text style={styles.ownerName}>{owner.nickname}</Text>
                  {owner.isShopOwner && (
                    <View style={styles.shopBadge}>
                      <MaterialCommunityIcons
                        name="crown"
                        size={11}
                        color={Colors.primary}
                      />
                      <Text style={styles.shopBadgeText}>PRO</Text>
                    </View>
                  )}
                </View>
                <View style={styles.ownerMeta}>
                  <Ionicons name="star" size={12} color={Colors.primary} />
                  <Text style={styles.trustText}>
                    신뢰도 {owner.trustScore}점
                  </Text>
                  <Text style={styles.ownerDot}>·</Text>
                  <Text style={styles.ownerLocation}>{owner.location}</Text>
                </View>
              </View>
              <Pressable style={styles.chatIconBtn} onPress={handleChat}>
                <Ionicons
                  name="chatbubble-outline"
                  size={18}
                  color={Colors.primary}
                />
              </Pressable>
            </Pressable>

            {ownerItems.length > 0 && (
              <View style={styles.ownerItems}>
                <Text style={styles.ownerItemsLabel}>
                  {owner.nickname}님의 다른 물건
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {ownerItems.map((oi: any) => (
                    <Pressable
                      key={oi.id}
                      style={styles.ownerItemCard}
                      onPress={() =>
                        router.push({
                          pathname: "/item/[id]",
                          params: { id: oi.id.toString() },
                        })
                      }
                    >
                      <Image
                        source={{
                          uri:
                            oi.images?.[0] || "https://picsum.photos/200",
                        }}
                        style={styles.ownerItemImage}
                      />
                      <Text style={styles.ownerItemTitle} numberOfLines={1}>
                        {oi.title}
                      </Text>
                      <Text style={styles.ownerItemPrice}>
                        {formatPrice(oi.pricePerDay)}/일
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.descSection}>
            <Text style={styles.sectionTitle}>상품 설명</Text>
            <Text style={styles.descText}>{item.description}</Text>
          </View>

          {reviews.length > 0 && (
            <View style={styles.reviewSection}>
              <View style={styles.reviewHeaderRow}>
                <Text style={styles.sectionTitle}>이용 후기</Text>
                <Text style={styles.reviewCount}>{reviews.length}개</Text>
              </View>
              {reviews.map((review: any) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewAvatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reviewName}>이용자</Text>
                      <View style={styles.reviewStars}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Ionicons
                            key={i}
                            name={
                              i <= Math.round(review.score)
                                ? "star"
                                : "star-outline"
                            }
                            size={12}
                            color={Colors.primary}
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                  <Text style={styles.reviewText}>{review.comment}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 8,
          },
        ]}
      >
        <Pressable
          style={styles.heartBtn}
          onPress={handleLike}
          testID="like-btn"
        >
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={24}
            color={liked ? Colors.accent : Colors.textPrimary}
          />
        </Pressable>
        <Pressable
          style={styles.rentBtn}
          onPress={() =>
            router.push({
              pathname: "/checkout",
              params: { itemId: item.id.toString() },
            })
          }
          testID="rent-btn"
        >
          <Text style={styles.rentBtnText}>대여하기</Text>
          <Text style={styles.rentBtnPrice}>
            {formatPrice(item.pricePerDay)}/일
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    gap: 12,
  },
  heroImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.7,
    backgroundColor: Colors.surface,
  },
  dotsRow: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    flexDirection: "row",
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dotActive: { backgroundColor: Colors.white, width: 18 },
  floatingBack: {
    position: "absolute",
    left: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingShare: {
    position: "absolute",
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: { padding: 16 },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.success + "12",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  proBadgeText: {
    fontFamily: "NotoSansKR_500Medium",
    fontSize: 11,
    color: Colors.success,
  },
  expressBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  expressBadgeText: {
    fontFamily: "NotoSansKR_500Medium",
    fontSize: 11,
    color: Colors.white,
  },
  teachBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFF8E1",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  teachBadgeText: {
    fontFamily: "NotoSansKR_500Medium",
    fontSize: 11,
    color: Colors.primaryDark,
  },
  title: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 22,
    color: Colors.textPrimary,
    lineHeight: 30,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  category: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 13,
    color: Colors.textLight,
  },
  location: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 13,
    color: Colors.textLight,
  },
  time: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 13,
    color: Colors.textLight,
  },
  dotText: { color: Colors.textLight, fontSize: 13 },
  statsRow: { flexDirection: "row", gap: 14, marginTop: 10 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 12,
    color: Colors.textLight,
  },
  priceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  priceItem: { flex: 1 },
  priceLabel: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  priceValue: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 20,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  depositValue: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 20,
    color: Colors.primary,
    marginTop: 2,
  },
  priceDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  teachCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF8E1",
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: Colors.primaryDark + "25",
  },
  teachIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  teachInfo: { flex: 1 },
  teachTitle: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 14,
    color: Colors.primaryDark,
  },
  teachSubtitle: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  ownerSection: { marginTop: 18 },
  ownerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ownerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.surface,
  },
  ownerInfo: { flex: 1, marginLeft: 12 },
  ownerNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ownerName: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 15,
    color: Colors.textPrimary,
  },
  shopBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.primary + "18",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  shopBadgeText: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 10,
    color: Colors.primaryDark,
  },
  ownerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  trustText: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  ownerDot: { color: Colors.textLight, fontSize: 10 },
  ownerLocation: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 12,
    color: Colors.textLight,
  },
  chatIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  ownerItems: { marginTop: 12 },
  ownerItemsLabel: {
    fontFamily: "NotoSansKR_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  ownerItemCard: {
    width: 110,
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ownerItemImage: {
    width: 110,
    height: 80,
    backgroundColor: Colors.surface,
  },
  ownerItemTitle: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 11,
    color: Colors.textPrimary,
    paddingHorizontal: 6,
    paddingTop: 6,
  },
  ownerItemPrice: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 12,
    color: Colors.textPrimary,
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  descSection: { marginTop: 20 },
  sectionTitle: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  descText: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  reviewSection: { marginTop: 24 },
  reviewHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  reviewCount: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 13,
    color: Colors.textLight,
  },
  reviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceDark,
  },
  reviewName: {
    fontFamily: "NotoSansKR_500Medium",
    fontSize: 13,
    color: Colors.textPrimary,
  },
  reviewStars: { flexDirection: "row", gap: 1, marginTop: 2 },
  reviewDate: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 11,
    color: Colors.textLight,
  },
  reviewText: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
  },
  heartBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  rentBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  rentBtnText: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 16,
    color: Colors.secondary,
  },
  rentBtnPrice: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 12,
    color: Colors.secondary + "AA",
  },
});
