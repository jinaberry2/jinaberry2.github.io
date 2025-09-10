const { Octokit } = require("@octokit/rest");

function toBase64(str) {
  return Buffer.from(str).toString('base64');
}

exports.handler = async function(event, context) {
  if (!event.body || event.httpMethod !== 'POST') {
      return {
          statusCode: 400,
          body: JSON.stringify({ message: "Invalid request. Body is missing or not a POST request." }),
      };
  }
  
  const postData = JSON.parse(event.body);

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_USER = process.env.GITHUB_USER;
  const GITHUB_REPO = process.env.GITHUB_REPO;
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
  const FILE_PATH = "posts.json";

  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  try {
    let currentSha, posts = [];

    try {
      const { data: fileData } = await octokit.repos.getContent({
        owner: GITHUB_USER,
        repo: GITHUB_REPO,
        path: FILE_PATH,
        ref: GITHUB_BRANCH,
      });
      currentSha = fileData.sha;
      const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
      posts = JSON.parse(content);
    } catch (error) {
      if (error.status !== 404) throw error;
      console.log('posts.json 파일을 찾을 수 없어 새로 생성합니다.');
    }

    const newPost = {
      ...postData,
      id: Date.now(),
      liked: false,
      views: 0
    };
    posts.push(newPost);

    const { data: updateData } = await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_USER,
      repo: GITHUB_REPO,
      path: FILE_PATH,
      message: `포스트 추가: ${postData.title}`,
      content: toBase64(JSON.stringify(posts, null, 2)),
      sha: currentSha,
      branch: GITHUB_BRANCH,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "글이 성공적으로 등록되었습니다!", data: updateData }),
    };

  } catch (error) {
    console.error("GitHub API 오류:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `서버 오류 발생: ${error.message}` }),
    };
  }
};
