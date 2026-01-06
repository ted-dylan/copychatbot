'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Copy, Check, ExternalLink, Edit3, RefreshCw, History, Trash2, Clock, Settings, Key, LogOut, Loader2, Lock } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { getUserProfile } from '@/lib/profile';

// ========== Types ==========
interface PlatformContent {
  content: string;
  hashtags: string[];
}

interface GeneratedContent {
  threads: PlatformContent;
  x: PlatformContent;
}

// Tone options
type ToneType = 'humorous' | 'emotional' | 'professional' | 'trendy' | 'motivational';

interface ToneOption {
  id: ToneType;
  label: string;
  emoji: string;
  description: string;
}

const TONE_OPTIONS: ToneOption[] = [
  { id: 'humorous', label: '유머러스', emoji: '😂', description: '재치있는 드립' },
  { id: 'emotional', label: '감성적', emoji: '💕', description: '마음을 터치' },
  { id: 'professional', label: '전문적', emoji: '👔', description: '신뢰감 있게' },
  { id: 'trendy', label: 'MZ트렌디', emoji: '🔥', description: '힙하고 쿨하게' },
  { id: 'motivational', label: '동기부여', emoji: '💪', description: '응원하는 메시지' },
];

// History types
interface HistoryItem {
  id: string;
  topic: string;
  tone: ToneType;
  content: GeneratedContent;
  createdAt: string;
}

const HISTORY_KEY = 'copytherapist_history';
const MAX_HISTORY = 20;

// ========== History Utilities ==========

function getHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveToHistory(topic: string, tone: ToneType, content: GeneratedContent): HistoryItem {
  const history = getHistory();
  const newItem: HistoryItem = {
    id: Date.now().toString(),
    topic,
    tone,
    content,
    createdAt: new Date().toISOString(),
  };
  const updated = [newItem, ...history].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return newItem;
}

function deleteFromHistory(id: string): void {
  const history = getHistory();
  const updated = history.filter(item => item.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

function clearAllHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

// ========== Tone Selector Component ==========

function ToneSelector({
  selectedTone,
  onToneChange
}: {
  selectedTone: ToneType;
  onToneChange: (tone: ToneType) => void;
}) {
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-white/60 mb-3">
        🎨 톤/스타일 선택
      </label>
      <div className="flex flex-wrap gap-2">
        {TONE_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => onToneChange(option.id)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${selectedTone === option.id
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
              : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
          >
            <span className="mr-1.5">{option.emoji}</span>
            {option.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-white/40">
        {TONE_OPTIONS.find(o => o.id === selectedTone)?.description}
      </p>
    </div>
  );
}

// ========== History Panel Component ==========

function HistoryPanel({
  history,
  onLoadHistory,
  onDeleteItem,
  onClearAll,
}: {
  history: HistoryItem[];
  onLoadHistory: (item: HistoryItem) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (history.length === 0) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const getToneEmoji = (tone: ToneType) => {
    return TONE_OPTIONS.find(o => o.id === tone)?.emoji || '✨';
  };

  return (
    <div className="mb-8">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/70 hover:text-white transition-all"
      >
        <History size={18} />
        <span className="font-medium">히스토리</span>
        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-full">
          {history.length}
        </span>
      </button>

      {isOpen && (
        <div className="mt-4 bg-[#12121a] rounded-2xl border border-white/10 overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Clock size={16} className="text-purple-400" />
              최근 생성 기록
            </h3>
            <button
              onClick={onClearAll}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              전체 삭제
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-4 border-b border-white/5 hover:bg-white/5 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{getToneEmoji(item.tone)}</span>
                    <span className="text-white font-medium truncate">{item.topic}</span>
                  </div>
                  <span className="text-xs text-white/40">{formatDate(item.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onLoadHistory(item)}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-lg transition-colors"
                  >
                    불러오기
                  </button>
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1.5 text-white/40 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ========== Social Media Utilities ==========

// Threads Web Intent
function openThreadsIntent(content: string, hashtags: string[]): void {
  const hashtagText = hashtags.map(h => `#${h}`).join(' ');
  const fullText = `${content}\n\n${hashtagText}`.trim();
  const encodedText = encodeURIComponent(fullText);
  window.open(`https://www.threads.net/intent/post?text=${encodedText}`, '_blank', 'noopener,noreferrer');
}

// X (Twitter) Web Intent
function openXIntent(content: string, hashtags: string[]): void {
  const hashtagText = hashtags.map(h => `#${h}`).join(' ');
  const fullText = `${content}\n\n${hashtagText}`.trim();
  const encodedText = encodeURIComponent(fullText);
  window.open(`https://twitter.com/intent/tweet?text=${encodedText}`, '_blank', 'noopener,noreferrer');
}

// ========== Components ==========

// Content Card for each platform
function ContentCard({
  platform,
  content,
  hashtags,
  maxChars,
  onContentChange
}: {
  platform: 'threads' | 'x';
  content: string;
  hashtags: string[];
  maxChars: number;
  onContentChange: (content: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);

  const charCount = content.length;
  const isOverLimit = charCount > maxChars;

  const handleCopy = async () => {
    const hashtagText = hashtags.map(h => `#${h}`).join(' ');
    await navigator.clipboard.writeText(`${content}\n\n${hashtagText}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    onContentChange(editContent);
    setIsEditing(false);
  };

  const handlePost = () => {
    if (platform === 'threads') {
      openThreadsIntent(content, hashtags);
    } else {
      openXIntent(content, hashtags);
    }
  };

  const platformConfig = {
    threads: {
      name: 'Threads',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.182.408-2.256 1.332-3.023.899-.746 2.13-1.109 3.794-1.109.29 0 .59.012.9.035l.165-2.016c-.56-.046-1.1-.07-1.607-.07-2.156 0-3.872.547-5.101 1.625-1.309 1.149-1.958 2.746-1.826 4.5.132 1.763 1.029 3.327 2.525 4.408 1.29.933 2.927 1.406 4.605 1.312 1.18-.064 2.132-.38 2.91-.966.752-.567 1.314-1.342 1.671-2.3.185.075.371.142.559.202.785.248 1.626.381 2.5.394.088.002.175.003.263.003 2.09 0 3.906-.572 5.398-1.7l-1.257-1.574c-1.106.837-2.47 1.28-4.055 1.317-.558-.014-1.1-.1-1.612-.255.139-.848.21-1.773.21-2.77 0-.94-.072-1.804-.213-2.59 1.054.597 1.89 1.49 2.418 2.588.818 1.702.78 4.449-1.434 6.616-1.904 1.866-4.334 2.726-7.645 2.753z" />
        </svg>
      ),
      gradient: 'from-gray-800 to-black',
      buttonGradient: 'from-gray-700 to-gray-900 hover:from-gray-600 hover:to-gray-800'
    },
    x: {
      name: 'X',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      gradient: 'from-gray-900 to-black',
      buttonGradient: 'from-gray-800 to-black hover:from-gray-700 hover:to-gray-900'
    }
  };

  const config = platformConfig[platform];

  return (
    <div className="flex-1 min-w-[320px] bg-gradient-to-br from-[#1a1a1f] to-[#0f0f12] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className={`flex items-center gap-3 p-4 bg-gradient-to-r ${config.gradient} border-b border-white/10`}>
        <div className="p-2 bg-white/10 rounded-xl text-white">
          {config.icon}
        </div>
        <div>
          <h3 className="font-bold text-white">{config.name}</h3>
          <p className="text-xs text-white/60">{maxChars}자 이내</p>
        </div>
        <div className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${isOverLimit ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
          }`}>
          {charCount}/{maxChars}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full h-40 p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm resize-none focus:outline-none focus:border-purple-500/50"
              maxLength={maxChars}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                저장
              </button>
              <button
                onClick={() => { setIsEditing(false); setEditContent(content); }}
                className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="min-h-[120px] p-4 bg-white/5 rounded-xl border border-white/5">
              <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap">
                {content}
              </p>
            </div>

            {/* Hashtags */}
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {hashtags.map((tag, i) => (
                  <span key={i} className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      {!isEditing && (
        <div className="p-4 pt-0 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-sm font-medium rounded-xl transition-all"
            >
              <Edit3 size={16} />
              편집
            </button>
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-sm font-medium rounded-xl transition-all"
            >
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              {copied ? '복사됨!' : '복사'}
            </button>
          </div>

          <button
            onClick={handlePost}
            className={`w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r ${config.buttonGradient} text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg`}
          >
            <ExternalLink size={18} />
            {config.name}에 올리기
          </button>
        </div>
      )}
    </div>
  );
}

// ========== Category & Recommendations ==========

interface CategoryData {
  id: string;
  name: string;
  topics: string[];
}

const CATEGORIES: CategoryData[] = [
  {
    id: 'trending',
    name: 'TRENDING',
    topics: [
      '2026년 새해 다짐, 작심삼일 극복하는 법',
      '겨울철 감성 카페 추천 콘텐츠',
      'AI 시대, 나만의 경쟁력 키우기',
      '집콕 라이프: 홈카페 레시피',
      '번아웃 극복: 직장인 힐링 루틴',
      '올해 꼭 해야 할 자기계발 리스트'
    ]
  },
  {
    id: 'lifestyle',
    name: 'LIFESTYLE',
    topics: [
      '미니멀 라이프: 정리의 시작',
      '아침 루틴으로 하루를 바꾸는 법',
      '비 오는 날 집에서 즐기는 여유',
      '월요일 우울증 극복 꿀팁',
      '주말 혼자만의 시간 보내기',
      '스마트폰 디톡스 도전기'
    ]
  },
  {
    id: 'motivation',
    name: 'MOTIVATION',
    topics: [
      '실패해도 괜찮아, 다시 시작하는 용기',
      '작은 습관이 인생을 바꾼다',
      '꿈을 포기하지 않는 당신에게',
      '오늘 하루도 수고했어',
      '성공은 준비된 자에게 온다',
      '나를 위한 칭찬 한마디'
    ]
  },
  {
    id: 'business',
    name: 'BUSINESS',
    topics: [
      '스타트업 성공의 3가지 비결',
      '개인 브랜딩: SNS 마케팅 전략',
      '부업으로 시작하는 온라인 비즈니스',
      '2026년 투자 트렌드 분석',
      'MZ세대 소비 패턴과 마케팅',
      '프리랜서로 살아남는 법'
    ]
  },
  {
    id: 'seasonal',
    name: 'SEASONAL',
    topics: [
      '겨울 감성 충전 플레이리스트',
      '연말연시 감사 인사 전하기',
      '새해 목표 세우는 스마트한 방법',
      '크리스마스 홈파티 아이디어',
      '겨울 피부 관리 필수템',
      '따뜻한 차 한 잔의 여유'
    ]
  }
];

// Category Tabs & Topic Recommendations Component
function TopicRecommendations({ onSelectTopic }: { onSelectTopic: (topic: string) => void }) {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);

  const activeTopics = CATEGORIES.find(c => c.id === activeCategory)?.topics || [];

  const handleGetRecommendation = () => {
    setIsLoadingRecommendation(true);
    // Simulate loading, then pick a random topic
    setTimeout(() => {
      const randomTopic = activeTopics[Math.floor(Math.random() * activeTopics.length)];
      onSelectTopic(randomTopic);
      setIsLoadingRecommendation(false);
    }, 500);
  };

  return (
    <div className="mb-8 bg-[#12121a] rounded-2xl border border-white/10 overflow-hidden">
      {/* Category Tabs */}
      <div className="flex items-center gap-1 p-4 border-b border-white/10 overflow-x-auto">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`px-4 py-2 text-sm font-bold rounded-lg whitespace-nowrap transition-all ${activeCategory === category.id
              ? 'bg-purple-600 text-white'
              : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Get Recommendation Button */}
      <div className="p-4 border-b border-white/10">
        <button
          onClick={handleGetRecommendation}
          disabled={isLoadingRecommendation}
          className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all disabled:opacity-50"
        >
          {isLoadingRecommendation ? '추천 중...' : '🎲 추천받기'}
        </button>
      </div>

      {/* Topic Grid */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {activeTopics.map((topic, index) => (
          <button
            key={index}
            onClick={() => onSelectTopic(topic)}
            className="p-4 text-left bg-[#1a1a24] hover:bg-[#252530] border border-white/10 hover:border-purple-500/50 rounded-xl text-white/80 hover:text-white text-sm transition-all"
          >
            {topic}
          </button>
        ))}
      </div>
    </div>
  );
}

// ========== Main App ==========
export default function AutomationPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const [topic, setTopic] = useState('');
  const [selectedTone, setSelectedTone] = useState<ToneType>('emotional');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Invitation code state
  const [inviteCode, setInviteCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeSuccess, setCodeSuccess] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Load profile, history and API key on mount
  useEffect(() => {
    if (user) {
      setHistory(getHistory());

      // Load profile from Supabase
      getUserProfile(user.id).then((profile) => {
        if (profile) {
          setApiKey(profile.gemini_api_key);
          setIsSubscribed(profile.is_subscribed);
        } else {
          setIsSubscribed(false);
        }
        setProfileLoading(false);
      });
    }
  }, [user]);

  // Define handlers before early returns
  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  // Show loading while checking auth or profile
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null;
  }



  const handleRedeemCode = async () => {
    if (!inviteCode.trim() || !user) return;

    setCodeLoading(true);
    setCodeError(null);

    try {
      const response = await fetch('/api/redeem-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode.trim(), userId: user.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '코드 등록에 실패했습니다');
      }

      setCodeSuccess(true);
      // Refresh the page after 1.5 seconds
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setCodeError(err.message);
    } finally {
      setCodeLoading(false);
    }
  };

  // Admin emails bypass subscription check
  const ADMIN_EMAILS = ['totalointernational@gmail.com'];
  const isAdmin = user && ADMIN_EMAILS.includes(user.email || '');

  // Show subscription required screen for non-subscribers (admins bypass)
  if (!isSubscribed && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[150px] rounded-full"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/10 blur-[150px] rounded-full"></div>
        </div>

        <div className="relative z-10 text-center max-w-md w-full">
          <div className="p-4 bg-purple-600/20 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <Lock className="w-10 h-10 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">구독이 필요합니다</h1>
          <p className="text-purple-300/70 mb-8">
            CopyTherapist를 이용하려면 구독이 필요합니다.<br />
            크몽에서 구매 후 받은 초대 코드를 입력해주세요!
          </p>

          {/* Invitation Code Input */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-4">
            <label className="block text-sm text-purple-300 mb-2 text-left">초대 코드</label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="코드를 입력하세요"
              disabled={codeLoading || codeSuccess}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-mono text-center text-lg tracking-widest uppercase disabled:opacity-50"
            />

            {codeError && (
              <p className="mt-2 text-red-400 text-sm">{codeError}</p>
            )}

            {codeSuccess && (
              <p className="mt-2 text-green-400 text-sm">✅ 구독이 활성화되었습니다! 잠시 후 새로고침됩니다...</p>
            )}

            <button
              onClick={handleRedeemCode}
              disabled={!inviteCode.trim() || codeLoading || codeSuccess}
              className="w-full mt-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl hover:from-purple-500 hover:to-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {codeLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  확인 중...
                </>
              ) : codeSuccess ? (
                '활성화 완료!'
              ) : (
                '코드 등록'
              )}
            </button>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full py-3 bg-white/5 text-white/60 rounded-xl hover:bg-white/10 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>
    );
  }

  const handleSelectTopic = (selectedTopic: string) => {
    setTopic(selectedTopic);
    // Auto-scroll to input
    document.getElementById('topic-input')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), tone: selectedTone, apiKey }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.needsApiKey) {
          setNeedsApiKey(true);
        }
        throw new Error(errorData.error || 'Failed to generate content');
      }

      setNeedsApiKey(false);

      const data = await response.json();
      setGeneratedContent(data);

      // Save to history
      saveToHistory(topic.trim(), selectedTone, data);
      setHistory(getHistory());
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadHistory = (item: HistoryItem) => {
    setTopic(item.topic);
    setSelectedTone(item.tone);
    setGeneratedContent(item.content);
    document.getElementById('topic-input')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteHistoryItem = (id: string) => {
    deleteFromHistory(id);
    setHistory(getHistory());
  };

  const handleClearHistory = () => {
    if (confirm('모든 히스토리를 삭제하시겠습니까?')) {
      clearAllHistory();
      setHistory([]);
    }
  };

  const handleContentChange = (platform: 'threads' | 'x', newContent: string) => {
    if (!generatedContent) return;
    setGeneratedContent({
      ...generatedContent,
      [platform]: { ...generatedContent[platform], content: newContent }
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/10 blur-[150px] rounded-full"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Settings & Logout Buttons - Fixed Top Right */}
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          {/* Admin Button - only for admin */}
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-full transition-colors"
            >
              <span className="text-sm text-purple-300">🛡️ 관리자</span>
            </Link>
          )}
          <Link
            href="/settings"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-colors"
          >
            <Settings size={16} className="text-purple-400" />
            <span className="text-sm text-white/60">설정</span>
            {apiKey && <span className="w-2 h-2 bg-green-500 rounded-full"></span>}
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 rounded-full transition-colors"
          >
            <LogOut size={16} className="text-white/60" />
            <span className="text-sm text-white/60">로그아웃</span>
          </button>
        </div>

        {/* API Key Required Banner - Always show if no API key */}
        {!apiKey && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-amber-400" />
              <span className="text-amber-200">⚠️ API 키를 등록하세요! Gemini API 키가 없으면 카피를 생성할 수 없습니다.</span>
            </div>
            <Link
              href="/settings"
              className="px-4 py-2 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400 transition-colors"
            >
              키 등록하기
            </Link>
          </div>
        )}

        {/* Header */}
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-6">
            <Sparkles size={16} className="text-purple-400" />
            <span className="text-sm text-white/60">AI-Powered Copy Generator</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">
            CopyTherapist
          </h1>
          <p className="text-lg text-white/50">
            주제를 입력하면 Threads와 X에 최적화된 카피를 생성합니다
          </p>
        </header>

        {/* History Panel */}
        <HistoryPanel
          history={history}
          onLoadHistory={handleLoadHistory}
          onDeleteItem={handleDeleteHistoryItem}
          onClearAll={handleClearHistory}
        />

        {/* Topic Recommendations */}
        <TopicRecommendations onSelectTopic={handleSelectTopic} />

        {/* Input Section */}
        <div id="topic-input" className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl blur opacity-25"></div>
            <div className="relative bg-[#1a1a1f] rounded-2xl p-6 border border-white/10">
              {/* Tone Selector */}
              <ToneSelector selectedTone={selectedTone} onToneChange={setSelectedTone} />

              <label className="block text-sm font-medium text-white/60 mb-3">
                📝 주제 / 키워드
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="예: 비 오는 날 카페에서 마시는 따뜻한 라떼, 월요일 힘내라는 메시지..."
                className="w-full h-24 p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-purple-500/50 transition-colors"
              />
              <button
                onClick={handleGenerate}
                disabled={!topic.trim() || isLoading}
                className="w-full mt-4 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-lg rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-purple-500/25"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw size={20} className="animate-spin" />
                    생성 중...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Sparkles size={20} />
                    카피 생성하기
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center">
            ⚠️ {error}
          </div>
        )}

        {/* Generated Content Cards */}
        {generatedContent && (
          <div className="flex flex-col md:flex-row gap-6 animate-fade-in">
            <ContentCard
              platform="threads"
              content={generatedContent.threads.content}
              hashtags={generatedContent.threads.hashtags}
              maxChars={500}
              onContentChange={(content) => handleContentChange('threads', content)}
            />
            <ContentCard
              platform="x"
              content={generatedContent.x.content}
              hashtags={generatedContent.x.hashtags}
              maxChars={280}
              onContentChange={(content) => handleContentChange('x', content)}
            />
          </div>
        )}

        {/* Empty State */}
        {!generatedContent && !isLoading && (
          <div className="text-center py-16 text-white/30">
            <div className="text-6xl mb-4">✨</div>
            <p>주제를 입력하고 카피를 생성해보세요</p>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
      `}</style>
    </div>
  );
}
