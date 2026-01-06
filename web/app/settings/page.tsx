'use client';

import { useState, useEffect } from 'react';
import { Settings, Key, CheckCircle, XCircle, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { getUserProfile, upsertUserProfile } from '@/lib/profile';

export default function SettingsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const [apiKey, setApiKey] = useState('');
    const [savedKey, setSavedKey] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
    const [testMessage, setTestMessage] = useState('');

    // Load API key from DB
    useEffect(() => {
        if (user) {
            getUserProfile(user.id).then((profile) => {
                if (profile?.gemini_api_key) {
                    setSavedKey(profile.gemini_api_key);
                    setApiKey(profile.gemini_api_key);
                }
                setIsLoading(false);
            });
        } else if (!authLoading) {
            setIsLoading(false);
        }
    }, [user, authLoading]);

    const handleSave = async () => {
        if (!apiKey.trim() || !user) return;

        setIsSaving(true);
        try {
            const result = await upsertUserProfile(user.id, {
                gemini_api_key: apiKey.trim()
            });
            if (result) {
                setSavedKey(apiKey.trim());
                setTestResult(null);
                setTestMessage('');
            }
        } catch (error) {
            console.error('Error saving API key:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemove = async () => {
        if (!user) return;

        setIsSaving(true);
        try {
            await upsertUserProfile(user.id, {
                gemini_api_key: null as any
            });
            setSavedKey(null);
            setApiKey('');
            setTestResult(null);
            setTestMessage('');
        } catch (error) {
            console.error('Error removing API key:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleTest = async () => {
        if (!apiKey.trim()) return;

        setIsTesting(true);
        setTestResult(null);
        setTestMessage('');

        try {
            const response = await fetch('/api/test-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: apiKey.trim() }),
            });

            const data = await response.json();

            if (response.ok) {
                setTestResult('success');
                setTestMessage('API 키가 정상 작동합니다!');
            } else {
                setTestResult('error');
                setTestMessage(data.error || 'API 키 테스트에 실패했습니다.');
            }
        } catch (error) {
            setTestResult('error');
            setTestMessage('네트워크 오류가 발생했습니다.');
        } finally {
            setIsTesting(false);
        }
    };

    const maskedKey = savedKey
        ? `${savedKey.slice(0, 10)}...${savedKey.slice(-4)}`
        : null;

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        메인으로 돌아가기
                    </Link>

                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-600/20 rounded-xl">
                            <Settings className="w-8 h-8 text-purple-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">설정</h1>
                            <p className="text-purple-300/70">API 키 관리</p>
                        </div>
                    </div>
                </div>

                {/* API Key Card */}
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Key className="w-5 h-5 text-purple-400" />
                        <h2 className="text-lg font-semibold text-white">Google Gemini API 키</h2>
                    </div>

                    {/* Current Status */}
                    {savedKey && (
                        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                            <div className="flex items-center gap-2 text-green-400 mb-1">
                                <CheckCircle className="w-4 h-4" />
                                <span className="font-medium">API 키 등록됨</span>
                            </div>
                            <p className="text-green-300/70 text-sm font-mono">{maskedKey}</p>
                        </div>
                    )}

                    {/* Input */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-purple-300 mb-2">
                                API 키 입력
                            </label>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="AIzaSy..."
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-mono text-sm"
                            />
                        </div>

                        {/* Test Result */}
                        {testResult && (
                            <div className={`p-4 rounded-xl flex items-center gap-2 ${testResult === 'success'
                                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                                : 'bg-red-500/10 border border-red-500/20 text-red-400'
                                }`}>
                                {testResult === 'success' ? (
                                    <CheckCircle className="w-4 h-4" />
                                ) : (
                                    <XCircle className="w-4 h-4" />
                                )}
                                <span>{testMessage}</span>
                            </div>
                        )}

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleTest}
                                disabled={!apiKey.trim() || isTesting}
                                className="flex-1 px-4 py-3 bg-purple-600/20 text-purple-300 rounded-xl hover:bg-purple-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isTesting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        테스트 중...
                                    </>
                                ) : (
                                    '키 테스트'
                                )}
                            </button>

                            <button
                                onClick={handleSave}
                                disabled={!apiKey.trim() || isSaving}
                                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        저장 중...
                                    </>
                                ) : (
                                    '저장하기'
                                )}
                            </button>
                        </div>

                        {savedKey && (
                            <button
                                onClick={handleRemove}
                                disabled={isSaving}
                                className="w-full px-4 py-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors disabled:opacity-50"
                            >
                                API 키 삭제
                            </button>
                        )}
                    </div>

                    {/* Help */}
                    <div className="mt-6 pt-6 border-t border-white/10">
                        <h3 className="text-sm font-medium text-white mb-2">API 키 발급 방법</h3>
                        <ol className="text-sm text-purple-300/70 space-y-1 list-decimal list-inside">
                            <li>
                                <a
                                    href="https://aistudio.google.com/app/apikey"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-purple-400 hover:underline"
                                >
                                    Google AI Studio
                                </a>
                                에 접속합니다
                            </li>
                            <li>Google 계정으로 로그인합니다</li>
                            <li>"Create API Key" 버튼을 클릭합니다</li>
                            <li>생성된 API 키를 복사하여 위에 입력합니다</li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    );
}
