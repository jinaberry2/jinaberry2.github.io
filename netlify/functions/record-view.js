const { Octokit } = require("@octokit/rest");

exports.handler = async (event, context) => {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_USER = process.env.GITHUB_USER;
    const GITHUB_REPO = process.env.GITHUB_REPO;
    const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
    const VIEWS_FILE_PATH = "recent-views.json";
    const POSTS_FILE_PATH = "posts.json";

    const octokit = new Octokit({ auth: GITHUB_TOKEN });
    const { postId } = JSON.parse(event.body);

    try {
        // --- 1. posts.json 파일 업데이트 (조회수 증가) ---
        let postsFile, postsSha;
        try {
            const { data: postsData } = await octokit.repos.getContent({
                owner: GITHUB_USER,
                repo: GITHUB_REPO,
                path: POSTS_FILE_PATH,
                ref: GITHUB_BRANCH,
            });
            postsSha = postsData.sha;
            postsFile = JSON.parse(Buffer.from(postsData.content, 'base64').toString('utf-8'));
        } catch (error) {
            if (error.status !== 404) throw error;
            return { statusCode: 500, body: JSON.stringify({ message: "posts.json 파일이 없습니다." }) };
        }

        const postToUpdate = postsFile.find(p => p.id === postId);
        if (postToUpdate) {
            postToUpdate.views = (postToUpdate.views || 0) + 1;
        } else {
            return { statusCode: 404, body: JSON.stringify({ message: "Post not found in posts.json." }) };
        }
        
        await octokit.repos.createOrUpdateFileContents({
            owner: GITHUB_USER,
            repo: GITHUB_REPO,
            path: POSTS_FILE_PATH,
            message: `Increment view count for post: ${postId}`,
            content: Buffer.from(JSON.stringify(postsFile, null, 2)).toString("base64"),
            sha: postsSha,
            branch: GITHUB_BRANCH,
        });

        // --- 2. recent-views.json 파일 업데이트 (최근 본 글 목록) ---
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

        viewsFile = viewsFile.filter(view => view.id !== postId);
        viewsFile.unshift({ id: postId, timestamp: Date.now() });

        await octokit.repos.createOrUpdateFileContents({
            owner: GITHUB_USER,
            repo: GITHUB_REPO,
            path: VIEWS_FILE_PATH,
            message: `Add recent view: ${postId}`,
            content: Buffer.from(JSON.stringify(viewsFile, null, 2)).toString("base64"),
            sha: viewsSha,
            branch: GITHUB_BRANCH,
        });

        return { statusCode: 200, body: JSON.stringify({ message: "View recorded successfully." }) };
    } catch (error) {
        console.error("Error recording view:", error);
        return { statusCode: 500, body: JSON.stringify({ message: `Failed to record view: ${error.message}` }) };
    }
};
