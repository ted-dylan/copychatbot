'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Shield, Plus, Copy, Check, Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

const ADMIN_EMAILS = ['totalointernational@gmail.com'];

interface InvitationCode {
    id: string;
    code: string;
    memo: string | null;
    is_used: boolean;
    used_by: string | null;
    used_at: string | null;
    created_at: string;
}

export default function AdminPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const [codes, setCodes] = useState<InvitationCode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [memo, setMemo] = useState('');
    const [count, setCount] = useState(1);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const isAdmin = user && ADMIN_EMAILS.includes(user.email || '');

    // Redirect if not admin
    useEffect(() => {
        console.log('Admin check:', {
            authLoading,
            userEmail: user?.email,
            isAdmin,
            ADMIN_EMAILS
        });
        if (!authLoading && (!user || !isAdmin)) {
            router.push('/');
        }
    }, [authLoading, user, isAdmin, router]);

    // Load codes
    useEffect(() => {
        if (isAdmin) {
            loadCodes();
        }
    }, [isAdmin]);

    const loadCodes = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/admin/codes');
            const data = await response.json();
            if (response.ok) {
                setCodes(data.codes || []);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('코드 목록을 불러올 수 없습니다');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateCode = async () => {
        setGenerating(true);
        setError(null);
        try {
            const response = await fetch('/api/admin/codes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ memo: memo.trim() || null, count }),
            });
            const data = await response.json();
            if (response.ok) {
                loadCodes();
                setMemo('');
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('코드 생성에 실패했습니다');
        } finally {
            setGenerating(false);
        }
    };

    const copyToClipboard = async (code: string) => {
        await navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    if (authLoading || !isAdmin) {
        return (
            <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
        );
    }

    const usedCount = codes.filter(c => c.is_used).length;
    const unusedCount = codes.filter(c => !c.is_used).length;

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-white p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-600/20 rounded-lg">
                            <Shield className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">관리자</h1>
                            <p className="text-white/50 text-sm">초대 코드 관리</p>
                        </div>
                    </div>
                    <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-white">
                        <ArrowLeft className="w-4 h-4" />
                        메인으로
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="text-3xl font-bold text-white">{codes.length}</div>
                        <div className="text-white/50 text-sm">전체 코드</div>
                    </div>
                    <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                        <div className="text-3xl font-bold text-green-400">{unusedCount}</div>
                        <div className="text-green-400/70 text-sm">미사용</div>
                    </div>
                    <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20">
                        <div className="text-3xl font-bold text-purple-400">{usedCount}</div>
                        <div className="text-purple-400/70 text-sm">사용됨</div>
                    </div>
                </div>

                {/* Generate Code Form */}
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-8">
                    <h2 className="text-lg font-semibold mb-4">코드 생성</h2>
                    <div className="flex flex-col md:flex-row gap-4">
                        <input
                            type="text"
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                            placeholder="메모 (크몽 주문번호 등)"
                            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30"
                        />
                        <select
                            value={count}
                            onChange={(e) => setCount(Number(e.target.value))}
                            className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                        >
                            <option value={1}>1개</option>
                            <option value={5}>5개</option>
                            <option value={10}>10개</option>
                        </select>
                        <button
                            onClick={handleGenerateCode}
                            disabled={generating}
                            className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-500 disabled:opacity-50 flex items-center gap-2"
                        >
                            {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                            생성
                        </button>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4 text-red-400">
                        {error}
                    </div>
                )}

                {/* Code List */}
                <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                        <h2 className="text-lg font-semibold">코드 목록</h2>
                        <button
                            onClick={loadCodes}
                            className="p-2 hover:bg-white/5 rounded-lg"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="p-8 text-center">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-400" />
                        </div>
                    ) : codes.length === 0 ? (
                        <div className="p-8 text-center text-white/50">
                            생성된 코드가 없습니다
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {codes.map((code) => (
                                <div key={code.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-2 h-2 rounded-full ${code.is_used ? 'bg-purple-400' : 'bg-green-400'}`} />
                                        <div>
                                            <div className="font-mono text-lg">{code.code}</div>
                                            <div className="text-white/50 text-sm">
                                                {code.memo || '메모 없음'}
                                                {code.is_used && code.used_at && (
                                                    <span className="ml-2 text-purple-400">
                                                        • 사용됨 ({new Date(code.used_at).toLocaleDateString('ko-KR')})
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(code.code)}
                                        className="p-2 hover:bg-white/10 rounded-lg"
                                    >
                                        {copiedCode === code.code ? (
                                            <Check className="w-4 h-4 text-green-400" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-white/50" />
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
