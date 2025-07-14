// netlify/functions/update-post-status.js
const { Octokit } = require("@octokit/rest");

function toBase64(str) {
  return Buffer.from(str).toString('base64');
}

exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed"
    };
  }

  const { postId, status, deletedTimestamp } = JSON.parse(event.body);

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_USER = process.env.GITHUB_USER;
  const GITHUB_REPO = process.env.GITHUB_REPO;
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
  const FILE_PATH = "posts.json";

  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  try {
    let currentSha, posts = [];

    // 1. 기존 posts.json 파일 정보 가져오기
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
      if (error.status === 404) {
        return {
          statusCode: 404,
          body: JSON.stringify({ message: "posts.json 파일을 찾을 수 없습니다." })
        };
      }
      throw error;
    }

    // 2. 해당 postId를 찾아 status 업데이트
    let postFound = false;
    const updatedPosts = posts.map(p => {
      if (p.id == postId) { // postId는 문자열로 넘어올 수 있으므로 == 사용
        postFound = true;
        return {
          ...p,
          status: status, // 'deleted' 또는 'active'
          deletedTimestamp: status === 'deleted' ? deletedTimestamp : undefined // 삭제 시 타임스탬프 추가
        };
      }
      return p;
    });

    if (!postFound) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "업데이트할 포스트를 찾을 수 없습니다." })
      };
    }

    // 3. GitHub에 파일 업데이트
    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_USER,
      repo: GITHUB_REPO,
      path: FILE_PATH,
      message: `Update post status to '${status}' for post: ${postId}`,
      content: toBase64(JSON.stringify(updatedPosts, null, 2)),
      sha: currentSha,
      branch: GITHUB_BRANCH,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `글 상태가 성공적으로 '${status}'로 업데이트되었습니다!` }),
    };

  } catch (error) {
    console.error("GitHub API 오류:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `서버 오류 발생: ${error.message}` }),
    };
  }
};
