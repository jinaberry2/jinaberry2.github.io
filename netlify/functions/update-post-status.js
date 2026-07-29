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
        
        // 🌟 [핵심 보완] 기존 단일 삭제(postId)와 새 일괄 삭제(ids) 포맷을 완벽하게 동시 지원
        let targetIds = [];
        if (bodyData.ids && Array.isArray(bodyData.ids)) {
            targetIds = bodyData.ids;
        } else if (bodyData.postId) {
            targetIds = [bodyData.postId];
        }

        const newStatus = bodyData.status || 'deleted';
        // 프론트에서 타임스탬프를 안 보내주면 서버 시간으로 대체
        const timestamp = bodyData.deletedTimestamp || Date.now(); 

        if (targetIds.length === 0) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ message: 'Missing post IDs.' })
            };
        }

        // 데이터 타입 변환 안전장치 (숫자 ID와 문자열 ID 모두 대응)
        const formattedIds = targetIds.map(id => isNaN(id) ? id : parseInt(id, 10));

        // 🌟 복잡한 GitHub API(Octokit) 조회를 걷어내고 Supabase posts 테이블에 바로 꽂아 넣습니다.
        const { error } = await supabase
            .from('posts')
            .update({ 
                status: newStatus,
                deletedTimestamp: newStatus === 'deleted' ? timestamp : null
            })
            .in('id', formattedIds);

        if (error) throw error;

        return {
            statusCode: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' 
            },
            body: JSON.stringify({ success: true, message: 'Post status updated successfully.' }),
        };
    } catch (error) {
        console.error('글 상태 업데이트 실패:', error);
        return {
            statusCode: 500,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' 
            },
            body: JSON.stringify({ message: `Failed to update post status: ${error.message}` }),
        };
    }
};
