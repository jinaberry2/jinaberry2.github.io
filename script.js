document.addEventListener('DOMContentLoaded', async () => {
    // 🌟 [보안 및 구조 개선] 프론트엔드에서 직접 Supabase를 호출하지 않고 Netlify Function을 거치므로
    // 브라우저 키 노출(SUPABASE_URL, KEY)을 전부 제거하고 안전하게 통신합니다.

    let currentTab = 'purchased';
    let searchTerm = '';
    let allPosts = [];
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
            document.addEventListener('click', (e) => {
                if (e.target.id === 'custom-confirm-cancel-btn') {
                    document.body.removeChild(confirmBox);
                    resolve(false);
                }
            });
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
        if (selectedPostIds.length === 0) {
            await showCustomAlert("선택된 글이 없습니다.");
            return;
        }

        let confirmMsg = `${selectedPostIds.length}개의 글을 휴지통으로 이동하시겠습니까?`;
        let targetFunction = '/.netlify/functions/update-post-status';
        let requestBody = { ids: selectedPostIds, status: 'deleted' };

        if (currentTab === 'deleted') {
            confirmMsg = `${selectedPostIds.length}개의 글을 완전히 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`;
            targetFunction = '/.netlify/functions/delete-post';
            requestBody = { ids: selectedPostIds };
        }

        const confirmDelete = await showCustomConfirm(confirmMsg);
        if (!confirmDelete) return;

        let deletedCount = 0;
        
        try {
            const response = await fetch(targetFunction, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();

            if (response.ok && (result.success || result.count !== undefined)) {
                deletedCount = result.count !== undefined ? result.count : selectedPostIds.length;
            } else {
                throw new Error(result.message || "서버 요청 처리 실패");
            }
            
        } catch (error) {
            console.error("일괄 삭제 처리 중 오류:", error);
            await showCustomAlert(`삭제 처리 중 오류 발생: ${error.message}`);
            return;
        }

        if (currentTab === 'deleted') {
            await showCustomAlert(`${deletedCount}개의 글이 영구 삭제되었습니다.`);
        } else {
            await showCustomAlert(`${deletedCount}개의 글이 휴지통으로 이동되었습니다.`);
        }
        
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
            postsToRender = allPosts.filter(post => post.viewedTimestamp && post.viewedTimestamp > 0);
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
                const isChecked = selectedPostIds.some(id => String(id) === String(post.id));
                if (isChecked) {
                    checkbox.checked = true;
                }
                
                checkbox.addEventListener('change', (e) => {
                    const rawId = e.target.dataset.id;
                    const postId = isNaN(rawId) ? rawId : parseInt(rawId, 10);
                    
                    if (e.target.checked) {
                        if (!selectedPostIds.some(id => String(id) === String(postId))) {
                            selectedPostIds.push(postId);
                        }
                    } else {
                        selectedPostIds = selectedPostIds.filter(id => String(id) !== String(postId));
                    }
                    updateBulkDeleteBtn();
                });
            }

            postListContainer.appendChild(linkElement);
        });

        renderPagination();
    }

    // 🌟 [수정 완료된 시리즈 렌더러 함수] 옛날 글이 1화로 오도록 오름차순 정렬 & 화살표 제거 완료!
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
            
            // 🌟 [회차 순서 정상화] 옛날 글(timestamp가 작은 것)이 1화로 오도록 오름차순 정렬
            postsInSeries.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            
            const seriesWrapper = document.createElement('div');
            seriesWrapper.className = 'series-wrapper';
            seriesWrapper.style.cssText = "margin-bottom: 20px; border-bottom: 1px solid #f0f0f0; padding-bottom: 15px;";

            const seriesHeader = document.createElement('div');
            seriesHeader.className = 'post-item series-header-item';
            seriesHeader.style.cssText = "cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: background 0.2s;";
            
            const representativeThumbnail = postsInSeries[0]?.thumbnail;
            const thumbnailHTML = representativeThumbnail 
                ? `<img src="${representativeThumbnail}" alt="시리즈 썸네일" class="thumbnail" style="filter: brightness(0.95);">` 
                : `<div class="thumbnail" style="background: #f7f7f7; display:flex; align-items:center; justify-content:center; border-radius:6px; font-size:1.5rem;">📁</div>`;

           seriesHeader.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px; flex: 1;">
                    <div class="thumbnail-container" style="position: relative;">
                        ${thumbnailHTML}
                        <span style="position: absolute; bottom: 4px; right: 4px; background: rgba(0,0,0,0.7); color: white; font-size: 0.75rem; font-weight: bold; padding: 2px 6px; border-radius: 4px;">
                            ${postsInSeries.length}화
                        </span>
                    </div>
                    <div class="post-info" style="display: flex; flex-direction: column; justify-content: center;">
                        <h3 style="margin: 0 0 4px 0; font-size: 1.15rem; font-weight: 600;">${name}</h3>
                        <p style="margin: 0; color: #333; font-weight: 500; font-size: 0.95rem;">
                            By. ${postsInSeries[0]?.author || '작가'}
                        </p>
                    </div>
                </div>
                <div class="toggle-icon" style="font-size: 1.2rem; color: #999; padding-right: 10px; transition: transform 0.3s;">▼</div>
            `;

            const postListInner = document.createElement('div');
            postListInner.style.cssText = "display: none; padding: 10px 10px 5px 30px; margin-top: 5px; border-left: 2px dashed #ddd; flex-direction: column; gap: 8px;";

            postsInSeries.forEach((post, index) => {
                const postLink = document.createElement('a');
                postLink.href = `post.html?id=${post.id}&tab=${currentTab}`;
                postLink.className = 'post-item-link';
                postLink.style.cssText = "display: block; text-decoration: none; padding: 8px 0; transition: color 0.2s;";
                
                // 🌟 [화살표 영역 완벽 제거] 깔끔하게 제목과 화수 정보만 남김
                postLink.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.95rem; color: #444;">
                        <span style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 95%;">
                            <span style="color: #888; margin-right: 8px; font-size: 0.85rem;">[${index + 1}화]</span>${post.title}
                        </span>
                    </div>
                `;
                postListInner.appendChild(postLink);
            });

            const toggleIcon = seriesHeader.querySelector('.toggle-icon');
            seriesHeader.addEventListener('click', () => {
                const isHidden = postListInner.style.display === 'none';
                if (isHidden) {
                    postListInner.style.display = 'flex';
                    if (toggleIcon) toggleIcon.style.transform = 'rotate(180deg)';
                    seriesHeader.style.background = '#fcfcfc';
                } else {
                    postListInner.style.display = 'none';
                    if (toggleIcon) toggleIcon.style.transform = 'rotate(0deg)';
                    seriesHeader.style.background = 'transparent';
                }
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

    async function fetchPostsAndRender() {
        isLoadingPosts = true;
        renderPosts();

        try {
            const response = await fetch('/.netlify/functions/get-posts');
            if (!response.ok) throw new Error("서버에서 포스트 목록을 가져오지 못했습니다.");
            
            const supabasePosts = await response.json();

            let oldPosts = [];
            try {
                const oldResponse = await fetch('posts.json?t=' + Date.now());
                if (oldResponse.ok) {
                    oldPosts = await oldResponse.json();
                }
            } catch (e) {
                console.warn("기존 posts.json을 로드할 수 없습니다.");
            }

            allPosts = [...(supabasePosts || []), ...oldPosts];

        } catch (error) {
            console.error("데이터 조회 중 치명적 오류 발생:", error);
            allPosts = [];
        } finally {
            isLoadingPosts = false;
            renderPosts();
        }
    }

    async function fetchRecentViews() {
        await fetchPostsAndRender();
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
