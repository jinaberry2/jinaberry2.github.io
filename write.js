document.addEventListener('DOMContentLoaded', () => {
    const publishBtn = document.getElementById('publish-btn');
    const postTitleInput = document.getElementById('post-title');
    const postAuthorInput = document.getElementById('post-author');
    const postContentEditable = document.getElementById('post-content');
    const imageInput = document.getElementById('imageInput');
    const insertImageBtn = document.getElementById('insertImageBtn');
    const toolbarButtons = document.querySelectorAll('.editor-toolbar button');
    const wordCountSpan = document.getElementById('word-count'); // HTML에 추가된 글자수 카운터 요소

    const ADD_POST_URL = "/.netlify/functions/add-post";

    let firstImageThumbnail = null; // ✅ 썸네일로 사용할 첫 번째 이미지의 Base64 URL을 저장할 변수

    // 글자수 카운트 및 업데이트 함수
    const updateWordCount = () => {
        // innerText를 사용하여 HTML 태그를 제외한 순수 텍스트를 가져옴
        // trim()을 사용하여 양쪽 끝의 공백을 제거하고 정확한 글자수 계산
        const text = postContentEditable.innerText.trim();
        const count = text.length;
        if (wordCountSpan) {
            wordCountSpan.textContent = `${count}자`;
        }
    };

    // 'post-content' 영역에 내용이 입력될 때마다 글자수 업데이트
    if (postContentEditable) {
        postContentEditable.addEventListener('input', updateWordCount);
        // 페이지 로드 시 초기 글자수 설정
        updateWordCount();
    }


    publishBtn.addEventListener('click', async () => {
        const title = postTitleInput.value.trim();
        const author = postAuthorInput.value.trim();
        const content = postContentEditable.innerHTML;

        if (!title || !content) {
            alert('제목과 내용을 입력해주세요.');
            return;
        }

        const newPost = {
            title: title,
            author: author,
            content: content,
            timestamp: Date.now(),
            // ✅ 썸네일 이미지 데이터 추가
            thumbnail: firstImageThumbnail // 첫 번째 이미지의 Base64 URL을 썸네일로 사용
        };

        try {
            const response = await fetch(ADD_POST_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newPost)
            });

            if (response.ok) {
                alert('글이 성공적으로 등록되었습니다!');
                window.location.href = 'archive.html'; // 이전 답변에서 수정된 부분
            } else {
                const error = await response.json();
                alert(`글 등록 실패: ${error.message}`);
                console.error('글 등록 실패:', error);
            }
        } catch (error) {
            alert('네트워크 오류가 발생했습니다.');
            console.error('글 등록 오류:', error);
        }
    });

    toolbarButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const command = e.currentTarget.dataset.command;
            if (command === 'createLink') {
                const url = prompt('링크 주소를 입력하세요:', 'http://');
                if (url) {
                    document.execCommand(command, false, url);
                }
            } else {
                document.execCommand(command, false, null);
            }
        });
    });

    insertImageBtn.addEventListener('click', () => {
        imageInput.click();
    });

    imageInput.addEventListener('change', (event) => {
        const file = event.target.files && event.target.files.length > 0 ? event.target.files[0] : null;
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = `<img src="${reader.result}" style="max-width: 100%;">`;
                document.execCommand('insertHTML', false, img);

                // ✅ 첫 번째 이미지가 삽입될 때 썸네일 변수에 저장
                if (!firstImageThumbnail) { // 이미 썸네일이 설정되지 않은 경우에만 설정
                    firstImageThumbnail = reader.result;
                }
            };
            reader.readAsDataURL(file);
            imageInput.value = '';
        }
    });

    // ✅ 기존 글 수정 시 썸네일 로직 (선택 사항, 현재는 새 글 작성에만 초점)
    // 만약 기존 글을 수정하는 경우라면, postContentEditable.innerHTML에서
    // 첫 번째 img 태그의 src를 파싱하여 firstImageThumbnail에 할당하는 로직이 필요할 수 있습니다.
    // 현재는 새 글 작성 시에만 썸네일을 설정하는 것으로 가정합니다.
});
