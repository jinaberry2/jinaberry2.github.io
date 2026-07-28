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
        const bodyData = JSON.parse(event.body);
        
        // 🌟 [핵심 해결책] 프론트엔드에서 id로 보내든 postId로 보내든 둘 다 낚아채도록 처리합니다.
        const targetId = bodyData.id || bodyData.postId;
        const isLiked = bodyData.liked;
        const timestamp = bodyData.likedTimestamp || (isLiked ? Date.now() : null);

        if (!targetId) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ message: 'Missing post ID.' })
            };
        }

        // Supabase의 'posts' 테이블에서 해당 id를 가진 글의 좋아요 상태를 업데이트합니다.
        const { data, error } = await supabase
            .from('posts')
            .update({ 
                liked: isLiked, 
                likedTimestamp: timestamp 
            })
            .eq('id', targetId);

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
