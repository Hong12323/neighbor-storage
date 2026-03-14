# 🏠 이웃창고 (Neighbor Storage)

  하이퍼로컬 이웃 간 물건 대여 마켓플레이스

  ## 기술 스택

  - **프론트엔드**: Expo React Native (iOS / Android / Web)
  - **백엔드**: Node.js + Express + TypeScript
  - **데이터베이스**: PostgreSQL + Drizzle ORM
  - **상태관리**: React Query (@tanstack/react-query)
  - **라우팅**: Expo Router (파일 기반)
  - **지도**: Naver Maps

  ## 주요 기능

  - 🔑 C2C/B2C 물건 대여 (에스크로 보증금)
  - 🛵 이웃 라이더 배달 (실시간 GPS 추적)
  - 💬 동네생활 커뮤니티 게시판
  - 💰 인앱 지갑 (충전/출금/거래내역)
  - 📦 Pro 파트너 (상점)
  - 🗺️ 위치 기반 물건 검색
  - ⚡ 관리자 웹 대시보드 (`/admin-web`)

  ## 로컬 개발 환경 설정

  ### 1. 의존성 설치

  ```bash
  npm install
  ```

  ### 2. 환경 변수 설정

  ```bash
  # .env 파일 생성
  DATABASE_URL=postgresql://...
  SESSION_SECRET=your-secret-key
  PORT=5000
  ```

  ### 3. 데이터베이스 초기화

  ```bash
  npm run db:push
  ```

  ### 4. 개발 서버 실행

  ```bash
  # 백엔드 (포트 5000)
  npm run server:dev

  # 프론트엔드 (포트 8081)
  npm run expo:dev
  ```

  ## 프로젝트 구조

  ```
  ├── app/                    # Expo Router 화면
  │   ├── (tabs)/            # 탭 네비게이션
  │   │   ├── index.tsx      # 홈 (물건 목록)
  │   │   ├── community.tsx  # 동네생활
  │   │   ├── my-storage.tsx # 내 창고
  │   │   ├── chat.tsx       # 채팅
  │   │   └── settings.tsx   # 설정
  │   ├── item/[id].tsx      # 물건 상세
  │   ├── checkout.tsx       # 결제
  │   ├── chat-room.tsx      # 채팅방
  │   ├── rider.tsx          # 라이더 대시보드
  │   ├── delivery-tracking.tsx # 배달 추적
  │   └── upload-modal.tsx   # 물건 등록
  │
  ├── components/            # 공용 컴포넌트
  │   ├── LocationMap.tsx    # 지도 (웹용)
  │   └── LocationMap.native.tsx  # 지도 (앱용)
  │
  ├── server/                # Express 백엔드
  │   ├── routes.ts          # API 라우트
  │   ├── db.ts             # DB 연결
  │   └── templates/        # 웹 템플릿
  │       ├── landing-page.html   # 랜딩 페이지
  │       └── admin-dashboard.html # 관리자 대시보드
  │
  ├── shared/
  │   └── schema.ts          # DB 스키마 (Drizzle)
  │
  └── constants/
      └── colors.ts          # 색상 상수
  ```

  ## API 엔드포인트

  | 메서드 | 경로 | 설명 |
  |--------|------|------|
  | POST | /api/auth/signup | 회원가입 |
  | POST | /api/auth/login | 로그인 |
  | GET | /api/items | 물건 목록 |
  | POST | /api/items | 물건 등록 |
  | GET | /api/items/:id | 물건 상세 |
  | POST | /api/rentals | 대여 신청 |
  | GET | /api/my/rentals | 내 대여 목록 |
  | POST | /api/wallet/topup | 지갑 충전 |
  | POST | /api/rider/location | 라이더 위치 전송 |
  | GET | /admin-web | 관리자 대시보드 |

  ## 관리자 대시보드

  `http://localhost:5000/admin-web` 에서 접속

  기본 관리자 계정: `admin@test.com` / `admin123`

  ## 라이선스

  MIT
  