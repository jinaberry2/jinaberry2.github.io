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

  // 요청 본문에서 시리즈 이름 가져오기
  const { name } = JSON.parse(event.body);

  // 시리즈 이름이 없으면 오류 반환
  if (!name) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Series name is required." })
    };
  }

  // Netlify 환경 변수에서 GitHub 관련 정보 가져오기
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_USER = process.env.GITHUB_USER;
  const GITHUB_REPO = process.env.GITHUB_REPO;
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
  const FILE_PATH = "netlify/functions/series.json";

  // Octokit 객체 생성 (GitHub API를 더 쉽게 사용하게 해줌)
  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  try {
    let currentSha, series = [];

    // 1. 기존 series.json 파일 정보 가져오기 (sha 값 필요)
    try {
      const { data: fileData } = await octokit.repos.getContent({
        owner: GITHUB_USER,
        repo: GITHUB_REPO,
        path: FILE_PATH,
        ref: GITHUB_BRANCH,
      });
      currentSha = fileData.sha;
      const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
      series = JSON.parse(content);
    } catch (error) {
      if (error.status === 404) {
        console.log('series.json 파일을 찾을 수 없어 새로 생성합니다.');
        // 파일이 없으면 그냥 진행 (새로 만들면 됨)
      } else {
        throw error;
      }
    }

    // 2. 새 시리즈에 id를 추가하고 배열에 추가
    const newSeries = {
      id: Date.now(),
      name: name,
      postIds: [],
    };
    series.push(newSeries);

    // 3. GitHub에 파일 업데이트(또는 생성)
    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_USER,
      repo: GITHUB_REPO,
      path: FILE_PATH,
      message: `시리즈 추가: ${name}`,
      content: toBase64(JSON.stringify(series, null, 2)),
      sha: currentSha, // 기존 파일의 sha 값 (없으면 undefined)
      branch: GITHUB_BRANCH,
    });

    // 성공 응답 반환
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "시리즈가 성공적으로 등록되었습니다!", data: newSeries }),
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
