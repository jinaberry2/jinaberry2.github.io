const { createClient } = require('@supabase/supabase-js');

// Netlify 환경변수(Environment Variables)에서 URL과 KEY를 자동으로 가져옵니다.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

exports.handler = async () => {
    try {
        // 'posts' 자리에는 실제 Supabase에 만드신 테이블 이름을 넣으셔야 합니다.
        // 모든 컬럼(*)을 가져오고, id 기준으로 내림차순(최신순) 정렬하는 예시입니다.
        const { data, error } = await supabase
            .from('posts') 
            .select('*')
            .order('id', { ascending: false });

        if (error) {
            throw error;
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                // CORS 에러 방지용 (필요시)
                'Access-Control-Allow-Origin': '*', 
            },
            body: JSON.stringify(data),
        };
    } catch (error) {
        console.error('Failed to retrieve posts from Supabase:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to retrieve posts.', error: error.message }),
        };
    }
};
