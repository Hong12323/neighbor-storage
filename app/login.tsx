import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/Toast";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, signup } = useAuth();
  const { showToast } = useToast();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      showToast("이메일과 비밀번호를 입력해주세요", "warning");
      return;
    }
    if (isSignUp && !nickname.trim()) {
      showToast("닉네임을 입력해주세요", "warning");
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        await signup(email.trim(), password, nickname.trim());
        showToast("회원가입 완료! 환영합니다 🎉", "success");
      } else {
        await login(email.trim(), password);
        showToast("로그인 성공!", "success");
      }
    } catch (err: any) {
      const msg = err?.message?.includes(":") ? err.message.split(": ").slice(1).join(": ") : "오류가 발생했습니다";
      try {
        const parsed = JSON.parse(msg);
        showToast(parsed.message || "오류가 발생했습니다", "error");
      } catch {
        showToast(msg, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 60 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons name="warehouse" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.appName}>이웃창고</Text>
          <Text style={styles.tagline}>우리 동네 물건 대여 플랫폼</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {isSignUp ? "회원가입" : "로그인"}
          </Text>

          {isSignUp && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>닉네임</Text>
              <TextInput
                style={styles.input}
                placeholder="닉네임을 입력해주세요"
                placeholderTextColor={Colors.textLight}
                value={nickname}
                onChangeText={setNickname}
                autoCapitalize="none"
                testID="nickname-input"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>이메일</Text>
            <TextInput
              style={styles.input}
              placeholder="example@email.com"
              placeholderTextColor={Colors.textLight}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              testID="email-input"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>비밀번호</Text>
            <TextInput
              style={styles.input}
              placeholder="6자 이상 입력해주세요"
              placeholderTextColor={Colors.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              testID="password-input"
            />
          </View>

          <Pressable
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            testID="submit-btn"
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.secondary} />
            ) : (
              <Text style={styles.submitBtnText}>
                {isSignUp ? "회원가입" : "로그인"}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={styles.switchBtn}
            onPress={() => setIsSignUp(!isSignUp)}
          >
            <Text style={styles.switchText}>
              {isSignUp
                ? "이미 계정이 있으신가요? 로그인"
                : "계정이 없으신가요? 회원가입"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  logoSection: { alignItems: "center", marginBottom: 40 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + "20",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  appName: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 32,
    color: Colors.textPrimary,
  },
  tagline: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  formTitle: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 20,
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  inputGroup: { marginBottom: 16 },
  inputLabel: {
    fontFamily: "NotoSansKR_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 16,
    color: Colors.secondary,
  },
  switchBtn: { alignItems: "center", marginTop: 16 },
  switchText: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
