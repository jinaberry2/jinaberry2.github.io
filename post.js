document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('id');
    const sourceTab = params.get('tab') || 'purchased';

    let currentPost = null;
    let allPostsData = [];
    let recentViewsData = [];
    let isLoadingPostContent = true;

    const postBodyContainer = document.getElementById('post-body');

    // Custom alert function (Promise 반환하도록 유지)
    function showCustomAlert(message) {
        return new Promise(resolve => {
            const alertBox = document.createElement('div');
            alertBox.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                display: flex; align-items: center; justify-content: center;
                background-color: rgba(0, 0, 0, 0.5); z-index: 5000;
            `;
            alertBox.innerHTML = `
                <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; max-width: 300px; width: 90%;">
                    <p style="font-size: 1.1rem; font-weight: bold; margin-bottom: 15px;">${message}</p>
                    <button id="custom-alert-ok-btn" style="background-color: #007bff; color: white; font-weight: bold; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer;">확인</button>
                </div>
            `;
            document.body.appendChild(alertBox);

            document.getElementById('custom-alert-ok-btn').onclick = () => {
                document.body.removeChild(alertBox);
                resolve();
            };
        });
    }

    // Custom confirmation function
    function showCustomConfirm(message) {
        return new Promise(resolve => {
            const confirmBox = document.createElement('div');
            confirmBox.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                display: flex; align-items: center; justify-content: center;
                background-color: rgba(0, 0, 0, 0.5); z-index: 5000;
            `;
            confirmBox.innerHTML = `
                <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; max-width: 300px; width: 90%;">
                    <p style="font-size: 1.1rem; font-weight: bold; margin-bottom: 15px;">${message}</p>
                    <div style="display: flex; justify-content: space-around; gap: 10px;">
                        <button id="custom-confirm-cancel-btn" style="background-color: #6c757d; color: white; font-weight: bold; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer;">취소</button>
                        <button id="custom-confirm-ok-btn" style="background-color: #dc3545; color: white; font-weight: bold; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer;">삭제</button>
                    </div>
                </div>
            `;
            document.body.appendChild(confirmBox);

            document.getElementById('custom-confirm-ok-btn').onclick = () => {
                document.body.removeChild(confirmBox);
                resolve(true);
            };
            document.getElementById('custom-confirm-cancel-btn').onclick = () => {
                document.body.removeChild(confirmBox);
                resolve(false);
            };
        });
    }

    // 🌟 [통합 개편] 로컬 파일 조회 구조를 걷어내고 Netlify 서버 함수를 바라보도록 연동[cite: 1]
    const fetchPostDataFromServer = async () => {
        const response = await fetch('/.netlify/functions/get-posts');
        if (!response.ok) {
            throw new Error('Failed to fetch posts from server.');
        }
        const supabasePosts = await response.json();

        // 기존 posts.json 옛날 데이터 백업 병합 유지
        let oldPosts = [];
        try {
            const oldResponse = await fetch('posts.json?t=' + Date.now());
            if (oldResponse.ok) {
                oldPosts = await oldResponse.json();
            }
        } catch (e) {
            console.warn("기존 posts.json 데이터를 로드할 수 없습니다.");
        }

        return [...(supabasePosts || []), ...oldPosts];
    };

    const recordView = async (id) => {
        if (!id) return;
        try {
            const response = await fetch('/.netlify/functions/record-view', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId: id })
            });
            const result = await response.json();
            console.log("View recorded for post:", id, result.message);
        } catch (error) {
            console.error("Failed to record view:", error);
        }
    };

    function renderPost(post) {
        if (isLoadingPostContent) {
            postBodyContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 0;">
                    <div style="border: 4px solid rgba(0, 0, 0, 0.1); border-top: 4px solid #333; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite;"></div>
                    <p style="margin-top: 15px; color: #666;">글 내용을 불러오는 중...</p>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
            document.title = "로딩 중...";
            document.getElementById('header-title').textContent = "로딩 중...";
            document.getElementById('post-title').textContent = "로딩 중...";
            document.getElementById('author-name').textContent = "";
            document.getElementById('post-date').textContent = "";
            document.getElementById('post-views').textContent = "";
            return;
        }

        if (!post) {
            postBodyContainer.innerHTML = '<h1>글을 찾을 수 없습니다.</h1><a href="archive.html">목록으로 돌아가기</a>';
            document.title = '글을 찾을 수 없음';
            document.getElementById('header-title').textContent = '글을 찾을 수 없음';
            document.getElementById('post-title').textContent = '글을 찾을 수 없음';
            return;
        }

        document.title = post.title;
        document.getElementById('header-title').textContent = post.title;
        document.getElementById('post-title').textContent = post.title;

        document.getElementById('author-name').textContent = post.author;

        const postDate = new Date(post.timestamp);
        const formattedDate = `${postDate.getFullYear()}. ${postDate.getMonth() + 1}. ${postDate.getDate()}.`;
        document.getElementById('post-date').textContent = formattedDate;

        document.getElementById('post-views').textContent = post.views || 0;

        postBodyContainer.innerHTML = post.content;

        const isDeletedPost = post.status === 'deleted';
        setupButtons(post, isDeletedPost);
        setupSidePanel(post, sourceTab);
    }

    // 🌟 [서버 연동 교체] update-like 서버 백엔드 명세에 맞춰 JSON 페이로드 정렬 및 토글 처리
    async function toggleLikeStatus(post) {
        const likeBtn = document.getElementById('like-btn');
        const likeIcon = likeBtn.querySelector('.icon');
        const originalLikedStatus = post.liked;

        // UI 상태 먼저 반영
        post.liked = !originalLikedStatus;
        likeBtn.classList.toggle('active', post.liked);
        likeIcon.textContent = '♡';

        try {
            // 주소 및 인자명 매핑 정렬
            const response = await fetch('/.netlify/functions/update-like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    id: post.id, 
                    liked: post.liked,
                    likedTimestamp: post.liked ? Date.now() : null
                })
            });
            if (!response.ok) {
                throw new Error('Failed to update like status.');
            }
            console.log("Like status updated successfully.");
        } catch (error) {
            // 실패 시 롤백 처리
            post.liked = originalLikedStatus;
            likeBtn.classList.toggle('active', post.liked);
            likeIcon.textContent = '♡';
            showCustomAlert('좋아요 상태 변경 실패: 네트워크 오류 또는 서버 오류가 발생했습니다.');
            console.error('좋아요 토글 오류:', error);
        }
    }

    function setupButtons(post, isDeletedPost) {
        const likeBtn = document.getElementById('like-btn');
        const likeIcon = likeBtn.querySelector('.icon');
        const prevBtn = document.getElementById('prev-post-btn');
        const nextBtn = document.getElementById('next-post-btn');
        const optionsBtn = document.getElementById('options-btn');
        const optionsMenu = document.getElementById('options-menu');
        const deletePostBtn = document.getElementById('delete-post-btn');
        const permanentDeleteBtn = document.getElementById('permanent-delete-btn');
        const editPostBtn = document.getElementById('edit-post-btn');

        editPostBtn.addEventListener('click', () => {
            window.location.href = `write.html?editId=${post.id}`;
        });

        likeBtn.classList.toggle('active', post.liked);
        likeIcon.textContent = '♡';
        likeBtn.onclick = () => toggleLikeStatus(post);

        optionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            optionsMenu.classList.toggle('visible');
        });

        document.addEventListener('click', (e) => {
            if (optionsMenu.classList.contains('visible') && !optionsMenu.contains(e.target) && e.target !== optionsBtn) {
                optionsMenu.classList.remove('visible');
            }
        });

        if (isDeletedPost) {
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            deletePostBtn.style.display = 'none';
            permanentDeleteBtn.style.display = 'block';
        } else {
            permanentDeleteBtn.style.display = 'none';
            deletePostBtn.style.display = 'block';
        }

        deletePostBtn.addEventListener('click', () => {
            markPostAsDeleted(post.id);
        });

        permanentDeleteBtn.addEventListener('click', () => {
            permanentDeletePost(post.id);
        });

        if (!isDeletedPost) {
            const activePosts = allPostsData.filter(p => p.status === 'active' || !p.status)
                .sort((a, b) => a.timestamp - b.timestamp);

            const currentPostIndex = activePosts.findIndex(p => p.id == post.id);

            prevBtn.disabled = currentPostIndex <= 0;
            if (!prevBtn.disabled) {
                prevBtn.onclick = () => window.location.href = `post.html?id=${activePosts[currentPostIndex - 1].id}&tab=${sourceTab}`;
            }

            nextBtn.disabled = currentPostIndex >= activePosts.length - 1;
            if (!nextBtn.disabled) {
                nextBtn.onclick = () => window.location.href = `post.html?id=${activePosts[currentPostIndex + 1].id}&tab=${sourceTab}`;
            }
        } else {
            prevBtn.disabled = true;
            nextBtn.disabled = true;
        }
    }

    async function markPostAsDeleted(postIdToMarkDeleted) {
        const confirmResult = await showCustomConfirm('정말로 이 포스트를 삭제 목록으로 이동하시겠습니까?');
        if (!confirmResult) return;

        try {
            const response = await fetch('/.netlify/functions/update-post-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [postIdToMarkDeleted], status: 'deleted' })
            });

            if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.message || 'Failed to mark post as deleted.');
            }

            await showCustomAlert('글이 삭제 목록으로 이동되었습니다.');
            window.location.href = 'archive.html?tab=deleted';
        } catch (error) {
            showCustomAlert(`글을 삭제 목록으로 이동하는 데 실패했습니다: ${error.message}`);
            console.error('글 삭제 실패:', error);
        }
    }

    async function permanentDeletePost(postIdToPermanentlyDelete) {
        const confirmResult = await showCustomConfirm('이 글을 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.');
        if (!confirmResult) return;

        try {
            const response = await fetch('/.netlify/functions/delete-post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId: postIdToPermanentlyDelete })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to permanently delete post.');
            }

            await showCustomAlert('글이 영구 삭제되었습니다.');
            window.location.href = 'archive.html?tab=deleted';
        } catch (error) {
            showCustomAlert(`글을 영구 삭제하는 데 실패했습니다: ${error.message}`);
            console.error('글 영구 삭제 오류:', error);
        }
    }

    function setupSidePanel(currentPost, sourceTab) {
        const listBtn = document.getElementById('list-btn');
        const sidePanel = document.getElementById('side-panel');
        const panelOverlay = document.getElementById('side-panel-overlay');
        const closePanelBtn = document.getElementById('close-panel-btn');
        const panelPostList = document.getElementById('panel-post-list');

        async function openSidePanel() {
            let panelPosts = [];
            let postsToFilter = allPostsData.filter(p => p.status === 'active' || !p.status);

            if (sourceTab === 'liked') {
                panelPosts = postsToFilter.filter(p => p.liked);
                panelPosts.sort((a, b) => b.likedTimestamp - a.likedTimestamp);
            } else if (sourceTab === 'recent') {
                panelPosts = recentViewsData.map(view => allPostsData.find(p => p.id == view.id)).filter(Boolean);
            } else if (sourceTab === 'deleted') {
                panelPosts = allPostsData.filter(p => p.status === 'deleted');
                panelPosts.sort((a, b) => b.deletedTimestamp - a.deletedTimestamp);
            } else {
                panelPosts = postsToFilter;
                panelPosts.sort((a, b) => b.timestamp - a.timestamp);
            }

            panelPostList.innerHTML = '';
            if (panelPosts.length === 0) {
                panelPostList.innerHTML = '<p style="text-align:center; color:#888; margin-top: 1rem;">목록이 비어 있습니다.</p>';
            } else {
                panelPosts.forEach((p, index) => {
                    const itemLink = document.createElement('a');
                    itemLink.href = `post.html?id=${p.id}&tab=${sourceTab}`;
                    itemLink.className = 'panel-post-item';
                    if (p.id == currentPost.id) itemLink.classList.add('active');
                    itemLink.innerHTML = `<span class="panel-post-number">${index + 1}</span><span class="panel-post-title">${p.title}</span>`;
                    panelPostList.appendChild(itemLink);
                });
            }
            sidePanel.classList.add('visible');
            panelOverlay.classList.add('visible');
        }

        listBtn.addEventListener('click', openSidePanel);
        closePanelBtn.addEventListener('click', () => { sidePanel.classList.remove('visible'); panelOverlay.classList.remove('visible'); });
        panelOverlay.addEventListener('click', () => { sidePanel.classList.remove('visible'); panelOverlay.classList.remove('visible'); });
    }

    async function initializePostPage() {
        isLoadingPostContent = true;
        renderPost(null);

        try {
            // 통합된 함수를 통하여 전체 게시물 통합 데이터를 수신[cite: 1]
            allPostsData = await fetchPostDataFromServer();

            // 최근 본 목록 내역 파싱 백업 유지
            try {
                const viewsResponse = await fetch('recent-views.json');
                if (viewsResponse.ok) {
                    recentViewsData = await viewsResponse.json();
                }
            } catch (e) {
                recentViewsData = [];
            }

            currentPost = allPostsData.find(p => p.id == postId);
        } catch (error) {
            console.error("Initialization Error:", error);
            currentPost = null;
        } finally {
            isLoadingPostContent = false;
            renderPost(currentPost);
            if (currentPost) {
                await recordView(currentPost.id);
            }
        }
    }

    initializePostPage();

    let lastScrollY = window.scrollY;
    const floatingHeader = document.getElementById('floating-header');
    const postFooter = document.querySelector('.post-footer');

    window.addEventListener('scroll', () => {
        if (window.scrollY > lastScrollY && window.scrollY > 100) {
            floatingHeader.classList.add('hide-header');
            postFooter.classList.add('hide-footer');
        } else {
            floatingHeader.classList.remove('hide-header');
            postFooter.classList.remove('hide-footer');
        }
        lastScrollY = window.scrollY;
    });
});
