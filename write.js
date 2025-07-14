// write.js
document.addEventListener('DOMContentLoaded', () => {
    // ✅ URL 파라미터에서 postId 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('id');
    const isEditMode = !!editId;

    const postTitleInput = document.getElementById('post-title');
    const postTagInput = document.getElementById('post-tag');
    const postThumbnailInput = document.getElementById('post-thumbnail');
    const postContentTextarea = document.getElementById('post-content');
    const publishBtn = document.getElementById('publish-btn');
    const pageTitle = document.getElementById('page-title');
    const authorNameInput = document.getElementById('author-name');
    const thumbnailPreview = document.getElementById('thumbnail-preview');

    // ✅ 이미지 업로드 및 미리보기 기능
    postThumbnailInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                thumbnailPreview.src = event.target.result;
                thumbnailPreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            thumbnailPreview.style.display = 'none';
        }
    });

    // ✅ 수정 모드인 경우 기존 글 데이터 불러오기
    if (isEditMode) {
        pageTitle.textContent = '글 수정하기';
        publishBtn.textContent = '글 수정';
        fetch(`/.netlify/functions/get-post-by-id?id=${editId}`)
            .then(response => response.json())
            .then(post => {
                if (post) {
                    postTitleInput.value = post.title;
                    authorNameInput.value = post.author;
                    postTagInput.value = post.tag || '';
                    postContentTextarea.value = post.content;
                    if (post.thumbnail) {
                        thumbnailPreview.src = post.thumbnail;
                        thumbnailPreview.style.display = 'block';
                    }
                } else {
                    alert('글을 찾을 수 없습니다.');
                    window.location.href = 'archive.html';
                }
            })
            .catch(error => {
                console.error('Error fetching post:', error);
                alert('글을 불러오는 중 오류가 발생했습니다.');
                window.location.href = 'archive.html';
            });
    }

    publishBtn.addEventListener('click', async () => {
        const title = postTitleInput.value.trim();
        const author = authorNameInput.value.trim();
        const tag = postTagInput.value.trim();
        const content = postContentTextarea.value.trim();
        const thumbnailFile = postThumbnailInput.files[0];
        let thumbnailUrl = thumbnailPreview.src.startsWith('data:') ? thumbnailPreview.src : '';

        if (!title || !author || !content) {
            alert('제목, 작성자, 내용은 필수 입력 항목입니다.');
            return;
        }

        if (thumbnailFile) {
            const formData = new FormData();
            formData.append('file', thumbnailFile);
            formData.append('upload_preset', 'your_cloudinary_upload_preset'); // 여기에 Cloudinary 업로드 프리셋을 넣으세요

            try {
                const cloudinaryResponse = await fetch('https://api.cloudinary.com/v1_1/your_cloudinary_cloud_name/image/upload', { // 여기에 Cloudinary 클라우드 이름을 넣으세요
                    method: 'POST',
                    body: formData
                });
                const cloudinaryData = await cloudinaryResponse.json();
                thumbnailUrl = cloudinaryData.secure_url;
            } catch (error) {
                console.error('Error uploading thumbnail:', error);
                alert('썸네일 업로드 중 오류가 발생했습니다.');
                return;
            }
        }

        const postData = {
            title,
            author,
            content,
            tag,
            thumbnail: thumbnailUrl
        };

        const endpoint = isEditMode ? '/.netlify/functions/update-post' : '/.netlify/functions/add-post';
        const bodyData = isEditMode ? { id: parseInt(editId), ...postData } : postData;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            });

            const message = isEditMode ? '글이 성공적으로 수정되었습니다!' : '글이 성공적으로 발행되었습니다!';
            
            if (response.ok) {
                alert(message);
                // ✅ 수정: 글 발행 후 archive.html의 'recent' 탭으로 이동하도록 변경
                window.location.href = `archive.html?tab=recent`; 
            } else {
                const error = await response.json();
                alert(`작업 실패: ${error.message}`);
                console.error('Error:', error);
            }
        } catch (error) {
            alert(`작업 실패: ${error.message}`);
            console.error('Error:', error);
        }
    });
});
