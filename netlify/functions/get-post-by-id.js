// netlify/functions/get-post-by-id.js
const { Octokit } = require("@octokit/rest");

exports.handler = async function(event) {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: "Method Not Allowed"
    };
  }

  const postId = event.queryStringParameters.id;

  if (!postId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Post ID is required." })
    };
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_USER = process.env.GITHUB_USER;
  const GITHUB_REPO = process.env.GITHUB_REPO;
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
  const FILE_PATH = "posts.json";

  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  try {
    const { data: fileData } = await octokit.repos.getContent({
      owner: GITHUB_USER,
      repo: GITHUB_REPO,
      path: FILE_PATH,
      ref: GITHUB_BRANCH,
    });
    
    const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
    const posts = JSON.parse(content);
    
    const post = posts.find(p => p.id == postId);

    if (post) {
      return {
        statusCode: 200,
        body: JSON.stringify(post),
      };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Post not found." })
      };
    }

  } catch (error) {
    console.error("GitHub API 오류:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `서버 오류 발생: ${error.message}` }),
    };
  }
};
