import { createServerSupabaseClient } from '@/lib/supabase-server';

const ADMIN_EMAILS = ['totalointernational@gmail.com'];

// GET: List all subscribers
export async function GET(req: Request) {
    try {
        const supabase = await createServerSupabaseClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
            return new Response(JSON.stringify({ error: '접근 권한이 없습니다' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get all user profiles with subscription
        const { data: profiles, error } = await supabase
            .from('user_profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Get user emails from auth.users (need to use admin client)
        // For now, just return profiles
        return new Response(JSON.stringify({ users: profiles }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// DELETE: Terminate user subscription
export async function DELETE(req: Request) {
    try {
        const { userId } = await req.json();

        if (!userId) {
            return new Response(JSON.stringify({ error: '사용자 ID가 필요합니다' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const supabase = await createServerSupabaseClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
            return new Response(JSON.stringify({ error: '접근 권한이 없습니다' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 1. Update user profile: remove subscription and API key
        const { error: profileError } = await supabase
            .from('user_profiles')
            .update({
                is_subscribed: false,
                gemini_api_key: null
            })
            .eq('id', userId);

        if (profileError) throw profileError;

        // 2. Reset the invitation code used by this user (make it reusable)
        const { error: codeError } = await supabase
            .from('invitation_codes')
            .update({
                is_used: false,
                used_by: null,
                used_at: null
            })
            .eq('used_by', userId);

        if (codeError) throw codeError;

        return new Response(JSON.stringify({
            success: true,
            message: '사용자 구독이 해지되었습니다'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
