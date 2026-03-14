import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/Toast";
import { apiRequest, queryClient } from "@/lib/query-client";

const CATEGORIES = ["전체", "자유", "질문", "나눔", "분실·신고", "동네맛집", "운동·모임"];

type PostAuthor = {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  location: string | null;
};

type Post = {
  id: number;
  title: string;
  content: string;
  category: string;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  location: string | null;
  createdAt: string;
  author: PostAuthor;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

function PostCard({ post, onPress }: { post: Post; onPress: () => void }) {
  const preview = post.content.replace(/\n/g, " ").slice(0, 80);
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{post.category}</Text>
        </View>
        <Text style={styles.cardTime}>{timeAgo(post.createdAt)}</Text>
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>{post.title}</Text>
      <Text style={styles.cardContent} numberOfLines={2}>{preview}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.authorName}>{post.author.nickname}</Text>
        <Text style={styles.dotSep}>·</Text>
        <Text style={styles.locationText}>{post.author.location || "오전동"}</Text>
        <View style={styles.cardStats}>
          <Ionicons name="heart-outline" size={13} color={Colors.textLight} />
          <Text style={styles.statText}>{post.likeCount}</Text>
          <Ionicons name="chatbubble-outline" size={12} color={Colors.textLight} style={{ marginLeft: 8 }} />
          <Text style={styles.statText}>{post.commentCount}</Text>
          <Ionicons name="eye-outline" size={13} color={Colors.textLight} style={{ marginLeft: 8 }} />
          <Text style={styles.statText}>{post.viewCount}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function WriteModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("자유");
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/community/posts", {
        title,
        content,
        category,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
      showToast("게시글이 등록되었습니다", "success");
      setTitle("");
      setContent("");
      setCategory("자유");
      onClose();
    },
    onError: (e: any) => showToast(e.message || "오류가 발생했습니다", "error"),
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} style={styles.modalCancel}>
            <Text style={styles.modalCancelText}>취소</Text>
          </Pressable>
          <Text style={styles.modalTitle}>글쓰기</Text>
          <Pressable
            onPress={() => mutation.mutate()}
            disabled={!title.trim() || !content.trim() || mutation.isPending}
            style={[
              styles.modalSubmit,
              (!title.trim() || !content.trim()) && styles.modalSubmitDisabled,
            ]}
          >
            {mutation.isPending ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.modalSubmitText}>완료</Text>
            )}
          </Pressable>
        </View>

        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.catScroll}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {CATEGORIES.filter((c) => c !== "전체").map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                style={[
                  styles.catChip,
                  category === cat && styles.catChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.catChipText,
                    category === cat && styles.catChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <TextInput
            style={styles.titleInput}
            placeholder="제목을 입력하세요"
            placeholderTextColor={Colors.textLight}
            value={title}
            onChangeText={setTitle}
            maxLength={50}
          />
          <View style={styles.divider} />
          <TextInput
            style={styles.contentInput}
            placeholder="이웃들과 나누고 싶은 이야기를 적어보세요 :)"
            placeholderTextColor={Colors.textLight}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState("전체");
  const [writeVisible, setWriteVisible] = useState(false);
  const webTop = Platform.OS === "web" ? 67 : 0;

  const { data: posts, isLoading, refetch, isRefetching } = useQuery<Post[]>({
    queryKey: ["/api/community/posts", activeCategory],
    queryFn: async () => {
      const { getApiUrl } = await import("@/lib/query-client");
      const url = new URL("/api/community/posts", getApiUrl());
      if (activeCategory !== "전체") url.searchParams.set("category", activeCategory);
      const res = await fetch(url.toString(), { credentials: "include" });
      return res.json();
    },
  });

  const handleWrite = useCallback(() => {
    if (!user) {
      router.push("/login" as any);
      return;
    }
    setWriteVisible(true);
  }, [user]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTop }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>동네생활</Text>
        <Pressable onPress={handleWrite} style={styles.writeBtn}>
          <Ionicons name="pencil" size={18} color={Colors.primary} />
        </Pressable>
      </View>

      {/* Category Tabs */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(c) => c}
        showsHorizontalScrollIndicator={false}
        style={styles.catList}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setActiveCategory(item)}
            style={[styles.catTab, activeCategory === item && styles.catTabActive]}
          >
            <Text style={[styles.catTabText, activeCategory === item && styles.catTabTextActive]}>
              {item}
            </Text>
          </Pressable>
        )}
      />

      {/* Post List */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={posts ?? []}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80) },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="post-outline" size={56} color={Colors.border} />
              <Text style={styles.emptyTitle}>아직 게시글이 없어요</Text>
              <Text style={styles.emptyDesc}>첫 번째 이웃 이야기를 남겨보세요!</Text>
              <Pressable onPress={handleWrite} style={styles.emptyBtn}>
                <Text style={styles.emptyBtnText}>글쓰기</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onPress={() => router.push(`/community/${item.id}`)}
            />
          )}
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={handleWrite}
        style={[styles.fab, { bottom: insets.bottom + (Platform.OS === "web" ? 34 : 80) }]}
      >
        <Ionicons name="pencil" size={22} color={Colors.white} />
      </Pressable>

      <WriteModal visible={writeVisible} onClose={() => setWriteVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "NotoSansKR_700Bold",
    color: Colors.text,
  },
  writeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  catList: { maxHeight: 44, marginBottom: 4 },
  catTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.surface,
  },
  catTabActive: { backgroundColor: Colors.primary },
  catTabText: { fontSize: 13, fontFamily: "NotoSansKR_500Medium", color: Colors.textSecondary },
  catTabTextActive: { color: Colors.white },
  listContent: { paddingTop: 8 },
  card: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  categoryBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
  },
  categoryBadgeText: { fontSize: 11, fontFamily: "NotoSansKR_500Medium", color: Colors.primary },
  cardTime: { fontSize: 12, color: Colors.textLight, marginLeft: "auto" },
  cardTitle: { fontSize: 16, fontFamily: "NotoSansKR_700Bold", color: Colors.text, marginBottom: 4 },
  cardContent: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 10 },
  cardFooter: { flexDirection: "row", alignItems: "center" },
  authorName: { fontSize: 12, fontFamily: "NotoSansKR_500Medium", color: Colors.textSecondary },
  dotSep: { fontSize: 12, color: Colors.textLight, marginHorizontal: 4 },
  locationText: { fontSize: 12, color: Colors.textLight },
  cardStats: { flexDirection: "row", alignItems: "center", marginLeft: "auto" },
  statText: { fontSize: 12, color: Colors.textLight, marginLeft: 3 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontFamily: "NotoSansKR_700Bold", color: Colors.text, marginTop: 16 },
  emptyDesc: { fontSize: 14, color: Colors.textSecondary, marginTop: 6, textAlign: "center" },
  emptyBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 20,
  },
  emptyBtnText: { fontSize: 14, fontFamily: "NotoSansKR_700Bold", color: Colors.white },
  fab: {
    position: "absolute",
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  modalCancel: { padding: 4 },
  modalCancelText: { fontSize: 15, color: Colors.textSecondary, fontFamily: "NotoSansKR_500Medium" },
  modalTitle: { fontSize: 17, fontFamily: "NotoSansKR_700Bold", color: Colors.text },
  modalSubmit: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: Colors.primary,
    borderRadius: 16,
  },
  modalSubmitDisabled: { backgroundColor: Colors.border },
  modalSubmitText: { fontSize: 14, fontFamily: "NotoSansKR_700Bold", color: Colors.white },
  modalBody: { flex: 1, backgroundColor: Colors.white },
  catScroll: { paddingVertical: 12 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catChipText: { fontSize: 13, fontFamily: "NotoSansKR_500Medium", color: Colors.textSecondary },
  catChipTextActive: { color: Colors.white },
  titleInput: {
    fontSize: 18,
    fontFamily: "NotoSansKR_700Bold",
    color: Colors.text,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 20 },
  contentInput: {
    fontSize: 15,
    fontFamily: "NotoSansKR_400Regular",
    color: Colors.text,
    paddingHorizontal: 20,
    paddingTop: 16,
    minHeight: 300,
    lineHeight: 24,
  },
});
