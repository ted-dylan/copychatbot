import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
    try {
        const { code, userId } = await req.json();

        if (!code || !userId) {
            return new Response(JSON.stringify({ error: '코드와 사용자 ID가 필요합니다' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const supabase = await createServerSupabaseClient();

        // Check if code exists and is not used
        const { data: inviteCode, error: findError } = await supabase
            .from('invitation_codes')
            .select('*')
            .eq('code', code.trim().toUpperCase())
            .single();

        if (findError || !inviteCode) {
            return new Response(JSON.stringify({ error: '유효하지 않은 코드입니다' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (inviteCode.is_used) {
            return new Response(JSON.stringify({ error: '이미 사용된 코드입니다' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Mark code as used
        const { error: updateCodeError } = await supabase
            .from('invitation_codes')
            .update({
                is_used: true,
                used_by: userId,
                used_at: new Date().toISOString()
            })
            .eq('id', inviteCode.id);

        if (updateCodeError) {
            console.error('Error updating code:', updateCodeError);
            return new Response(JSON.stringify({ error: '코드 사용 처리 중 오류가 발생했습니다' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Update user profile to subscribed
        const { error: updateProfileError } = await supabase
            .from('user_profiles')
            .upsert({
                id: userId,
                is_subscribed: true
            });

        if (updateProfileError) {
            console.error('Error updating profile:', updateProfileError);
            return new Response(JSON.stringify({ error: '구독 활성화 중 오류가 발생했습니다' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            message: '구독이 활성화되었습니다!'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('Redeem code error:', error);
        return new Response(JSON.stringify({ error: '서버 오류가 발생했습니다' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
