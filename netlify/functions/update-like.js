const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

exports.handler = async (event, context) => {
    // CORS 대응을 위한 preflight 요청 처리
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
        return { 
            statusCode: 405, 
            body: JSON.stringify({ message: 'Method Not Allowed' }) 
        };
    }

    try {
        // 프론트엔드(post.js)에서 보내오는 페이로드 파싱
        const { id, liked, likedTimestamp } = JSON.parse(event.body);

        // Supabase의 'posts' 테이블에서 해당 id를 가진 글의 좋아요 상태를 업데이트합니다.
        const { data, error } = await supabase
            .from('posts')
            .update({ 
                liked: liked, 
                likedTimestamp: likedTimestamp 
            })
            .eq('id', id);

        if (error) throw error;

        return {
            statusCode: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' 
            },
            body: JSON.stringify({ success: true, message: 'Like status updated successfully.' }),
        };
    } catch (error) {
        console.error('좋아요 서버 반영 실패:', error);
        return {
            statusCode: 500,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' 
            },
            body: JSON.stringify({ message: `Failed to update like status: ${error.message}` }),
        };
    }
};
