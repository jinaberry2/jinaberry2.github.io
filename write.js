document.addEventListener('DOMContentLoaded', async () => {
    const publishBtn = document.getElementById('publish-btn');
    const postTitleInput = document.getElementById('post-title');
    const postAuthorInput = document.getElementById('post-author');
    const postContentEditable = document.getElementById('post-content');
    const imageInput = document.getElementById('imageInput');
    const insertImageBtn = document.getElementById('insertImageBtn');
    const toolbarButtons = document.querySelectorAll('.editor-toolbar button');
    const wordCountSpan = document.getElementById('word-count');

    const params = new URLSearchParams(window.location.search);
    const editId = params.get('editId');
    let isEditMode = !!editId;
    let originalPost = null;

    const ADD_POST_URL = "/.netlify/functions/add-post";
    const UPDATE_POST_URL = "/.netlify/functions/update-post";
    
    let firstImageThumbnail = null;

    // 글자수 카운트 및 업데이트 함수
    const updateWordCount = () => {
        const text = postContentEditable.innerText.trim();
        const count = text.length;
        if (wordCountSpan) {
            wordCountSpan.textContent = `${count}자`;
        }
    };

    // 'post-content' 영역에 내용이 입력될 때마다 글자수 업데이트
    if (postContentEditable) {
        postContentEditable.addEventListener('input', updateWordCount);
        updateWordCount();
    }

    // 수정 모드 초기화
    if (isEditMode) {
        publishBtn.textContent = '수정 완료';
        try {
            // 새로운 함수를 사용하여 특정 글만 불러오기
            const response = await fetch(`/.netlify/functions/get-post-by-id?id=${editId}`);
            if (!response.ok) throw new Error('Failed to fetch post.');
            originalPost = await response.json();

            if (originalPost) {
                postTitleInput.value = originalPost.title;
                postAuthorInput.value = originalPost.author;
                postContentEditable.innerHTML = originalPost.content;
                updateWordCount();
                // 기존 글의 썸네일 설정 (첫 번째 이미지의 src를 파싱)
                const firstImg = postContentEditable.querySelector('img');
                if (firstImg) {
                    firstImageThumbnail = firstImg.src;
                }
            } else {
                alert('수정할 글을 찾을 수 없습니다.');
                isEditMode = false;
                publishBtn.textContent = '발행';
            }
        } catch (error) {
            alert('글을 불러오는 중 오류가 발생했습니다.');
            console.error('Fetch error:', error);
            isEditMode = false;
            publishBtn.textContent = '발행';
        }
    }

    publishBtn.addEventListener('click', async () => {
        const title = postTitleInput.value.trim();
        const author = postAuthorInput.value.trim();
        const content = postContentEditable.innerHTML;

        if (!title || !content) {
            alert('제목과 내용을 입력해주세요.');
            return;
        }

        const newPostData = {
            title: title,
            author: author,
            content: content,
            timestamp: Date.now(),
            thumbnail: firstImageThumbnail,
        };
        
        let url = ADD_POST_URL;
        let bodyData = newPostData;
        let message = '글이 성공적으로 등록되었습니다!';

        if (isEditMode) {
            url = UPDATE_POST_URL;
            bodyData = { ...originalPost, ...newPostData, id: originalPost.id };
            message = '글이 성공적으로 수정되었습니다!';
        }
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            });

            if (response.ok) {
                alert(message);
                window.location.href = `archive.html?tab=recent`;
            } else {
                const error = await response.json();
                alert(`작업 실패: ${error.message}`);
                console.error('Error:', error);
            }
        } catch (error) {
            alert('네트워크 오류가 발생했습니다.');
            console.error('Network error:', error);
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
                if (!firstImageThumbnail) {
                    firstImageThumbnail = reader.result;
                }
            };
            reader.readAsDataURL(file);
            imageInput.value = '';
        }
    });
});
