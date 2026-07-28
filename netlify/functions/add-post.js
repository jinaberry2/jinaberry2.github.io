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
      // 2. JSON 파싱 시도 (프론트엔드에서 보낸 값 파싱)
      postData = JSON.parse(event.body);
  } catch (error) {
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
      
      // 파일 내용을 디코딩
      const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
      
      // 🌟 [안전장치 추가] 깃허브의 posts.json 파일이 완전히 비어있거나 깨졌을 때 터지는 현상 방지
      if (content.trim()) {
        try {
          posts = JSON.parse(content);
        } catch (parseError) {
          console.error("GitHub의 posts.json 파싱 실패, 빈 배열로 우회합니다:", parseError);
          posts = []; // 깨진 JSON일 경우 초기화하여 덮어쓰기 유도
        }
      }
    } catch (error) {
      if (error.status !== 404) throw error;
      // 파일이 없으면(404) 그냥 진행 (새로 만들면 됨)
      console.log('posts.json 파일을 찾을 수 없어 새로 생성합니다.');
    }

    // 4. 새 포스트에 고유 id 부여 로직 최적화 및 기본 필드 추가
    // 중복 ID 방지를 위해 배열 내 최대 ID + 1 방식을 채택하고, 누락 방지용 필드 적용
    const nextId = posts.length > 0 ? Math.max(...posts.map(p => p.id || 0)) + 1 : 1;

    const newPost = {
      ...postData,
      id: nextId, // 🌟 타임스탬프 방식에서 겹치지 않는 숫자 카운트 방식으로 최적화
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "글이 성공적으로 등록되었습니다!", data: updateData }),
    };

  } catch (error) {
    console.error("GitHub API 오류:", error);
    // 실패 응답 반환
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `서버 오류 발생: ${error.message}` }),
    };
  }
};
