const { Octokit } = require("@octokit/rest");

exports.handler = async () => {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_USER = process.env.GITHUB_USER;
    const GITHUB_REPO = process.env.GITHUB_REPO;
    const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
    const FILE_PATH = "netlify/functions/series.json";

    const octokit = new Octokit({ auth: GITHUB_TOKEN });

    try {
        const { data: fileData } = await octokit.repos.getContent({
            owner: GITHUB_USER,
            repo: GITHUB_REPO,
            path: FILE_PATH,
            ref: GITHUB_BRANCH,
        });

        // 파일 내용을 Base64에서 UTF-8로 디코딩
        const seriesData = Buffer.from(fileData.content, 'base64').toString('utf-8');

        return {
            statusCode: 200,
            body: seriesData,
            headers: { "Content-Type": "application/json" }
        };
    } catch (error) {
        if (error.status === 404) {
            // 파일이 없으면 빈 배열 반환
            return {
                statusCode: 200,
                body: JSON.stringify([]),
                headers: { "Content-Type": "application/json" }
            };
        }
        console.error('GitHub API 오류:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: '시리즈 데이터를 불러오는 데 실패했습니다.' }),
        };
    }
};
