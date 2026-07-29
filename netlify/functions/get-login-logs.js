const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

exports.handler = async (event, context) => {
    try {
        // 1. 최근 로그인 로그 50개 조회
        const { data: logs, error: logsError } = await supabase
            .from('login_logs')
            .select('*')
            .order('login_at', { ascending: false })
            .limit(50);

        if (logsError) throw logsError;

        // 2. 실시간 접속자 필터링 (마지막 활동 시간이 현재로부터 5분(300000ms) 이내인 경우)
        const fiveMinutesAgo = Date.now() - 300000;
        
        const { data: liveData, error: liveError } = await supabase
            .from('login_logs')
            .select('username')
            .gt('last_active_at', fiveMinutesAgo);

        if (liveError) throw liveError;

        // 중복 아이디 제거하여 깔끔하게 명단 정제
        const uniqueUsers = [];
        const seen = new Set();
        if (liveData) {
            liveData.forEach(item => {
                if (!seen.has(item.username)) {
                    seen.add(item.username);
                    uniqueUsers.push({ username: item.username });
                }
            });
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                logs: logs || [],
                liveUsers: uniqueUsers
            })
        };
    } catch (error) {
        console.error('로그 분석 실패:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ message: error.message })
        };
    }
};
