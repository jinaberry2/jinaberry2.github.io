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
        return { 
            statusCode: 405, 
            body: JSON.stringify({ message: 'Method Not Allowed' }) 
        };
    }

    try {
        const bodyData = JSON.parse(event.body);
        const rawId = bodyData.postId || bodyData.id;

        if (!rawId) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ message: 'Missing post ID.' })
            };
        }

        const targetId = isNaN(rawId) ? rawId : parseInt(rawId, 10);

        // 1. 현재 조회수(views) 가져오기
        const { data: post, error: fetchError } = await supabase
            .from('posts')
            .select('views')
            .eq('id', targetId)
            .single();

        if (fetchError) throw fetchError;

        const currentViews = post ? (post.views || 0) : 0;
        const newViews = currentViews + 1;

        // 2. 조회수(+1)와 현재 시간(viewedTimestamp)을 동시에 Supabase에 업데이트
        const { error: updateError } = await supabase
            .from('posts')
            .update({ 
                views: newViews,
                viewedTimestamp: Date.now() // 최근 본 시각 저장
            })
            .eq('id', targetId);

        if (updateError) throw updateError;

        return {
            statusCode: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' 
            },
            body: JSON.stringify({ message: "View recorded successfully.", views: newViews }),
        };
    } catch (error) {
        console.error("Error recording view:", error);
        return {
            statusCode: 500,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' 
            },
            body: JSON.stringify({ message: `Failed to record view: ${error.message}` }),
        };
    }
};
