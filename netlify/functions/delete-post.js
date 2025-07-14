// netlify/functions/delete-post.js
// GitHub API와 통신하기 위한 라이브러리
const { Octokit } = require("@octokit/rest");

// UTF-8 문자(한글 등)를 Base64로 안전하게 인코딩하는 함수
function toBase64(str) {
  return Buffer.from(str).toString('base64');
}

exports.handler = async function(event, context) {
  // HTTP 메서드가 POST인지 확인
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed"
    };
  }

  // 요청 본문에서 postId 가져오기
  const { postId } = JSON.parse(event.body);

  // Netlify 환경 변수에서 GitHub 관련 정보 가져오기
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_USER = process.env.GITHUB_USER;
  const GITHUB_REPO = process.env.GITHUB_REPO;
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main'; // 기본 브랜치 'main'

  // posts.json 파일 경로
  const FILE_PATH = "posts.json";

  // Octokit 객체 생성 (GitHub API를 더 쉽게 사용하게 해줌)
  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  try {
    let currentSha, posts = [];

    // 1. 기존 posts.json 파일 정보 가져오기 (sha 값 필요)
    try {
      const { data: fileData } = await octokit.repos.getContent({
        owner: GITHUB_USER,
        repo: GITHUB_REPO,
        path: FILE_PATH,
        ref: GITHUB_BRANCH,
      });
      currentSha = fileData.sha;
      // 파일 내용을 디코딩하여 JSON 파싱
      const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
      posts = JSON.parse(content);
    } catch (error) {
      if (error.status === 404) {
        // 파일이 없으면 삭제할 글도 없으므로 404 반환
        return {
          statusCode: 404,
          body: JSON.stringify({ message: "posts.json 파일을 찾을 수 없습니다." })
        };
      }
      throw error; // 다른 오류는 다시 던짐
    }

    // 2. 삭제할 포스트를 제외하고 새로운 배열 생성
    const updatedPosts = posts.filter(p => p.id !== postId);

    // 포스트가 실제로 삭제되었는지 확인
    if (updatedPosts.length === posts.length) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "삭제할 포스트를 찾을 수 없습니다." })
      };
    }

    // 3. GitHub에 파일 업데이트
    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_USER,
      repo: GITHUB_REPO,
      path: FILE_PATH,
      message: `포스트 영구 삭제: ${postId}`, // 커밋 메시지
      content: toBase64(JSON.stringify(updatedPosts, null, 2)), // 업데이트된 내용 인코딩
      sha: currentSha, // 기존 파일의 sha 값
      branch: GITHUB_BRANCH,
    });

    // 성공 응답 반환
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "글이 성공적으로 영구 삭제되었습니다!" }),
    };

  } catch (error) {
    console.error("GitHub API 오류:", error);
    // 실패 응답 반환
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `서버 오류 발생: ${error.message}` }),
    };
  }
};
