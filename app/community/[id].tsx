import React, { useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  TextInput,
  FlatList,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/Toast";
import { apiRequest, queryClient, getApiUrl } from "@/lib/query-client";

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

export default function CommunityPostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [comment, setComment] = useState("");
  const inputRef = useRef<TextInput>(null);

  const {
    data: post,
    isLoading: postLoading,
  } = useQuery<any>({
    queryKey: ["/api/community/posts", id],
    queryFn: async () => {
      const res = await fetch(new URL(`/api/community/posts/${id}`, getApiUrl()).toString(), {
        credentials: "include",
      });
      return res.json();
    },
    enabled: !!id,
  });

  const {
    data: comments,
    isLoading: commentsLoading,
    refetch: refetchComments,
  } = useQuery<any[]>({
    queryKey: ["/api/community/posts", id, "comments"],
    queryFn: async () => {
      const res = await fetch(
        new URL(`/api/community/posts/${id}/comments`, getApiUrl()).toString(),
        { credentials: "include" },
      );
      return res.json();
    },
    enabled: !!id,
  });

  const { data: likes } = useQuery<any[]>({
    queryKey: ["/api/community/likes"],
    enabled: !!user,
  });

  const liked = likes?.some((l: any) => l.postId === Number(id));

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/community/posts/${id}/like`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/likes"] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/community/posts/${id}/comments`, { content });
      return res.json();
    },
    onSuccess: () => {
      setComment("");
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts", id] });
      showToast("댓글이 등록되었습니다", "success");
    },
    onError: () => showToast("오류가 발생했습니다", "error"),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      const res = await apiRequest("DELETE", `/api/community/comments/${commentId}`, {});
      return res.json();
    },
    onSuccess: () => {
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts", id] });
      showToast("댓글을 삭제했습니다", "info");
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/community/posts/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
      showToast("게시글을 삭제했습니다", "info");
      router.back();
    },
  });

  const handleLike = () => {
    if (!user) { router.push("/login" as any); return; }
    likeMutation.mutate();
  };

  const handleComment = () => {
    if (!user) { router.push("/login" as any); return; }
    if (!comment.trim()) return;
    commentMutation.mutate(comment.trim());
  };

  const handleDeletePost = () => {
    Alert.alert("게시글 삭제", "정말 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: () => deletePostMutation.mutate() },
    ]);
  };

  const handleDeleteComment = (commentId: number) => {
    Alert.alert("댓글 삭제", "정말 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: () => deleteCommentMutation.mutate(commentId) },
    ]);
  };

  if (postLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>게시글을 불러올 수 없습니다</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>돌아가기</Text>
        </Pressable>
      </View>
    );
  }

  const isAuthor = user?.id === post.author?.id;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{post.category}</Text>
        </View>
        {isAuthor && (
          <Pressable onPress={handleDeletePost} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
          </Pressable>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Post Body */}
        <View style={styles.postBody}>
          <Text style={styles.postTitle}>{post.title}</Text>

          <View style={styles.authorRow}>
            <View style={styles.authorAvatar}>
              <Text style={styles.authorAvatarText}>
                {(post.author?.nickname || "?")[0]}
              </Text>
            </View>
            <View>
              <Text style={styles.authorName}>{post.author?.nickname}</Text>
              <Text style={styles.authorMeta}>
                {post.author?.location || "오전동"} · {timeAgo(post.createdAt)}
              </Text>
            </View>
          </View>

          <Text style={styles.postContent}>{post.content}</Text>

          <View style={styles.postStats}>
            <Pressable onPress={handleLike} style={styles.likeBtn}>
              <Ionicons
                name={liked ? "heart" : "heart-outline"}
                size={18}
                color={liked ? Colors.error : Colors.textLight}
              />
              <Text style={[styles.statText, liked && { color: Colors.error }]}>
                {post.likeCount}
              </Text>
            </Pressable>
            <View style={styles.statItem}>
              <Ionicons name="chatbubble-outline" size={16} color={Colors.textLight} />
              <Text style={styles.statText}>{post.commentCount}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={16} color={Colors.textLight} />
              <Text style={styles.statText}>{post.viewCount}</Text>
            </View>
          </View>
        </View>

        {/* Comments */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>
            댓글 {comments?.length ?? 0}개
          </Text>

          {commentsLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 16 }} />
          ) : comments?.length === 0 ? (
            <View style={styles.emptyComments}>
              <Ionicons name="chatbubble-outline" size={32} color={Colors.border} />
              <Text style={styles.emptyCommentsText}>첫 댓글을 남겨보세요!</Text>
            </View>
          ) : (
            comments?.map((c: any) => (
              <View key={c.id} style={styles.commentCard}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>
                    {(c.author?.nickname || "?")[0]}
                  </Text>
                </View>
                <View style={styles.commentBody}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>{c.author?.nickname}</Text>
                    <Text style={styles.commentTime}>{timeAgo(c.createdAt)}</Text>
                    {user?.id === c.author?.id && (
                      <Pressable onPress={() => handleDeleteComment(c.id)} style={styles.commentDelete}>
                        <Ionicons name="close" size={14} color={Colors.textLight} />
                      </Pressable>
                    )}
                  </View>
                  <Text style={styles.commentContent}>{c.content}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Comment Input */}
      <View
        style={[
          styles.inputBar,
          { paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 12) },
        ]}
      >
        <TextInput
          ref={inputRef}
          style={styles.commentInput}
          placeholder="따뜻한 댓글을 남겨주세요 :)"
          placeholderTextColor={Colors.textLight}
          value={comment}
          onChangeText={setComment}
          multiline={false}
          returnKeyType="send"
          onSubmitEditing={handleComment}
        />
        <Pressable
          onPress={handleComment}
          disabled={!comment.trim() || commentMutation.isPending}
          style={[
            styles.sendBtn,
            (!comment.trim() || commentMutation.isPending) && styles.sendBtnDisabled,
          ]}
        >
          {commentMutation.isPending ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Ionicons name="send" size={16} color={Colors.white} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: { padding: 8 },
  categoryBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 4,
  },
  categoryBadgeText: { fontSize: 12, fontFamily: "NotoSansKR_500Medium", color: Colors.primary },
  deleteBtn: { marginLeft: "auto", padding: 8 },
  scroll: { flex: 1 },
  postBody: {
    backgroundColor: Colors.white,
    padding: 20,
    borderBottomWidth: 8,
    borderBottomColor: Colors.surface,
  },
  postTitle: {
    fontSize: 20,
    fontFamily: "NotoSansKR_700Bold",
    color: Colors.text,
    marginBottom: 16,
    lineHeight: 28,
  },
  authorRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  authorAvatarText: { fontSize: 16, fontFamily: "NotoSansKR_700Bold", color: Colors.white },
  authorName: { fontSize: 14, fontFamily: "NotoSansKR_700Bold", color: Colors.text },
  authorMeta: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  postContent: {
    fontSize: 15,
    fontFamily: "NotoSansKR_400Regular",
    color: Colors.text,
    lineHeight: 24,
    marginBottom: 20,
  },
  postStats: { flexDirection: "row", alignItems: "center", paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border, gap: 16 },
  likeBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  statText: { fontSize: 14, color: Colors.textLight, fontFamily: "NotoSansKR_500Medium" },
  commentsSection: { backgroundColor: Colors.white, marginTop: 8, padding: 20 },
  commentsTitle: { fontSize: 16, fontFamily: "NotoSansKR_700Bold", color: Colors.text, marginBottom: 16 },
  emptyComments: { alignItems: "center", paddingVertical: 32 },
  emptyCommentsText: { fontSize: 14, color: Colors.textLight, marginTop: 8 },
  commentCard: { flexDirection: "row", marginBottom: 16 },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    flexShrink: 0,
  },
  commentAvatarText: { fontSize: 13, fontFamily: "NotoSansKR_700Bold", color: Colors.primary },
  commentBody: { flex: 1 },
  commentHeader: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  commentAuthor: { fontSize: 13, fontFamily: "NotoSansKR_700Bold", color: Colors.text, marginRight: 6 },
  commentTime: { fontSize: 12, color: Colors.textLight },
  commentDelete: { marginLeft: "auto", padding: 4 },
  commentContent: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "NotoSansKR_400Regular",
    color: Colors.text,
    maxHeight: 80,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: Colors.border },
  errorText: { fontSize: 16, color: Colors.textSecondary, marginBottom: 16 },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 20,
  },
  backBtnText: { fontSize: 14, fontFamily: "NotoSansKR_700Bold", color: Colors.white },
});
