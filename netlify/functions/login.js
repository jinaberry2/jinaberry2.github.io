const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

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
        const { username, password } = JSON.parse(event.body);

        if (!username || !password) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ message: '아이디와 비밀번호를 모두 입력해주세요.' })
            };
        }

        // 1. 유저 조회
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('username', username.trim())
            .maybeSingle();

        if (fetchError) throw fetchError;

        if (!user) {
            return {
                statusCode: 401,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ message: '존재하지 않는 아이디입니다.' })
            };
        }

        // 2. 승인 대기 또는 차단 상태 체크
        if (user.status === 'pending') {
            return {
                statusCode: 403,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ message: '아직 관리자의 가입 승인이 완료되지 않은 계정입니다.' })
            };
        } else if (user.status === 'blocked') {
            return {
                statusCode: 403,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ message: '접속이 차단된 계정입니다.' })
            };
        }

        // 3. 비밀번호 검증
        if (user.password !== hashPassword(password)) {
            return {
                statusCode: 401,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ message: '비밀번호가 일치하지 않습니다.' })
            };
        }

        // 4. 로그인 완료 로그 적재 (현재 시간 타임스탬프 기록)
        const now = Date.now();
        const { error: logError } = await supabase
            .from('login_logs')
            .insert([
                {
                    user_id: user.id,
                    username: user.username,
                    login_at: now,
                    last_active_at: now
                }
            ]);

        if (logError) throw logError;

        // 프론트엔드 세션 관리를 위해 필요한 유저 토큰 정보 응답
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                success: true,
                message: '로그인에 성공했습니다.',
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role
                }
            })
        };

    } catch (error) {
        console.error('로그인 처리 오류:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ message: `서버 오류 발생: ${error.message}` })
        };
    }
};
