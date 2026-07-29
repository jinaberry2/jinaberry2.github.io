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
        
        // 🌟 [완벽 대응] 일괄 삭제(ids)와 상세페이지 단일 삭제(postId) 포맷을 모두 수집
        let targetIds = [];
        if (bodyData.ids && Array.isArray(bodyData.ids)) {
            targetIds = bodyData.ids;
        } else if (bodyData.postId) {
            targetIds = [bodyData.postId];
        } else if (bodyData.id) {
            targetIds = [bodyData.id];
        }

        if (targetIds.length === 0) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ message: 'Missing post IDs for permanent deletion.', count: 0 })
            };
        }

        // 데이터 타입 변환 안전장치 (숫자 ID형태 대응)
        const formattedIds = targetIds.map(id => isNaN(id) ? id : parseInt(id, 10));

        // 🌟 Supabase posts 테이블에서 해당 ID들의 데이터를 진짜로 영구 삭제(Hard Delete)
        // 기존 Octokit 및 posts.json 관련 코드는 전부 Supabase 내부 삭제 쿼리로 대체되었습니다.
        const { data, error } = await supabase
            .from('posts')
            .delete()
            .in('id', formattedIds)
            .select(); // 삭제된 행의 정보를 반환받아 정확한 개수를 세기 위함

        if (error) throw error;

        // 실제 Supabase에서 삭제 성공한 데이터 행의 개수 계산
        const deletedCount = data ? data.length : formattedIds.length;

        return {
            statusCode: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' 
            },
            body: JSON.stringify({ 
                success: true, 
                message: 'Posts permanently deleted from Supabase.', 
                count: deletedCount // 프론트엔드 알림창(script.js)에 뿌려줄 정확한 숫자 반환
            }),
        };
    } catch (error) {
        console.error('영구 삭제 실패:', error);
        return {
            statusCode: 500,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' 
            },
            body: JSON.stringify({ message: `Failed to permanently delete posts: ${error.message}`, count: 0 }),
        };
    }
};
