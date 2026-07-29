const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 비밀번호 암호화(SHA-256) 함수
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

        // 1. 아이디 중복 체크
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('username')
            .eq('username', username.trim())
            .maybeSingle();

        if (checkError) throw checkError;

        if (existingUser) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ message: '이미 존재하는 아이디입니다.' })
            };
        }

        // 2. 비밀번호 암호화 및 유저 생성 (기본값 role: 'user', status: 'pending')
        const hashedPassword = hashPassword(password);
        const { error: insertError } = await supabase
            .from('users')
            .insert([
                {
                    username: username.trim(),
                    password: hashedPassword,
                    role: 'user',
                    status: 'pending'
                }
            ]);

        if (insertError) throw insertError;

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: true, message: '회원가입 신청이 완료되었습니다. 관리자 승인 후 로그인 가능합니다.' })
        };

    } catch (error) {
        console.error('회원가입 처리 오류:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ message: `서버 오류 발생: ${error.message}` })
        };
    }
};
