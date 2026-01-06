import { createServerSupabaseClient } from '@/lib/supabase-server';

// Admin email whitelist
const ADMIN_EMAILS = ['totalointernational@gmail.com'];

// Generate random code
function generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing chars
    let code = 'CT-';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// GET: List all codes
export async function GET(req: Request) {
    try {
        const supabase = await createServerSupabaseClient();

        // Check auth
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
            return new Response(JSON.stringify({ error: '접근 권한이 없습니다' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get all codes
        const { data, error } = await supabase
            .from('invitation_codes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return new Response(JSON.stringify({ codes: data }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// POST: Generate new code
export async function POST(req: Request) {
    try {
        const { memo, count = 1 } = await req.json();

        const supabase = await createServerSupabaseClient();

        // Check auth
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
            return new Response(JSON.stringify({ error: '접근 권한이 없습니다' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Generate codes
        const codes = [];
        for (let i = 0; i < Math.min(count, 100); i++) {
            const code = generateCode();
            const { data, error } = await supabase
                .from('invitation_codes')
                .insert({ code, memo: memo || null })
                .select()
                .single();

            if (error) throw error;
            codes.push(data);
        }

        return new Response(JSON.stringify({ codes }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
