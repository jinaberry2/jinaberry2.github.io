const { Octokit } = require("@octokit/rest");

exports.handler = async (event, context) => {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_USER = process.env.GITHUB_USER;
  const GITHUB_REPO = process.env.GITHUB_REPO;
  const FILE_PATH = "posts.json";

  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  try {
    const { data: fileData } = await octokit.repos.getContent({
      owner: GITHUB_USER,
      repo: GITHUB_REPO,
      path: FILE_PATH,
    });

    // 파일 내용을 Base64 디코딩하여 반환
    const posts = Buffer.from(fileData.content, 'base64').toString('utf-8');

    return {
      statusCode: 200,
      body: posts,
      headers: {
        "Content-Type": "application/json"
      }
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `Failed to fetch posts: ${error.message}` }),
    };
  }
};
