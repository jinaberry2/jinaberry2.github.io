const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

exports.handler = async (event, context) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            }
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }

    try {
        const { username } = JSON.parse(event.body);
        if (!username) {
            return { statusCode: 400, body: JSON.stringify({ message: 'Missing username' }) };
        }

        const now = Date.now();

        // 가장 최근에 생성된 해당 유저의 로그인 로그를 찾아 마지막 활동 시간을 업데이트합니다.
        const { data: latestLog, error: findError } = await supabase
            .from('login_logs')
            .select('id')
            .eq('username', username)
            .order('login_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (findError) throw findError;

        if (latestLog) {
            const { error: updateError } = await supabase
                .from('login_logs')
                .update({ last_active_at: now })
                .eq('id', latestLog.id);

            if (updateError) throw updateError;
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: true })
        };
    } catch (error) {
        console.error('활동 상태 갱신 실패:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ message: error.message })
        };
    }
};
