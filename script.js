// script.js
document.addEventListener('DOMContentLoaded', () => {
    let currentTab = 'purchased';
    let searchTerm = '';
    let allPosts = [];
    let recentViews = [];
    let currentSort = 'newest';
    let isSelectionMode = false;
    let selectedPostIds = [];
    let isLoadingPosts = true;

    const postListContainer = document.getElementById('post-list-container');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const searchInput = document.getElementById('search-input');
    const postCountElement = document.getElementById('post-count');
    const sortOptionsContainer = document.querySelector('.sort-options');
    const sortButton = document.getElementById('sort-btn');
    const sortText = document.getElementById('sort-text');
    const sortMenu = document.getElementById('sort-menu');
    const selectBtn = document.getElementById('select-btn');
    const addPostBtn = document.getElementById('add-post-btn');
    const bulkDeleteBar = document.getElementById('bulk-delete-bar');
    const bulkDeleteBtn = document.getElementById('bulk-delete-btn');

    // ✅ 비밀번호 모달 관련 요소들
    const passwordModalOverlay = document.getElementById('password-modal-overlay');
    const modalPasswordInput = document.getElementById('modal-password-input');
    const modalLoginBtn = document.getElementById('modal-login-btn');
    const modalErrorMessage = document.getElementById('modal-error-message');
    const closeModalBtn = document.getElementById('close-modal-btn');

    // ✅ 여기에 원하는 비밀번호를 설정하세요. 
    const CORRECT_PASSWORD = '0506';

    // Custom alert function (Tailwind CSS 클래스 제거 및 기본 스타일 적용)
    function showCustomAlert(message) {
        return new Promise(resolve => { // Promise 반환하도록 수정
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
                resolve(); // 확인 버튼 클릭 시 Promise 해결
            };
        });
    }

    // Custom confirmation function (Tailwind CSS 클래스 제거 및 기본 스타일 적용)
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

    function toggleSelectionMode() {
        isSelectionMode = !isSelectionMode;
        selectedPostIds = [];
        if (isSelectionMode) {
            selectBtn.textContent = '취소';
            addPostBtn.style.display = 'none';
            bulkDeleteBar.style.display = 'flex';
        } else {
            selectBtn.textContent = '선택';
            addPostBtn.style.display = 'flex';
            bulkDeleteBar.style.display = 'none';
        }
        updateBulkDeleteBtn();
        renderPosts();
    }

    function updateBulkDeleteBtn() {
        bulkDeleteBtn.textContent = `일괄 삭제 (${selectedPostIds.length})`;
        bulkDeleteBtn.disabled = selectedPostIds.length === 0;
    }

    async function permanentDeleteSelectedPosts() {
        const confirmDelete = await showCustomConfirm(
            `${selectedPostIds.length}개의 글을 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
        );

        if (!confirmDelete) return;

        let deletedCount = 0;
        for (const postId of selectedPostIds) {
            try {
                const response = await fetch('/.netlify/functions/delete-post', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ postId: postId })
                });

                if (response.ok) {
                    deletedCount++;
                } else {
                    console.error(`Post ${postId} 영구 삭제 실패:`, await response.json());
                }
            } catch (error) {
                console.error(`Post ${postId} 영구 삭제 실패:`, error);
            }
        }

        await showCustomAlert(`${deletedCount}개의 글이 영구 삭제되었습니다.`); // Promise를 기다리도록 수정
        toggleSelectionMode();
        fetchPostsAndRender(); // 데이터 새로고침
    }

    function renderPosts() {
        if (currentTab === 'deleted') {
            selectBtn.style.display = 'block';
        } else {
            selectBtn.style.display = 'none';
            if (isSelectionMode) {
                toggleSelectionMode();
            }
        }

        if (isLoadingPosts) {
            postListContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 0;">
                    <div style="border: 4px solid rgba(0, 0, 0, 0.1); border-top: 4px solid #333; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite;"></div>
                    <p style="margin-top: 15px; color: #888;">글 목록을 불러오는 중...</p>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
            postCountElement.textContent = ''; // 로딩 중일 때 텍스트 제거
            return;
        }

        const purchasedPosts = allPosts.filter(p => p.status !== 'deleted');
        const deletedPosts = allPosts.filter(p => p.status === 'deleted');

        let postsToRender = [];

        if (currentTab === 'purchased') {
            postsToRender = purchasedPosts;
        } else if (currentTab === 'liked') {
            postsToRender = purchasedPosts.filter(post => post.liked);
        } else if (currentTab === 'recent') {
            const combinedPosts = [...purchasedPosts, ...deletedPosts];
            postsToRender = recentViews.map(view => combinedPosts.find(p => p.id === view.id)).filter(Boolean);
        } else if (currentTab === 'deleted') {
            postsToRender = deletedPosts;
        }

        if (searchTerm) {
            postsToRender = postsToRender.filter(p =>
                (p.title && p.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (p.author && p.author.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        if (postCountElement) {
            postCountElement.textContent = `${postsToRender.length}개의 포스트`;
        }

        let sortKey = 'timestamp';
        if (currentTab === 'deleted') {
            sortKey = 'deletedTimestamp';
        }

        if (currentSort === 'newest') {
            postsToRender.sort((a, b) => b[sortKey] - a[sortKey]);
        } else if (currentSort === 'oldest') {
            postsToRender.sort((a, b) => a[sortKey] - b[sortKey]);
        }

        postListContainer.innerHTML = '';

        if (postsToRender.length === 0) {
            postListContainer.innerHTML = '<p style="text-align:center; color:#888; margin-top: 2rem;">표시할 글이 없습니다.</p>';
            return;
        }

        postsToRender.forEach(post => {
            const linkElement = document.createElement('a');
            linkElement.href = `post.html?id=${post.id}&tab=${currentTab}`;
            linkElement.className = 'post-item-link';
            const thumbnailHTML = post.thumbnail ? `<img src="${post.thumbnail}" alt="썸네일" class="thumbnail">` : '';
            const checkboxHTML = isSelectionMode ? `<div class="checkbox-container"><input type="checkbox" class="post-checkbox" data-id="${post.id}"></div>` : '';

            linkElement.innerHTML = `
                <div class="post-item">
                    ${checkboxHTML}
                    <div class="thumbnail-container">${thumbnailHTML}</div>
                    <div class="post-info">
                        <h3>${post.title}</h3>
                        <p>${post.author} · 영구 열람</p>
                        ${post.tag ? `<span class="tag">${post.tag}</span>` : ''}
                    </div>
                </div>`;

            const postItemDiv = linkElement.querySelector('.post-item');
            const checkbox = postItemDiv ? postItemDiv.querySelector('.post-checkbox') : null;

            if (isSelectionMode) {
                linkElement.href = '#';
                if (postItemDiv) {
                    postItemDiv.addEventListener('click', (e) => {
                        if (checkbox && e.target !== checkbox) {
                            checkbox.checked = !checkbox.checked;
                            checkbox.dispatchEvent(new Event('change'));
                        }
                    });
                }
            }

            if (checkbox) {
                if (selectedPostIds.includes(post.id)) {
                    checkbox.checked = true;
                }
                checkbox.addEventListener('change', (e) => {
                    const postId = parseInt(e.target.dataset.id);
                    if (e.target.checked) {
                        if (!selectedPostIds.includes(postId)) {
                            selectedPostIds.push(postId);
                        }
                    } else {
                        selectedPostIds = selectedPostIds.filter(id => id !== postId);
                    }
                    updateBulkDeleteBtn();
                });
            }

            postListContainer.appendChild(linkElement);
        });
    }

    async function fetchPostsAndRender() {
        isLoadingPosts = true;
        renderPosts();

        try {
            const response = await fetch('/.netlify/functions/get-posts');
            if (!response.ok) {
                throw new Error('Failed to fetch posts.');
            }
            allPosts = await response.json();
        } catch (error) {
            console.error("Error fetching posts:", error);
            allPosts = [];
        } finally {
            isLoadingPosts = false;
            renderPosts();
        }
    }
    
    async function fetchRecentViews() {
        try {
            const response = await fetch('/.netlify/functions/get-recent-views');
            if (!response.ok) {
                throw new Error('Failed to fetch recent views.');
            }
            recentViews = await response.json();
        } catch (error) {
            console.error("Error fetching recent views:", error);
            recentViews = [];
        }
    }

    // ✅ 비밀번호 모달 표시 함수
    function showPasswordModal() {
        passwordModalOverlay.classList.add('visible');
        modalPasswordInput.value = ''; // 입력 필드 초기화
        modalErrorMessage.style.visibility = 'hidden'; // 에러 메시지 숨김
        modalPasswordInput.focus(); // 입력 필드에 포커스
    }

    // ✅ 비밀번호 모달 숨김 함수
    function hidePasswordModal() {
        passwordModalOverlay.classList.remove('visible');
    }

    // ✅ 모달 내 비밀번호 확인 처리 함수
    function handleModalLogin() {
        const enteredPassword = modalPasswordInput.value;
        if (enteredPassword === CORRECT_PASSWORD) {
            hidePasswordModal();
            window.location.href = 'write.html'; // 비밀번호 일치 시 글쓰기 페이지로 이동
        } else {
            modalErrorMessage.style.visibility = 'visible'; // 에러 메시지 표시
        }
    }

    function setupEventListeners() {
      tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentTab = e.currentTarget.dataset.tab;
            currentSort = 'newest';
            sortText.textContent = '최신순';
            renderPosts();
        });
      });

      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchTerm = e.target.value;
            renderPosts();
        }, 300);
      });

      sortButton.addEventListener('click', (e) => {
        e.stopPropagation();
        sortOptionsContainer.classList.toggle('active');
      });

      sortMenu.addEventListener('click', (e) => {
        if (e.target.classList.contains('sort-option')) {
            const selectedSort = e.target.dataset.sort;
            if (currentSort !== selectedSort) {
                currentSort = selectedSort;
                sortText.textContent = e.target.textContent;
                renderPosts();
            }
            sortOptionsContainer.classList.remove('active');
        }
      });

      document.addEventListener('click', (e) => {
        if (!sortOptionsContainer.contains(e.target)) {
            sortOptionsContainer.classList.remove('active');
        }
      });

      selectBtn.addEventListener('click', toggleSelectionMode);
      bulkDeleteBtn.addEventListener('click', permanentDeleteSelectedPosts);

      // ✅ 글쓰기 버튼 클릭 시 비밀번호 모달 표시
      addPostBtn.addEventListener('click', (e) => {
          e.preventDefault(); // 기본 링크 이동 방지
          showPasswordModal();
      });

      // ✅ 모달 내 확인 버튼 클릭 이벤트
      modalLoginBtn.addEventListener('click', handleModalLogin);

      // ✅ 모달 내 비밀번호 입력 필드에서 Enter 키 입력 이벤트
      modalPasswordInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
              handleModalLogin();
          }
      });

      // ✅ 모달 닫기 버튼 클릭 이벤트
      closeModalBtn.addEventListener('click', hidePasswordModal);

      // ✅ 모달 오버레이 클릭 시 모달 닫기 (모달 컨테이너 외부 클릭 시)
      passwordModalOverlay.addEventListener('click', (e) => {
          if (e.target === passwordModalOverlay) {
              hidePasswordModal();
          }
      });
    }
    
    fetchPostsAndRender();
    fetchRecentViews();
    setupEventListeners();
});
