// Supabase 공식 클라이언트 라이브러리 로드
const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  // 1. 요청 본문 유효성 검사 (POST 요청만 허용)
  if (!event.body || event.httpMethod !== 'POST') {
      console.error("Invalid request: body is missing or not a POST request.");
      return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: "잘못된 요청 형식입니다." }),
      };
  }
  
  let postData;
  try {
      // 2. 프론트엔드(write.js)에서 보낸 새 글 데이터 파싱
      postData = JSON.parse(event.body);
  } catch (error) {
      console.error("JSON parsing error:", error);
      return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: `데이터 해석 오류: ${error.message}` }),
      };
  }

  // 3. Netlify에 설정한 환경 변수(비밀 키) 가져오기
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error("Supabase 환경 변수가 Netlify에 설정되지 않았습니다.");
      return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: "서버 환경 변수 설정 오류가 발생했습니다." }),
      };
  }

  // 4. Supabase 클라이언트 객체 생성
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    // 5. Supabase의 'posts' 테이블에 새 소설 데이터 삽입 (Insert)
    // 수동 매핑 로직 없이 프론트엔드가 보낸 seriesName이 그대로 안전하게 엑셀 행으로 저장됩니다.
    const { data, error } = await supabase
      .from('posts')
      .insert([
        {
          title: postData.title,
          author: postData.author,
          content: postData.content,
          seriesName: postData.seriesName || "", // 🌟 입력한 시리즈 텍스트 반영
          thumbnail: postData.thumbnail || null,
          timestamp: postData.timestamp || Date.now(),
          liked: false, // 기본값 false 적용
          views: 0,     // 기본값 0 적용
          status: 'published' // 기본값 published 적용
        }
      ])
      .select(); // 등록된 데이터를 반환받음

    if (error) throw error;

    // 성공 응답 반환 (프론트엔드가 인지할 수 있도록 표준 포맷 준수)
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "글이 성공적으로 등록되었습니다!", data: data }),
    };

  } catch (error) {
    console.error("Supabase DB 연동 오류:", error);
    // 실패 응답 반환
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `데이터베이스 저장 실패: ${error.message}` }),
    };
  }
};
