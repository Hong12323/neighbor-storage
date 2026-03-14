export interface User {
  id: string;
  nickname: string;
  isShopOwner: boolean;
  shopName?: string;
  trustScore: number;
  profileImage: string;
  location: string;
  bio?: string;
  joinedDate: string;
}

export interface Item {
  id: string;
  ownerId: string;
  title: string;
  category: string;
  pricePerDay: number;
  deposit: number;
  isProItem: boolean;
  canTeach: boolean;
  canDeliver: boolean;
  images: string[];
  description: string;
  location: string;
  createdAt: string;
  viewCount: number;
  likeCount: number;
  rating: number;
  reviewCount: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

export interface ChatRoom {
  id: string;
  otherUserId: string;
  itemId: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  rentalStatus?: 'none' | 'requested' | 'accepted' | 'renting' | 'returned';
}

export interface RentalRecord {
  id: string;
  itemId: string;
  borrowerId: string;
  status: 'requested' | 'paid' | 'renting' | 'returned' | 'disputed';
  startDate: string;
  endDate: string;
  totalFee: number;
  depositHeld: number;
  isDelivery: boolean;
  deliveryFee: number;
  createdAt: string;
}

export interface Review {
  id: string;
  itemId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

const CURRENT_USER_ID = 'me';

class MockDataService {
  private static instance: MockDataService;
  private _users: User[];
  private _items: Item[];
  private _chatRooms: ChatRoom[];
  private _chatMessages: Map<string, ChatMessage[]>;
  private _rentals: RentalRecord[];
  private _reviews: Review[];
  private _likedItems: Set<string>;
  private _listeners: Map<string, Set<() => void>>;

  private constructor() {
    this._listeners = new Map();
    this._likedItems = new Set();

    this._users = [
      { id: CURRENT_USER_ID, nickname: '나', isShopOwner: false, trustScore: 95, profileImage: 'https://picsum.photos/seed/myprofile/100/100', location: '오전동', bio: '의왕 주민입니다!', joinedDate: '2025-06-01' },
      { id: 'u1', nickname: '캠핑클럽 의왕점', isShopOwner: true, shopName: '캠핑클럽', trustScore: 98, profileImage: 'https://picsum.photos/seed/shop1/100/100', location: '오전동', bio: '캠핑 장비 전문 대여점', joinedDate: '2024-03-15' },
      { id: 'u2', nickname: '의왕공구대여', isShopOwner: true, shopName: '의왕공구', trustScore: 97, profileImage: 'https://picsum.photos/seed/shop2/100/100', location: '내손동', bio: '보쉬, 마키타 등 전문 공구', joinedDate: '2024-05-20' },
      { id: 'u3', nickname: '파티용품 렌탈샵', isShopOwner: true, shopName: '파티렌탈', trustScore: 95, profileImage: 'https://picsum.photos/seed/shop3/100/100', location: '삼동', bio: '파티, 행사 장비 전문', joinedDate: '2024-07-10' },
      { id: 'u4', nickname: '김민수', isShopOwner: false, trustScore: 92, profileImage: 'https://picsum.photos/seed/user4/100/100', location: '오전동', joinedDate: '2025-01-12' },
      { id: 'u5', nickname: '이영희', isShopOwner: false, trustScore: 88, profileImage: 'https://picsum.photos/seed/user5/100/100', location: '내손동', joinedDate: '2025-02-20' },
      { id: 'u6', nickname: '박지훈', isShopOwner: false, trustScore: 90, profileImage: 'https://picsum.photos/seed/user6/100/100', location: '삼동', joinedDate: '2025-03-05' },
      { id: 'u7', nickname: '최서연', isShopOwner: false, trustScore: 85, profileImage: 'https://picsum.photos/seed/user7/100/100', location: '오전동', joinedDate: '2025-04-18' },
      { id: 'u8', nickname: '정우진', isShopOwner: false, trustScore: 91, profileImage: 'https://picsum.photos/seed/user8/100/100', location: '내손동', joinedDate: '2025-05-22' },
      { id: 'u9', nickname: '한소미', isShopOwner: false, trustScore: 87, profileImage: 'https://picsum.photos/seed/user9/100/100', location: '삼동', joinedDate: '2025-06-30' },
      { id: 'u10', nickname: '오태양', isShopOwner: false, trustScore: 93, profileImage: 'https://picsum.photos/seed/user10/100/100', location: '오전동', joinedDate: '2025-07-14' },
    ];

    this._items = [
      {
        id: 'i1', ownerId: 'u1', title: '4인용 텐트 (코베아)', category: '캠핑', pricePerDay: 15000, deposit: 50000,
        isProItem: true, canTeach: true, canDeliver: true,
        images: ['https://picsum.photos/seed/tent1/600/400', 'https://picsum.photos/seed/tent1b/600/400', 'https://picsum.photos/seed/tent1c/600/400'],
        description: '코베아 4인용 텐트입니다. 방수 기능 완벽하고 설치도 간편합니다. 초보자도 쉽게 설치할 수 있도록 도와드립니다. 무게 약 5kg으로 가족 캠핑에 최적화되어 있습니다.',
        location: '오전동', createdAt: '2026-02-10T09:00:00Z', viewCount: 234, likeCount: 18, rating: 4.8, reviewCount: 12,
      },
      {
        id: 'i2', ownerId: 'u1', title: '캠핑 테이블 세트', category: '캠핑', pricePerDay: 8000, deposit: 30000,
        isProItem: true, canTeach: false, canDeliver: true,
        images: ['https://picsum.photos/seed/table1/600/400', 'https://picsum.photos/seed/table1b/600/400'],
        description: '접이식 캠핑 테이블과 의자 4개 세트입니다. 경량 알루미늄 소재로 휴대가 편리합니다.',
        location: '오전동', createdAt: '2026-02-09T14:00:00Z', viewCount: 156, likeCount: 9, rating: 4.5, reviewCount: 7,
      },
      {
        id: 'i3', ownerId: 'u2', title: '전동 드릴 세트 (보쉬)', category: '공구', pricePerDay: 10000, deposit: 40000,
        isProItem: true, canTeach: true, canDeliver: true,
        images: ['https://picsum.photos/seed/drill1/600/400', 'https://picsum.photos/seed/drill1b/600/400'],
        description: '보쉬 전동 드릴 풀세트입니다. 각종 비트 포함되어 있으며, 사용법도 알려드립니다. DIY 초보자 환영!',
        location: '내손동', createdAt: '2026-02-08T10:00:00Z', viewCount: 312, likeCount: 25, rating: 4.9, reviewCount: 20,
      },
      {
        id: 'i4', ownerId: 'u2', title: '고압 세척기', category: '공구', pricePerDay: 12000, deposit: 50000,
        isProItem: true, canTeach: true, canDeliver: false,
        images: ['https://picsum.photos/seed/washer1/600/400'],
        description: '카처 고압 세척기입니다. 세차, 베란다 청소 등에 유용합니다. 사용법 안내 가능합니다.',
        location: '내손동', createdAt: '2026-02-07T16:00:00Z', viewCount: 189, likeCount: 14, rating: 4.6, reviewCount: 8,
      },
      {
        id: 'i5', ownerId: 'u3', title: '파티용 빔프로젝터', category: '파티', pricePerDay: 20000, deposit: 100000,
        isProItem: true, canTeach: true, canDeliver: true,
        images: ['https://picsum.photos/seed/projector1/600/400', 'https://picsum.photos/seed/projector1b/600/400'],
        description: 'Full HD 빔프로젝터입니다. 스크린 포함이며, 연결 방법 안내해 드립니다. 홈시네마에 딱!',
        location: '삼동', createdAt: '2026-02-06T11:00:00Z', viewCount: 278, likeCount: 22, rating: 4.7, reviewCount: 15,
      },
      {
        id: 'i6', ownerId: 'u4', title: '접이식 자전거', category: '스포츠', pricePerDay: 5000, deposit: 30000,
        isProItem: false, canTeach: false, canDeliver: false,
        images: ['https://picsum.photos/seed/bike1/600/400'],
        description: '다혼 접이식 자전거입니다. 주말 라이딩이나 출퇴근용으로 좋습니다.',
        location: '오전동', createdAt: '2026-02-10T08:00:00Z', viewCount: 98, likeCount: 6, rating: 4.3, reviewCount: 3,
      },
      {
        id: 'i7', ownerId: 'u5', title: 'DSLR 카메라 (캐논)', category: '전자기기', pricePerDay: 25000, deposit: 200000,
        isProItem: false, canTeach: true, canDeliver: false,
        images: ['https://picsum.photos/seed/camera1/600/400', 'https://picsum.photos/seed/camera1b/600/400', 'https://picsum.photos/seed/camera1c/600/400'],
        description: '캐논 EOS 80D 바디 + 기본 렌즈입니다. 기본 촬영법 알려드릴 수 있어요. 여행, 졸업 촬영에 추천합니다.',
        location: '내손동', createdAt: '2026-02-09T12:00:00Z', viewCount: 445, likeCount: 33, rating: 4.9, reviewCount: 18,
      },
      {
        id: 'i8', ownerId: 'u6', title: '유아용 카시트', category: '유아', pricePerDay: 3000, deposit: 20000,
        isProItem: false, canTeach: false, canDeliver: true,
        images: ['https://picsum.photos/seed/carseat1/600/400'],
        description: '맥시코시 유아용 카시트입니다. 깨끗하게 관리하고 있습니다. 단기 여행 시 유용해요.',
        location: '삼동', createdAt: '2026-02-08T15:00:00Z', viewCount: 67, likeCount: 5, rating: 4.4, reviewCount: 4,
      },
      {
        id: 'i9', ownerId: 'u7', title: '보드게임 세트 (5종)', category: '취미', pricePerDay: 3000, deposit: 15000,
        isProItem: false, canTeach: true, canDeliver: false,
        images: ['https://picsum.photos/seed/boardgame1/600/400', 'https://picsum.photos/seed/boardgame1b/600/400'],
        description: '스플렌더, 카탄, 블러핑 등 인기 보드게임 5종 세트입니다. 룰 설명도 해드려요!',
        location: '오전동', createdAt: '2026-02-07T09:00:00Z', viewCount: 123, likeCount: 11, rating: 4.7, reviewCount: 9,
      },
      {
        id: 'i10', ownerId: 'u8', title: '제습기 (대용량)', category: '가전', pricePerDay: 5000, deposit: 30000,
        isProItem: false, canTeach: false, canDeliver: true,
        images: ['https://picsum.photos/seed/dehumid1/600/400'],
        description: '위닉스 대용량 제습기입니다. 장마철에 꼭 필요하죠! 물탱크 6L로 넉넉합니다.',
        location: '내손동', createdAt: '2026-02-06T14:00:00Z', viewCount: 201, likeCount: 16, rating: 4.5, reviewCount: 10,
      },
      {
        id: 'i11', ownerId: 'u9', title: '요가매트 + 폼롤러', category: '스포츠', pricePerDay: 2000, deposit: 10000,
        isProItem: false, canTeach: true, canDeliver: false,
        images: ['https://picsum.photos/seed/yoga1/600/400'],
        description: '요가매트와 폼롤러 세트입니다. 기본 스트레칭 자세도 알려드립니다.',
        location: '삼동', createdAt: '2026-02-05T10:00:00Z', viewCount: 78, likeCount: 4, rating: 4.2, reviewCount: 2,
      },
      {
        id: 'i12', ownerId: 'u10', title: '블루투스 스피커 (JBL)', category: '전자기기', pricePerDay: 5000, deposit: 30000,
        isProItem: false, canTeach: false, canDeliver: true,
        images: ['https://picsum.photos/seed/speaker1/600/400'],
        description: 'JBL 블루투스 스피커입니다. 야외 파티나 캠핑에서 사용하기 좋습니다. 배터리 20시간 지속.',
        location: '오전동', createdAt: '2026-02-04T16:00:00Z', viewCount: 145, likeCount: 12, rating: 4.6, reviewCount: 6,
      },
      {
        id: 'i13', ownerId: 'u4', title: '전기 킥보드', category: '스포츠', pricePerDay: 8000, deposit: 50000,
        isProItem: false, canTeach: false, canDeliver: false,
        images: ['https://picsum.photos/seed/scooter1/600/400'],
        description: '나인봇 전기 킥보드입니다. 충전 완료 상태로 드립니다. 주행거리 약 30km.',
        location: '내손동', createdAt: '2026-02-03T11:00:00Z', viewCount: 256, likeCount: 19, rating: 4.4, reviewCount: 11,
      },
      {
        id: 'i14', ownerId: 'u6', title: '빈백 소파 (대형)', category: '가구', pricePerDay: 4000, deposit: 20000,
        isProItem: false, canTeach: false, canDeliver: true,
        images: ['https://picsum.photos/seed/beanbag1/600/400'],
        description: '대형 빈백 소파입니다. 홈시어터나 독서용으로 추천드립니다.',
        location: '삼동', createdAt: '2026-02-02T13:00:00Z', viewCount: 89, likeCount: 7, rating: 4.1, reviewCount: 3,
      },
      {
        id: 'i15', ownerId: 'u8', title: '다이슨 무선 청소기', category: '가전', pricePerDay: 7000, deposit: 50000,
        isProItem: false, canTeach: false, canDeliver: false,
        images: ['https://picsum.photos/seed/dyson1/600/400'],
        description: '다이슨 V11 무선 청소기입니다. 이사 전후 대청소에 유용합니다.',
        location: '오전동', createdAt: '2026-02-01T15:00:00Z', viewCount: 334, likeCount: 28, rating: 4.8, reviewCount: 16,
      },
    ];

    this._reviews = [
      { id: 'rv1', itemId: 'i1', userId: 'u4', rating: 5, comment: '텐트 상태 매우 좋았어요! 설치도 도와주셔서 감사합니다.', createdAt: '2026-01-20T10:00:00Z' },
      { id: 'rv2', itemId: 'i1', userId: 'u7', rating: 4.5, comment: '깔끔한 텐트였습니다. 다음에도 빌릴게요.', createdAt: '2026-01-15T14:00:00Z' },
      { id: 'rv3', itemId: 'i3', userId: 'u10', rating: 5, comment: '드릴 세트 완벽합니다. 사용법도 꼼꼼히 알려주셔서 DIY 성공!', createdAt: '2026-01-28T09:00:00Z' },
      { id: 'rv4', itemId: 'i3', userId: 'u9', rating: 4.8, comment: '비트 종류가 다양해서 좋았어요.', createdAt: '2026-01-22T16:00:00Z' },
      { id: 'rv5', itemId: 'i5', userId: 'u4', rating: 4.5, comment: '프로젝터 밝기가 괜찮았어요. 생일 파티에 사용했습니다.', createdAt: '2026-02-01T11:00:00Z' },
      { id: 'rv6', itemId: 'i7', userId: 'u8', rating: 5, comment: '카메라 최고! 촬영 팁도 알려주셔서 사진 잘 나왔어요.', createdAt: '2026-01-25T13:00:00Z' },
      { id: 'rv7', itemId: 'i7', userId: 'u6', rating: 4.8, comment: '좋은 카메라였습니다. 여행 사진 잘 찍었어요.', createdAt: '2026-01-18T10:00:00Z' },
    ];

    this._chatRooms = [
      { id: 'c1', otherUserId: 'u1', itemId: 'i1', lastMessage: '텐트 내일 빌릴 수 있을까요?', lastMessageTime: '2026-02-10T10:30:00Z', unread: 2, rentalStatus: 'accepted' },
      { id: 'c2', otherUserId: 'u5', itemId: 'i7', lastMessage: '카메라 상태 궁금합니다', lastMessageTime: '2026-02-09T15:00:00Z', unread: 0, rentalStatus: 'none' },
      { id: 'c3', otherUserId: 'u2', itemId: 'i3', lastMessage: '드릴 반납 완료했습니다!', lastMessageTime: '2026-02-08T18:00:00Z', unread: 1, rentalStatus: 'returned' },
    ];

    this._chatMessages = new Map();
    this._chatMessages.set('c1', [
      { id: 'm1', roomId: 'c1', senderId: CURRENT_USER_ID, text: '안녕하세요! 4인용 텐트 대여 가능한가요?', timestamp: '2026-02-10T09:00:00Z' },
      { id: 'm2', roomId: 'c1', senderId: 'u1', text: '네 가능합니다! 언제 필요하신가요?', timestamp: '2026-02-10T09:05:00Z' },
      { id: 'm3', roomId: 'c1', senderId: CURRENT_USER_ID, text: '내일부터 2박 3일 빌리고 싶어요', timestamp: '2026-02-10T09:10:00Z' },
      { id: 'm4', roomId: 'c1', senderId: 'u1', text: '좋습니다! 보증금 5만원과 대여료 1만5천원/일 확인 부탁드려요', timestamp: '2026-02-10T09:15:00Z' },
      { id: 'm5', roomId: 'c1', senderId: 'system', text: '대여 요청이 수락되었습니다', timestamp: '2026-02-10T09:20:00Z', isSystem: true },
      { id: 'm6', roomId: 'c1', senderId: CURRENT_USER_ID, text: '텐트 내일 빌릴 수 있을까요?', timestamp: '2026-02-10T10:30:00Z' },
    ]);
    this._chatMessages.set('c2', [
      { id: 'm7', roomId: 'c2', senderId: CURRENT_USER_ID, text: '카메라 상태 궁금합니다', timestamp: '2026-02-09T15:00:00Z' },
    ]);
    this._chatMessages.set('c3', [
      { id: 'm8', roomId: 'c3', senderId: CURRENT_USER_ID, text: '드릴 세트 빌리고 싶습니다', timestamp: '2026-02-07T10:00:00Z' },
      { id: 'm9', roomId: 'c3', senderId: 'u2', text: '네! 언제 가져가실 수 있어요?', timestamp: '2026-02-07T10:30:00Z' },
      { id: 'm10', roomId: 'c3', senderId: 'system', text: '보증금이 안전하게 보관되었습니다', timestamp: '2026-02-07T11:00:00Z', isSystem: true },
      { id: 'm11', roomId: 'c3', senderId: 'system', text: '대여가 시작되었습니다', timestamp: '2026-02-07T12:00:00Z', isSystem: true },
      { id: 'm12', roomId: 'c3', senderId: CURRENT_USER_ID, text: '드릴 반납 완료했습니다!', timestamp: '2026-02-08T18:00:00Z' },
    ]);

    this._rentals = [
      { id: 'r1', itemId: 'i1', borrowerId: CURRENT_USER_ID, status: 'renting', startDate: '2026-02-10', endDate: '2026-02-12', totalFee: 30000, depositHeld: 50000, isDelivery: true, deliveryFee: 3000, createdAt: '2026-02-10T09:00:00Z' },
      { id: 'r2', itemId: 'i3', borrowerId: CURRENT_USER_ID, status: 'returned', startDate: '2026-02-05', endDate: '2026-02-07', totalFee: 20000, depositHeld: 0, isDelivery: false, deliveryFee: 0, createdAt: '2026-02-05T10:00:00Z' },
      { id: 'r3', itemId: 'i9', borrowerId: CURRENT_USER_ID, status: 'requested', startDate: '2026-02-11', endDate: '2026-02-13', totalFee: 6000, depositHeld: 15000, isDelivery: false, deliveryFee: 0, createdAt: '2026-02-11T08:00:00Z' },
    ];
  }

  static getInstance(): MockDataService {
    if (!MockDataService.instance) {
      MockDataService.instance = new MockDataService();
    }
    return MockDataService.instance;
  }

  private notify(key: string) {
    this._listeners.get(key)?.forEach(fn => fn());
    this._listeners.get('*')?.forEach(fn => fn());
  }

  subscribe(key: string, fn: () => void) {
    if (!this._listeners.has(key)) this._listeners.set(key, new Set());
    this._listeners.get(key)!.add(fn);
    return () => { this._listeners.get(key)?.delete(fn); };
  }

  get currentUser(): User { return this._users.find(u => u.id === CURRENT_USER_ID)!; }
  get users(): User[] { return [...this._users]; }
  getUserById(id: string): User | undefined { return this._users.find(u => u.id === id); }
  getProUsers(): User[] { return this._users.filter(u => u.isShopOwner); }

  get items(): Item[] { return [...this._items]; }
  getItemById(id: string): Item | undefined { return this._items.find(i => i.id === id); }
  getProItems(): Item[] { return this._items.filter(i => i.isProItem); }
  getRecentItems(): Item[] { return [...this._items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); }
  getItemsByCategory(category: string): Item[] { return category === '전체' ? this.getRecentItems() : this._items.filter(i => i.category === category); }
  getItemsByOwner(ownerId: string): Item[] { return this._items.filter(i => i.ownerId === ownerId); }
  searchItems(query: string): Item[] {
    const q = query.toLowerCase();
    return this._items.filter(i => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
  }

  addItem(item: Omit<Item, 'id' | 'createdAt' | 'viewCount' | 'likeCount' | 'rating' | 'reviewCount'>): Item {
    const newItem: Item = {
      ...item,
      id: 'i' + Date.now().toString(36),
      createdAt: new Date().toISOString(),
      viewCount: 0, likeCount: 0, rating: 0, reviewCount: 0,
    };
    this._items.unshift(newItem);
    this.notify('items');
    return newItem;
  }

  isLiked(itemId: string): boolean { return this._likedItems.has(itemId); }
  toggleLike(itemId: string): boolean {
    if (this._likedItems.has(itemId)) {
      this._likedItems.delete(itemId);
      const item = this.getItemById(itemId);
      if (item) item.likeCount--;
      this.notify('likes');
      return false;
    } else {
      this._likedItems.add(itemId);
      const item = this.getItemById(itemId);
      if (item) item.likeCount++;
      this.notify('likes');
      return true;
    }
  }

  get chatRooms(): ChatRoom[] { return [...this._chatRooms].sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()); }
  getChatMessages(roomId: string): ChatMessage[] { return this._chatMessages.get(roomId) || []; }
  getTotalUnread(): number { return this._chatRooms.reduce((sum, r) => sum + r.unread, 0); }

  sendMessage(roomId: string, text: string): ChatMessage {
    const msg: ChatMessage = {
      id: 'm' + Date.now().toString(36),
      roomId, senderId: CURRENT_USER_ID, text,
      timestamp: new Date().toISOString(),
    };
    if (!this._chatMessages.has(roomId)) this._chatMessages.set(roomId, []);
    this._chatMessages.get(roomId)!.push(msg);
    const room = this._chatRooms.find(r => r.id === roomId);
    if (room) {
      room.lastMessage = text;
      room.lastMessageTime = msg.timestamp;
    }
    this.notify('chat');
    setTimeout(() => this.simulateReply(roomId), 1500 + Math.random() * 2000);
    return msg;
  }

  private simulateReply(roomId: string) {
    const replies = ['네 알겠습니다!', '좋은 선택이에요!', '확인했어요 :)', '곧 연락드리겠습니다', '감사합니다~'];
    const room = this._chatRooms.find(r => r.id === roomId);
    if (!room) return;
    const reply: ChatMessage = {
      id: 'm' + Date.now().toString(36),
      roomId, senderId: room.otherUserId,
      text: replies[Math.floor(Math.random() * replies.length)],
      timestamp: new Date().toISOString(),
    };
    this._chatMessages.get(roomId)?.push(reply);
    room.lastMessage = reply.text;
    room.lastMessageTime = reply.timestamp;
    room.unread++;
    this.notify('chat');
  }

  markAsRead(roomId: string) {
    const room = this._chatRooms.find(r => r.id === roomId);
    if (room) { room.unread = 0; this.notify('chat'); }
  }

  startChat(itemId: string): string {
    const item = this.getItemById(itemId);
    if (!item) return '';
    const existing = this._chatRooms.find(r => r.itemId === itemId && r.otherUserId === item.ownerId);
    if (existing) return existing.id;
    const room: ChatRoom = {
      id: 'c' + Date.now().toString(36),
      otherUserId: item.ownerId, itemId,
      lastMessage: '', lastMessageTime: new Date().toISOString(),
      unread: 0, rentalStatus: 'none',
    };
    this._chatRooms.push(room);
    this._chatMessages.set(room.id, []);
    this.notify('chat');
    return room.id;
  }

  get rentals(): RentalRecord[] { return [...this._rentals].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); }
  getActiveRentals(): RentalRecord[] { return this._rentals.filter(r => r.status === 'renting' || r.status === 'requested' || r.status === 'paid'); }
  getRentalHistory(): RentalRecord[] { return this._rentals.filter(r => r.status === 'returned' || r.status === 'disputed'); }
  getTotalHeldDeposits(): number { return this.getActiveRentals().reduce((sum, r) => sum + r.depositHeld, 0); }

  createRental(data: { itemId: string; days: number; isDelivery: boolean }): RentalRecord {
    const item = this.getItemById(data.itemId);
    if (!item) throw new Error('Item not found');
    const deliveryFee = data.isDelivery ? 3000 : 0;
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + data.days);
    const rental: RentalRecord = {
      id: 'r' + Date.now().toString(36),
      itemId: data.itemId, borrowerId: CURRENT_USER_ID,
      status: 'requested',
      startDate: today.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      totalFee: item.pricePerDay * data.days + deliveryFee,
      depositHeld: item.deposit,
      isDelivery: data.isDelivery, deliveryFee,
      createdAt: new Date().toISOString(),
    };
    this._rentals.push(rental);
    this.notify('rentals');
    return rental;
  }

  getReviewsForItem(itemId: string): Review[] { return this._reviews.filter(r => r.itemId === itemId); }

  updateProfile(data: Partial<User>) {
    const user = this._users.find(u => u.id === CURRENT_USER_ID);
    if (user) Object.assign(user, data);
    this.notify('profile');
  }
}

export const mockData = MockDataService.getInstance();

export const categories = ['전체', '캠핑', '공구', '파티', '스포츠', '전자기기', '유아', '취미', '가전', '가구'];

export function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR') + '원';
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}
