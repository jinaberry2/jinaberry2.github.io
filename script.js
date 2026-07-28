document.addEventListener('DOMContentLoaded', async () => {
    // 🌟 1. 수파베이스 연결 설정 (내 프로젝트 정보 입력)
    const SUPABASE_URL = "https://guqudddagxrgqwxhjkkm.supabase.co"; 
    const SUPABASE_KEY = "[eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cXVkZGRhZ3hyZ3F3eGhqa2ttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTYyMTgsImV4cCI6MjEwMDc3MjIxOH0.LiXvYKEKkhAONG7d6wfLj-MKOoww_9ITXqHKZQgItPA]";

    // 🌟 2. 수파베이스 클라이언트 객체 초기화
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    let currentTab = 'purchased';
    let searchTerm = '';
    let allPosts = [];
    let recentViews = [];
    let currentSort = 'newest';
    let isSelectionMode = false;
    let selectedPostIds = [];
    let isLoadingPosts = true;

    const POSTS_PER_PAGE = 10;
    let currentPage = 1;
    let totalPages = 1;
    const PAGES_PER_BLOCK = 5;

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
    const paginationContainer = document.getElementById('pagination-container');

    // UI 컨테이너 유지 (에러 방지용 공란 처리)
    const seriesAddBtnContainer = document.getElementById('series-add-btn-container');
    const seriesEditBtnContainer = document.getElementById('series-edit-btn-container');

    const passwordModalOverlay = document.getElementById('password-modal-overlay');
    const modalPasswordInput = document.getElementById('modal-password-input');
    const modalLoginBtn = document.getElementById('modal-login-btn');
    const modalErrorMessage = document.getElementById('modal-error-message');
    const closeModalBtn = document.getElementById('close-modal-btn');

    const CORRECT_PASSWORD = '0506';

    function showCustomAlert(message) {
        return new Promise(resolve => {
            const alertBox = document.createElement('div');
            alertBox.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background-color: rgba(0, 0, 0, 0.5); z-index: 5000;
                display: flex; align-items: center; justify-content: center;
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

    function showCustomConfirm(message) {
        return new Promise(resolve => {
            const confirmBox = document.createElement('div');
            confirmBox.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background-color: rgba(0, 0, 0, 0.5); z-index: 5000;
                display: flex; align-items: center; justify-content: center;
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

    // 🌟 3. 일괄 삭제 기능 Supabase 대응 리모델링 (Soft Delete 처리)
    async function permanentDeleteSelectedPosts() {
        const confirmDelete = await showCustomConfirm(
            `${selectedPostIds.length}개의 글을 휴지통으로 이동하시겠습니까?`
        );

        if (!confirmDelete) return;

        let deletedCount = 0;
        
        // Supabase에서는 한 번의 요청으로 여러 ID를 한 번에 업데이트할 수 있습니다.
        try {
            const { data, error } = await supabaseClient
                .from('posts')
                .update({ 
                    status: 'deleted',
                    deletedTimestamp: Date.now() // 삭제 정렬용 타임스탬프 기록
                })
                .in('id', selectedPostIds); // 선택된 모든 id 배열 매칭

            if (error) throw error;
            deletedCount = selectedPostIds.length;
            
        } catch (error) {
            console.error("Supabase 일괄 삭제 오류:", error);
        }

        await showCustomAlert(`${deletedCount}개의 글이 휴지통으로 이동되었습니다.`);
        toggleSelectionMode();
        await fetchPostsAndRender();
    }

    function renderPosts() {
        if (currentTab === 'deleted') {
            selectBtn.style.display = 'block';
            addPostBtn.style.display = 'none';
            if (seriesAddBtnContainer) seriesAddBtnContainer.style.display = 'none';
            if (seriesEditBtnContainer) seriesEditBtnContainer.style.display = 'none';
        } else if (currentTab === 'series') {
            selectBtn.style.display = 'none';
            addPostBtn.style.display = 'none';
            if (seriesAddBtnContainer) seriesAddBtnContainer.style.display = 'none';
            if (seriesEditBtnContainer) seriesEditBtnContainer.style.display = 'none';
            if (isSelectionMode) toggleSelectionMode();
            
            renderSeriesPosts();
            return;
        } else {
            selectBtn.style.display = 'none';
            addPostBtn.style.display = 'flex';
            if (seriesAddBtnContainer) seriesAddBtnContainer.style.display = 'none';
            if (seriesEditBtnContainer) seriesEditBtnContainer.style.display = 'none';
            if (isSelectionMode) toggleSelectionMode();
        }

        if (isLoadingPosts) {
            postListContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 0;">
                    <div style="border: 4px solid rgba(0, 0, 0, 0.1); border-top: 4px solid #333; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite;"></div>
                    <p style="margin-top: 15px; color: #888;">글 목록을 불러오는 중...</p>
                </div>
            `;
            postCountElement.textContent = '';
            return;
        }

        const purchasedPosts = allPosts.filter(p => !p.status || p.status !== 'deleted');
        const deletedPosts = allPosts.filter(p => p.status === 'deleted');

        let postsToRender = [];

        if (currentTab === 'purchased') {
            postsToRender = purchasedPosts;
        } else if (currentTab === 'liked') {
            postsToRender = purchasedPosts.filter(post => post.liked);
        } else if (currentTab === 'recent') {
            const recentPostIds = new Set(recentViews.map(view => view.id));
            postsToRender = allPosts
                .filter(post => recentPostIds.has(post.id))
                .map(post => {
                    const view = recentViews.find(v => v.id === post.id);
                    return { ...post, viewedTimestamp: view ? view.timestamp : 0 };
                })
                .sort((a, b) => b.viewedTimestamp - a.viewedTimestamp);
        } else if (currentTab === 'deleted') {
            postsToRender = deletedPosts;
        }

        if (searchTerm) {
            postsToRender = postsToRender.filter(p =>
                (p.title && p.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (p.author && p.author.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        let sortKey = 'timestamp';
        if (currentTab === 'deleted') {
            sortKey = 'deletedTimestamp';
        } else if (currentTab === 'liked') {
            sortKey = 'likedTimestamp';
        } else if (currentTab === 'recent') {
            sortKey = 'viewedTimestamp';
        }

        if (currentSort === 'newest') {
            postsToRender.sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0));
        } else if (currentSort === 'oldest') {
            postsToRender.sort((a, b) => (a[sortKey] || 0) - (b[sortKey] || 0));
        }

        totalPages = Math.ceil(postsToRender.length / POSTS_PER_PAGE);
        currentPage = Math.min(currentPage, totalPages);

        const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
        const endIndex = startIndex + POSTS_PER_PAGE;
        const pagedPosts = postsToRender.slice(startIndex, endIndex);

        postCountElement.textContent = `${postsToRender.length}개의 포스트`;
        postListContainer.innerHTML = '';

        if (pagedPosts.length === 0 && postsToRender.length > 0) {
            currentPage = 1;
            renderPosts();
            return;
        } else if (postsToRender.length === 0) {
            postListContainer.innerHTML = '<p style="text-align:center; color:#888; margin-top: 2rem;">표시할 글이 없습니다.</p>';
        }

        pagedPosts.forEach(post => {
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
                // Supabase ID 타입에 맞게 고정 (숫자형 또는 문자열형 유연성 보장)
                if (selectedPostIds.includes(post.id)) {
                    checkbox.checked = true;
                }
                checkbox.addEventListener('change', (e) => {
                    // Supabase 기본 id 형식(숫자)에 매칭
                    const postId = parseInt(e.target.dataset.id) || e.target.dataset.id;
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

        renderPagination();
    }

    function renderSeriesPosts() {
        postListContainer.innerHTML = '';
        
        const seriesMap = {};
        allPosts.forEach(post => {
            if (post.status !== 'deleted' && post.seriesName && post.seriesName.trim() !== "") {
                const sName = post.seriesName.trim();
                if (!seriesMap[sName]) {
                    seriesMap[sName] = [];
                }
                seriesMap[sName].push(post);
            }
        });

        const seriesNames = Object.keys(seriesMap);

        if (seriesNames.length === 0) {
            postListContainer.innerHTML = '<p style="text-align:center; color:#888; margin-top: 2rem;">생성된 시리즈가 없습니다.</p>';
            postCountElement.textContent = '0개의 시리즈';
            paginationContainer.innerHTML = '';
            return;
        }

        seriesNames.forEach(name => {
            const postsInSeries = seriesMap[name];
            
            const seriesWrapper = document.createElement('div');
            seriesWrapper.className = 'series-wrapper';
            seriesWrapper.style.cssText = "margin-bottom: 15px; border: 1px solid #ddd; border-radius: 8px; background: #fff; overflow: hidden;";

            const seriesHeader = document.createElement('div');
            seriesHeader.className = 'series-item';
            seriesHeader.style.cssText = "padding: 15px; cursor: pointer; background: #f9f9f9; border-bottom: 1px solid #eee; display:flex; flex-direction:column; justify-content:center;";
            seriesHeader.innerHTML = `
                <h4 style="margin: 0; font-size: 1.1rem; font-weight: bold;">${name}</h4>
                <p style="margin: 5px 0 0 0; color: #666; font-size: 0.9rem;">총 ${postsInSeries.length}개의 글</p>
            `;

            const postListInner = document.createElement('div');
            postListInner.style.cssText = "display: none; padding: 5px 15px; background: #fff;";

            postsInSeries.forEach(post => {
                const postLink = document.createElement('a');
                postLink.href = `post.html?id=${post.id}&tab=${currentTab}`;
                postLink.style.cssText = "display: block; padding: 10px 0; color: #333; text-decoration: none; border-bottom: 1px solid #f5f5f5; font-size: 0.95rem;";
                postLink.innerHTML = `📄 <span style="font-weight: 500;">${post.title}</span> <small style="color:#888; margin-left:5px;">by ${post.author}</small>`;
                postListInner.appendChild(postLink);
            });

            seriesHeader.addEventListener('click', () => {
                const isHidden = postListInner.style.display === 'none';
                postListInner.style.display = isHidden ? 'block' : 'none';
            });

            seriesWrapper.appendChild(seriesHeader);
            seriesWrapper.appendChild(postListInner);
            postListContainer.appendChild(seriesWrapper);
        });

        postCountElement.textContent = `${seriesNames.length}개의 시리즈`;
        paginationContainer.innerHTML = '';
    }

    function renderPagination() {
        paginationContainer.innerHTML = '';
        if (totalPages <= 1) return;

        const currentBlock = Math.floor((currentPage - 1) / PAGES_PER_BLOCK);
        const startPage = currentBlock * PAGES_PER_BLOCK + 1;
        const endPage = Math.min(startPage + PAGES_PER_BLOCK - 1, totalPages);

        const prevBlockBtn = document.createElement('button');
        prevBlockBtn.className = `page-btn page-arrow ${currentBlock === 0 ? 'disabled' : ''}`;
        prevBlockBtn.innerHTML = '&lt;';
        prevBlockBtn.addEventListener('click', () => {
            if (currentBlock > 0) {
                currentPage = startPage - PAGES_PER_BLOCK;
                renderPosts();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
        paginationContainer.appendChild(prevBlockBtn);

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => {
                currentPage = i;
                renderPosts();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            paginationContainer.appendChild(pageBtn);
        }

        const nextBlockBtn = document.createElement('button');
        nextBlockBtn.className = `page-btn page-arrow ${endPage >= totalPages ? 'disabled' : ''}`;
        nextBlockBtn.innerHTML = '&gt;';
        nextBlockBtn.addEventListener('click', () => {
            if (endPage < totalPages) {
                currentPage = endPage + 1;
                renderPosts();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
        paginationContainer.appendChild(nextBlockBtn);
    }

    // 🌟 4. [핵심 교체 파트] Supabase DB 실시간 조회 연동
    async function fetchPostsAndRender() {
        isLoadingPosts = true;
        renderPosts();

        try {
            // 1단계: Supabase 'posts' 테이블에서 전체 데이터 조회
            const { data: postsData, error } = await supabaseClient
                .from('posts')
                .select('*');

            if (error) throw error;
            allPosts = postsData || [];

            // 2단계: 최근 본 내역 조회 (기존 로컬 보관용 호환 유지)
            try {
                const viewsResponse = await fetch('recent-views.json?t=' + Date.now());
                if (viewsResponse.ok) {
                    recentViews = await viewsResponse.json();
                } else {
                    recentViews = [];
                }
            } catch (e) {
                recentViews = [];
            }

        } catch (error) {
            console.error("Supabase 데이터 조회 중 치명적 오류 발생:", error);
            allPosts = [];
            recentViews = [];
        } finally {
            isLoadingPosts = false;
            renderPosts();
        }
    }

    async function fetchRecentViews() {
        try {
            const response = await fetch('recent-views.json?t=' + Date.now());
            if (response.ok) {
                recentViews = await response.json();
            }
        } catch (e) {
            console.error("최근 본 내역 갱신 실패:", e);
        }
    }

    function showPasswordModal() {
        passwordModalOverlay.classList.add('visible');
        modalPasswordInput.value = '';
        modalErrorMessage.style.visibility = 'hidden';
        modalPasswordInput.focus();
    }

    function hidePasswordModal() {
        passwordModalOverlay.classList.remove('visible');
    }

    function handleModalLogin() {
        const enteredPassword = modalPasswordInput.value;
        if (enteredPassword === CORRECT_PASSWORD) {
            hidePasswordModal();
            window.location.href = `write.html?tab=${currentTab}`;
        } else {
            modalErrorMessage.style.visibility = 'visible';
        }
    }

    async function initializeTab() {
        const params = new URLSearchParams(window.location.search);
        const tabFromUrl = params.get('tab');
        const savedTab = localStorage.getItem('lastActiveTab');

        if (tabFromUrl) {
            currentTab = tabFromUrl;
        } else if (savedTab) {
            currentTab = savedTab;
        } else {
            currentTab = 'purchased';
        }

        tabButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === currentTab) {
                btn.classList.add('active');
            }
        });
    }

    function setupEventListeners() {
        tabButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                tabButtons.forEach(btn => btn.classList.remove('active'));
                e.currentTarget.classList.add('active');
                currentTab = e.currentTarget.dataset.tab;
                localStorage.setItem('lastActiveTab', currentTab);
                currentSort = 'newest';
                sortText.textContent = '최신순';
                currentPage = 1;
                if (currentTab === 'recent') {
                    await fetchRecentViews();
                }
                renderPosts();
            });
        });

        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchTerm = e.target.value;
                currentPage = 1;
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
                    currentPage = 1;
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

        addPostBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showPasswordModal();
        });

        modalLoginBtn.addEventListener('click', handleModalLogin);
        modalPasswordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleModalLogin();
            }
        });

        closeModalBtn.addEventListener('click', hidePasswordModal);
        passwordModalOverlay.addEventListener('click', (e) => {
            if (e.target === passwordModalOverlay) {
                hidePasswordModal();
            }
        });
    }

    await initializeTab();
    await fetchPostsAndRender();
    setupEventListeners();
});
