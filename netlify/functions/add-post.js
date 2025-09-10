// GitHub API와 통신하기 위한 라이브러리
const { Octokit } = require("@octokit/rest");

// UTF-8 문자(한글 등)를 Base64로 안전하게 인코딩하는 함수
function toBase64(str) {
  return Buffer.from(str).toString('base64');
}

exports.handler = async function(event, context) {
  // 1. 요청 본문 유효성 검사 및 로그 출력
  if (!event.body || event.httpMethod !== 'POST') {
      console.error("Invalid request: body is missing or not a POST request.");
      return {
          statusCode: 400,
          body: JSON.stringify({ message: "Invalid request." }),
      };
  }
  
  // 디버깅을 위해 클라이언트에서 전송된 원본 데이터를 로그에 출력
  console.log("Raw event body received:", event.body);
  
  let postData;
  try {
      // 2. JSON 파싱 시도
      postData = JSON.parse(event.body);
  } catch (error) {
      // JSON 파싱 실패 시, 자세한 오류 메시지 반환
      console.error("JSON parsing error:", error);
      return {
          statusCode: 400,
          body: JSON.stringify({ message: `JSON 파싱 오류: ${error.message}` }),
      };
  }

  // Netlify 설정에 저장된 비밀 값들을 안전하게 가져오기
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_USER = process.env.GITHUB_USER;
  const GITHUB_REPO = process.env.GITHUB_REPO;
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
  const FILE_PATH = "posts.json";

  // Octokit 객체 생성 (GitHub API를 더 쉽게 사용하게 해줌)
  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  try {
    let currentSha, posts = [];

    // 3. 기존 posts.json 파일 정보 가져오기 (sha 값 필요)
    try {
      const { data: fileData } = await octokit.repos.getContent({
        owner: GITHUB_USER,
        repo: GITHUB_REPO,
        path: FILE_PATH,
        ref: GITHUB_BRANCH,
      });
      currentSha = fileData.sha;
      // 파일 내용을 디코딩하고 새 포스트 추가
      const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
      posts = JSON.parse(content);
    } catch (error) {
      if (error.status !== 404) throw error;
      // 파일이 없으면(404) 그냥 진행 (새로 만들면 됨)
      console.log('posts.json 파일을 찾을 수 없어 새로 생성합니다.');
    }

    // 4. 새 포스트에 id와 liked: false를 추가하고 배열에 추가
    const newPost = {
      ...postData,
      id: Date.now(),
      liked: false,
      views: 0
    };
    posts.push(newPost);

    // 5. GitHub에 파일 업데이트(또는 생성)
    const { data: updateData } = await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_USER,
      repo: GITHUB_REPO,
      path: FILE_PATH,
      message: `포스트 추가: ${postData.title}`,
      content: toBase64(JSON.stringify(posts, null, 2)),
      sha: currentSha,
      branch: GITHUB_BRANCH,
    });

    // 성공 응답 반환
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "글이 성공적으로 등록되었습니다!", data: updateData }),
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
