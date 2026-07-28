const { createClient } = require('@supabase/supabase-js');
const { Octokit } = require("@octokit/rest");

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

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_USER = process.env.GITHUB_USER;
    const GITHUB_REPO = process.env.GITHUB_REPO;
    const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
    const VIEWS_FILE_PATH = "recent-views.json";

    const octokit = new Octokit({ auth: GITHUB_TOKEN });
    const bodyData = JSON.parse(event.body);
    const rawId = bodyData.postId || bodyData.id;

    if (!rawId) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ message: 'Missing post ID.' })
        };
    }

    // 데이터 타입 변환 안전장치 (숫자형 ID 대응)
    const targetId = isNaN(rawId) ? rawId : parseInt(rawId, 10);

    try {
        // --- 파트 1: Supabase 'posts' 테이블 조회수 증가 로직 ---
        // 1. 현재 조회수 값 가져오기
        const { data: post, error: fetchError } = await supabase
            .from('posts')
            .select('views')
            .eq('id', targetId)
            .single();

        if (fetchError) throw fetchError;

        const currentViews = post ? (post.views || 0) : 0;
        const newViews = currentViews + 1;

        // 2. 조회수를 1 증가시켜 업데이트
        const { error: updateError } = await supabase
            .from('posts')
            .update({ views: newViews })
            .eq('id', targetId);

        if (updateError) throw updateError;


        // --- 파트 2: 기존 깃허브 recent-views.json 파일 업데이트 (최근 본 목록 유지) ---
        let viewsFile, viewsSha;
        try {
            const { data: viewsData } = await octokit.repos.getContent({
                owner: GITHUB_USER,
                repo: GITHUB_REPO,
                path: VIEWS_FILE_PATH,
                ref: GITHUB_BRANCH,
            });
            viewsSha = viewsData.sha;
            viewsFile = JSON.parse(Buffer.from(viewsData.content, 'base64').toString('utf-8'));
        } catch (error) {
            if (error.status === 404) {
                 viewsFile = [];
                 viewsSha = undefined;
            } else throw error;
        }

        // 기존 내역에 동일한 id가 있으면 제거하고 맨 앞에 최신 기록 배치
        viewsFile = viewsFile.filter(view => view.id !== targetId);
        viewsFile.unshift({ id: targetId, timestamp: Date.now() });

        // 깃허브에 recent-views.json 업데이트 저장
        await octokit.repos.createOrUpdateFileContents({
            owner: GITHUB_USER,
            repo: GITHUB_REPO,
            path: VIEWS_FILE_PATH,
            message: `Add recent view via Supabase action: ${targetId}`,
            content: Buffer.from(JSON.stringify(viewsFile, null, 2)).toString("base64"),
            sha: viewsSha,
            branch: GITHUB_BRANCH,
        });

        return { 
            statusCode: 200, 
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' 
            },
            body: JSON.stringify({ message: "View recorded successfully.", views: newViews }) 
        };

    } catch (error) {
        console.error("Error recording view:", error);
        return { 
            statusCode: 500, 
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' 
            },
            body: JSON.stringify({ message: `Failed to record view: ${error.message}` }) 
        };
    }
};
