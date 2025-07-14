// 📂 /netlify/functions/savePost.js
// Netlify Functions 디렉토리 안에 이 파일을 넣으셔야 해요.
// 글 등록 시 posts.json 파일을 자동으로 깃허브에 커밋합니다.

const { Octokit } = require("@octokit/rest");
const fetch = require("node-fetch");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO_OWNER = "jinaberry2";
  const REPO_NAME = "jinaberry2.github.io";
  const FILE_PATH = "posts.json";

  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  const newPost = JSON.parse(event.body);

  try {
    // 1. 기존 posts.json 가져오기
    const { data: fileData } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: FILE_PATH,
    });

    const sha = fileData.sha;
    const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
    const posts = JSON.parse(content);

    // 2. 새 글 추가
    posts.push({
      ...newPost,
      date: new Date().toISOString(),
    });

    // 3. 깃허브에 다시 커밋
    await octokit.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: FILE_PATH,
      message: `Add post: ${newPost.title}`,
      content: Buffer.from(JSON.stringify(posts, null, 2)).toString('base64'),
      sha: sha,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Post saved successfully!" }),
    };
  } catch (error) {
    console.error("Error saving post:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
