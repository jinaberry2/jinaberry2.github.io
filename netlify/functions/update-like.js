const { Octokit } = require("@octokit/rest");

exports.handler = async (event, context) => {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_USER = process.env.GITHUB_USER;
    const GITHUB_REPO = process.env.GITHUB_REPO;
    const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
    const FILE_PATH = "posts.json";

    const octokit = new Octokit({ auth: GITHUB_TOKEN });
    const { postId, liked } = JSON.parse(event.body);

    try {
        const { data: fileData } = await octokit.repos.getContent({
            owner: GITHUB_USER,
            repo: GITHUB_REPO,
            path: FILE_PATH,
            ref: GITHUB_BRANCH,
        });
        const currentSha = fileData.sha;
        const posts = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf-8'));

        const postToUpdate = posts.find(p => p.id === postId);
        if (postToUpdate) {
            postToUpdate.liked = liked;
            // ✅ 좋아요를 누른 경우, 현재 시각을 likedTimestamp에 저장
            if (liked) {
                postToUpdate.likedTimestamp = Date.now();
            } else {
                // ✅ 좋아요를 취소한 경우, likedTimestamp 속성을 제거
                delete postToUpdate.likedTimestamp;
            }
        } else {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "Post not found." }),
            };
        }

        await octokit.repos.createOrUpdateFileContents({
            owner: GITHUB_USER,
            repo: GITHUB_REPO,
            path: FILE_PATH,
            message: `Update like status for post: ${postId}`,
            content: Buffer.from(JSON.stringify(posts, null, 2)).toString("base64"),
            sha: currentSha,
            branch: GITHUB_BRANCH,
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Like status updated successfully." }),
        };
    } catch (error) {
        console.error("Error updating like status:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Failed to update like status: ${error.message}` }),
        };
    }
};
