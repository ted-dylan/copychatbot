import { createClient } from '@/lib/supabase';

export interface UserProfile {
    id: string;
    gemini_api_key: string | null;
    is_subscribed: boolean;
    created_at: string;
}

/**
 * Get user profile from Supabase
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error || !data) {
        return null;
    }

    return data as UserProfile;
}

/**
 * Create or update user profile
 */
export async function upsertUserProfile(
    userId: string,
    updates: Partial<Omit<UserProfile, 'id' | 'created_at'>>
): Promise<UserProfile | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('user_profiles')
        .upsert({
            id: userId,
            ...updates,
        })
        .select()
        .single();

    if (error) {
        console.error('Error upserting profile:', error);
        return null;
    }

    return data as UserProfile;
}

/**
 * Update Gemini API key
 */
export async function updateApiKey(userId: string, apiKey: string): Promise<boolean> {
    const supabase = createClient();

    const { error } = await supabase
        .from('user_profiles')
        .upsert({
            id: userId,
            gemini_api_key: apiKey,
        });

    return !error;
}

/**
 * Get Gemini API key for user
 */
export async function getApiKey(userId: string): Promise<string | null> {
    const profile = await getUserProfile(userId);
    return profile?.gemini_api_key ?? null;
}

/**
 * Check if user is subscribed
 */
export async function checkSubscription(userId: string): Promise<boolean> {
    const profile = await getUserProfile(userId);
    return profile?.is_subscribed ?? false;
}
