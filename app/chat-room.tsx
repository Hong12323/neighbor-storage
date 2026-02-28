import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  Image,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import {
  Ionicons,
  Feather,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { formatPrice } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/Toast";
import { apiRequest, queryClient, getApiUrl } from "@/lib/query-client";

interface ChatMsg {
  id: number;
  roomId: number;
  senderId: string;
  text: string;
  isSystem: boolean;
  createdAt: string;
}

function MessageBubble({ msg, currentUserId }: { msg: ChatMsg; currentUserId: string }) {
  const isMe = msg.senderId === currentUserId;
  const isSystem = msg.isSystem;

  if (isSystem) {
    return (
      <View style={styles.systemMsg}>
        <Feather name="info" size={12} color={Colors.textLight} />
        <Text style={styles.systemMsgText}>{msg.text}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.bubbleRow, isMe && styles.bubbleRowMe]}>
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
        <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
          {msg.text}
        </Text>
      </View>
      <Text style={styles.bubbleTime}>
        {new Date(msg.createdAt).toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })}
      </Text>
    </View>
  );
}

export default function ChatRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const numericRoomId = parseInt(roomId || "0");

  const { data: rooms } = useQuery<any[]>({
    queryKey: ["/api/chat/rooms"],
    enabled: !!user,
  });

  const room = rooms?.find((r: any) => r.id === numericRoomId);
  const otherUserId = room
    ? room.user1Id === user?.id
      ? room.user2Id
      : room.user1Id
    : null;

  const { data: otherUser } = useQuery<any>({
    queryKey: ["/api/users", otherUserId],
    enabled: !!otherUserId,
  });

  const { data: chatItem } = useQuery<any>({
    queryKey: ["/api/items", room?.itemId?.toString()],
    enabled: !!room?.itemId,
  });

  const { data: messages = [], refetch: refetchMessages } = useQuery<ChatMsg[]>({
    queryKey: ["/api/chat/rooms", roomId, "messages"],
    enabled: !!roomId && numericRoomId > 0,
    refetchInterval: 3000,
  });

  const { data: allRentals } = useQuery<any[]>({
    queryKey: ["/api/rentals"],
    enabled: !!user,
    refetchInterval: 3000,
  });

  const rental = allRentals?.find(
    (r: any) => r.itemId === room?.itemId && (r.borrowerId === user?.id || r.ownerId === user?.id),
  );

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", `/api/chat/rooms/${numericRoomId}/messages`, {
        text,
      });
      return res.json();
    },
    onSuccess: () => {
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ rentalId, status }: { rentalId: number; status: string }) => {
      const res = await apiRequest("PUT", `/api/rentals/${rentalId}/status`, { status });
      return res.json();
    },
    onSuccess: (data, variables) => {
      const statusLabels: Record<string, string> = {
        accepted: "대여 요청을 수락했습니다",
        paid: "결제가 완료되었습니다",
        renting: "대여가 시작되었습니다",
        returned: "반납 처리되었습니다",
        completed: "거래가 완료되었습니다. 보증금이 환불됩니다.",
      };
      showToast(statusLabels[variables.status] || "상태가 변경되었습니다", "success");

      apiRequest("POST", `/api/chat/rooms/${numericRoomId}/messages`, {
        text: statusLabels[variables.status] || "상태가 변경되었습니다",
        isSystem: true,
      }).then(() => refetchMessages());

      queryClient.invalidateQueries({ queryKey: ["/api/rentals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      refreshUser();
    },
    onError: (err: any) => {
      const msg = err?.message?.includes(":") ? err.message.split(": ").slice(1).join(": ") : "오류가 발생했습니다";
      try {
        const parsed = JSON.parse(msg);
        showToast(parsed.message || "상태 변경 실패", "error");
      } catch {
        showToast(msg, "error");
      }
    },
  });

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMutation.mutate(inputText.trim());
    setInputText("");
  };

  const handleStatusChange = (status: string) => {
    if (!rental) return;
    statusMutation.mutate({ rentalId: rental.id, status });
  };

  const isOwner = rental?.ownerId === user?.id;
  const isBorrower = rental?.borrowerId === user?.id;

  const getActionButton = () => {
    if (!rental) return null;
    const s = rental.status;

    if (s === "requested" && isOwner) {
      return { label: "수락하기", status: "accepted", color: "#2196F3" };
    }
    if (s === "accepted" && isBorrower) {
      const total = rental.totalFee + rental.depositHeld;
      return { label: `결제하기 ${formatPrice(total)}`, status: "paid", color: Colors.primary };
    }
    if (s === "paid" && isOwner) {
      return { label: "대여 시작", status: "renting", color: Colors.success };
    }
    if (s === "renting" && isBorrower) {
      return { label: "반납하기", status: "returned", color: Colors.warning };
    }
    if (s === "returned" && isOwner) {
      return { label: "반납 확인 (완료)", status: "completed", color: Colors.success };
    }
    return null;
  };

  const actionBtn = getActionButton();

  if (!roomId || numericRoomId === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>채팅방을 찾을 수 없습니다</Text>
        <Pressable onPress={() => router.back()} style={styles.errorBtn}>
          <Text style={styles.errorBtnText}>돌아가기</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View
        style={[
          styles.header,
          { paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 4 },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerName}>
            {otherUser?.nickname || "대화 상대"}
          </Text>
          {otherUser?.isShopOwner && (
            <MaterialCommunityIcons name="crown" size={14} color={Colors.primary} />
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {chatItem && (
        <Pressable
          style={styles.itemBar}
          onPress={() =>
            router.push({
              pathname: "/item/[id]",
              params: { id: chatItem.id.toString() },
            })
          }
        >
          <Image
            source={{ uri: chatItem.images?.[0] || "https://picsum.photos/200" }}
            style={styles.itemBarImage}
          />
          <View style={styles.itemBarInfo}>
            <Text style={styles.itemBarTitle} numberOfLines={1}>
              {chatItem.title}
            </Text>
            <Text style={styles.itemBarPrice}>
              {formatPrice(chatItem.pricePerDay)}/일
            </Text>
          </View>
          {rental && (
            <View
              style={[
                styles.statusBtnView,
                { backgroundColor: getStatusColor(rental.status) },
              ]}
            >
              <Text style={styles.statusBtnText}>
                {getStatusLabel(rental.status)}
              </Text>
            </View>
          )}
        </Pressable>
      )}

      {actionBtn && (
        <View style={styles.actionBar}>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: actionBtn.color }]}
            onPress={() => handleStatusChange(actionBtn.status)}
            disabled={statusMutation.isPending}
          >
            {statusMutation.isPending ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.actionBtnText}>{actionBtn.label}</Text>
            )}
          </Pressable>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        style={styles.messageList}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        renderItem={({ item }) => (
          <MessageBubble msg={item} currentUserId={user?.id || ""} />
        )}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
      />

      <View
        style={[
          styles.inputBar,
          { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 8 },
        ]}
      >
        <TextInput
          style={styles.input}
          placeholder="메시지를 입력하세요"
          placeholderTextColor={Colors.textLight}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          testID="chat-input"
        />
        <Pressable
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || sendMutation.isPending}
          testID="send-btn"
        >
          {sendMutation.isPending ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Ionicons
              name="send"
              size={18}
              color={inputText.trim() ? Colors.white : Colors.textLight}
            />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    requested: "요청",
    accepted: "수락",
    paid: "결제됨",
    renting: "대여중",
    returned: "반납",
    completed: "완료",
  };
  return map[status] || status;
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    requested: Colors.warning,
    accepted: "#2196F3",
    paid: "#2196F3",
    renting: Colors.success,
    returned: Colors.textLight,
    completed: Colors.success,
  };
  return map[status] || Colors.textSecondary;
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
    paddingBottom: 10,
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
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerName: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 16,
    color: Colors.textPrimary,
  },
  itemBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemBarImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  itemBarInfo: { flex: 1, marginLeft: 10 },
  itemBarTitle: {
    fontFamily: "NotoSansKR_500Medium",
    fontSize: 13,
    color: Colors.textPrimary,
  },
  itemBarPrice: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
  },
  statusBtnView: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBtnText: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 11,
    color: Colors.white,
  },
  actionBar: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  actionBtnText: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 15,
    color: Colors.white,
  },
  messageList: { flex: 1 },
  bubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 8,
    gap: 6,
  },
  bubbleRowMe: { flexDirection: "row-reverse" },
  bubble: {
    maxWidth: "75%",
    borderRadius: 16,
    padding: 10,
    paddingHorizontal: 14,
  },
  bubbleMe: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleText: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  bubbleTextMe: { color: Colors.secondary },
  bubbleTime: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 10,
    color: Colors.textLight,
  },
  systemMsg: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.surfaceDark,
    borderRadius: 12,
    alignSelf: "center",
  },
  systemMsgText: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },
  sendBtnDisabled: { backgroundColor: Colors.surfaceDark },
});
