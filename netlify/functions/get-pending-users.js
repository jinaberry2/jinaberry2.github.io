const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

exports.handler = async (event, context) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('username, created_at')
            .eq('status', 'pending')
            .order('created_at', { ascending: true });

        if (error) throw error;

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify(users)
        };
    } catch (error) {
        console.error('대기 유저 조회 실패:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ message: error.message })
        };
    }
};
