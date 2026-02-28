# Replit MD

## Overview

**이웃창고 (Neighbor Storage)** is a hyper-local item rental platform targeting residents of Uiwang-si, Korea. The concept is "My neighborhood is my warehouse" — enabling both C2C (neighbor-to-neighbor) and B2C (local shop-to-consumer) item rentals. Users can list items for rent, browse nearby listings, chat with owners, handle checkout with deposit escrow, and manage their rental history. The app supports features like Pro Partner shops, express delivery via neighbor riders, deposit escrow, and knowledge sharing (teaching how to use rented tools).

The project is built as an **Expo (React Native)** mobile app with a **Node.js/Express** backend server, using **PostgreSQL** via **Drizzle ORM** for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Mobile App)
- **Framework:** Expo SDK 54 with React Native 0.81, using the new architecture
- **Routing:** `expo-router` v6 with file-based routing and typed routes. Uses a tab-based navigation with 5 tabs (Home, Chat, Upload, My Storage, Settings) implemented via `(tabs)/_layout.tsx`
- **State Management:** `@tanstack/react-query` for all server state (items, users, wallet, chat, rentals); local React state (`useState`) for UI state
- **Auth:** `lib/auth-context.tsx` provides AuthProvider with login/signup/logout, redirects unauthenticated users via AuthGate in `_layout.tsx`
- **Fonts:** Noto Sans KR (400, 500, 700) loaded via `@expo-google-fonts/noto-sans-kr`
- **Design System:**
  - Primary color: `#FFD700` (Mustard Yellow)
  - Secondary/text: `#333333` (Dark Gray)
  - Surface: `#F5F5F5`, Cards: `#FFFFFF`
  - Accent: `#FF4500` (Orange for Express tags)
  - Border radius: 16px for cards
  - All defined in `constants/colors.ts`
- **Toast Notifications:** `components/Toast.tsx` provides ToastProvider with success/error/warning/info types, animated slide-in/out
- **Key UI Libraries:** `react-native-reanimated`, `react-native-gesture-handler`, `react-native-safe-area-context`, `react-native-screens`, `expo-haptics`, `expo-image`, `expo-blur`
- **UI Components:** Custom shimmer loading placeholders (`components/ui/ShimmerPlaceholder.tsx`), empty states (`components/ui/EmptyState.tsx`), error boundary (`components/ErrorBoundary.tsx`)

### Screen Structure
- `app/(tabs)/index.tsx` — Home screen with category filters, item listings (real API via `/api/items`)
- `app/(tabs)/chat.tsx` — Chat list screen (real API via `/api/chat/rooms`)
- `app/(tabs)/upload-placeholder.tsx` — Redirects to upload modal
- `app/(tabs)/my-storage.tsx` — Wallet balance, top-up, transactions, rental management (real API)
- `app/(tabs)/settings.tsx` — User profile, logout, admin dashboard link
- `app/item/[id].tsx` — Item detail with image carousel, owner info, reviews (real API via `/api/items/:id`)
- `app/checkout.tsx` — Checkout with delivery method, deposit escrow, real payment (real API via `/api/rentals`)
- `app/chat-room.tsx` — Individual chat with polling, rental action buttons (real API)
- `app/upload-modal.tsx` — Item listing form (real API via POST `/api/items`)
- `app/login.tsx` — Login/signup with validation
- `app/admin.tsx` — Admin dashboard with stats, user/item/rental management

### Backend (Express Server)
- **Runtime:** Node.js with Express 5, TypeScript compiled via `tsx` (dev) or `esbuild` (prod)
- **Location:** `server/` directory — `index.ts` (entry), `routes.ts` (API routes), `db.ts` (database connection)
- **Auth:** Express sessions with `connect-pg-simple`, bcryptjs for password hashing, `SESSION_SECRET` env var
- **API Endpoints:**
  - Auth: `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
  - Items: `GET /api/items`, `GET /api/items/:id`, `POST /api/items` (auth required)
  - Rentals: `GET /api/rentals`, `POST /api/rentals`, `PATCH /api/rentals/:id/status`
  - Wallet: `GET /api/wallet`, `POST /api/wallet/topup`, `POST /api/wallet/withdraw`, `GET /api/wallet/transactions`
  - Chat: `GET /api/chat/rooms`, `POST /api/chat/rooms`, `GET /api/chat/rooms/:id/messages`, `POST /api/chat/rooms/:id/messages`
  - Users: `GET /api/users/:id`
  - Reviews: `GET /api/reviews/item/:itemId`
  - Admin: `GET /api/admin/stats`, `GET /api/admin/users`, `GET /api/admin/items`, etc.

### Database
- **ORM:** Drizzle ORM with PostgreSQL dialect
- **Schema:** Defined in `shared/schema.ts`:
  - `users` — id (varchar UUID), email, password, nickname, avatarUrl, balance, trustScore, isAdmin, isBanned, isShopOwner, shopName, location, bio
  - `items` — id (serial), ownerId, title, category, pricePerDay, deposit, isProItem, canTeach, canDeliver, images (text[]), description, location, viewCount, likeCount, rating, reviewCount, isDeleted
  - `rentals` — id (serial), itemId, borrowerId, ownerId, status (requested→accepted→paid→renting→returned→completed), startDate, endDate, totalFee, depositHeld, isDelivery, deliveryFee
  - `transactions` — id (serial), userId, type, amount, description, relatedRentalId
  - `reviews` — id (serial), rentalId, reviewerId, targetId, itemId, score, comment
  - `chatRooms` — id (serial), user1Id, user2Id, itemId, lastMessage, lastMessageTime
  - `chatMessages` — id (serial), roomId, senderId, text, isSystem
- **Schema Push:** `npm run db:push`
- **Validation:** `drizzle-zod` generates Zod schemas from Drizzle table definitions

### Data Flow
- All screens now use real API via `@tanstack/react-query` and `lib/query-client.ts`
- `apiRequest()` makes HTTP calls to the Express backend with credentials included
- Default query function joins query keys to form URL paths (e.g., `['/api/items', id]` → `/api/items/{id}`)
- New users get 100,000원 welcome balance on signup
- Rental lifecycle: requested → accepted → paid → renting → returned → completed (with escrow deposit flow)

### Build & Deployment
- **Dev mode:** Two processes — `expo:dev` (Metro bundler on port 8081) and `server:dev` (Express on port 5000)
- **Production build:** `expo:static:build` creates a static web bundle, `server:build` bundles the server with esbuild, `server:prod` serves the production build

### Korean Language (i18n)
- All user-facing strings are in Korean. The app targets a Korean market exclusively.

## External Dependencies

### Core Infrastructure
- **PostgreSQL** — Primary database, connected via `DATABASE_URL` environment variable
- **Drizzle ORM** — Database toolkit for schema definition and queries
- **Express 5** — HTTP server framework
- **connect-pg-simple** — PostgreSQL session store for Express
- **bcryptjs** — Password hashing

### Expo/React Native Ecosystem
- **Expo SDK 54** — App framework
- **expo-router** — File-based routing
- **expo-haptics** — Tactile feedback
- **expo-crypto** — UUID generation

### UI Libraries
- **react-native-reanimated** — Animations
- **react-native-gesture-handler** — Touch handling
- **react-native-keyboard-controller** — Keyboard-aware scrolling
- **expo-blur / expo-glass-effect** — Visual effects

### Data & Networking
- **@tanstack/react-query** — Server state management and caching
- **zod** — Runtime type validation
- **pg** — PostgreSQL client

### Environment Variables Required
- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — Express session secret
- `EXPO_PUBLIC_DOMAIN` — Domain for API requests from frontend
- `REPLIT_DEV_DOMAIN` — Replit development domain (auto-set)
- `REPLIT_DOMAINS` — Replit deployment domains for CORS (auto-set)
