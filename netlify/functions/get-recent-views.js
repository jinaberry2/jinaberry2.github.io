const { Octokit } = require("@octokit/rest");

exports.handler = async (event, context) => {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_USER = process.env.GITHUB_USER;
    const GITHUB_REPO = process.env.GITHUB_REPO;
    const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
    const FILE_PATH = "recent-views.json";

    const octokit = new Octokit({ auth: GITHUB_TOKEN });

    try {
        const { data: fileData } = await octokit.repos.getContent({
            owner: GITHUB_USER,
            repo: GITHUB_REPO,
            path: FILE_PATH,
            ref: GITHUB_BRANCH,
        });
        const recentViews = Buffer.from(fileData.content, 'base64').toString('utf-8');

        return {
            statusCode: 200,
            body: recentViews,
            headers: { "Content-Type": "application/json" }
        };
    } catch (error) {
        if (error.status === 404) {
            return { statusCode: 200, body: JSON.stringify([]) };
        }
        console.error("Error fetching recent views:", error);
        return { statusCode: 500, body: JSON.stringify({ message: `Failed to fetch recent views: ${error.message}` }) };
    }
};
