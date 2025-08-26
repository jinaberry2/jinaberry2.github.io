document.addEventListener('DOMContentLoaded', async () => {
    let currentTab = 'purchased';
    let searchTerm = '';
    let allPosts = [];
    let allSeries = []; // 시리즈 데이터를 저장할 배열
    let currentSeries = null; // 현재 보고 있는 시리즈
    let recentViews = [];
    let currentSort = 'newest';
    let isSelectionMode = false;
    let selectedPostIds = [];
    let isLoadingPosts = true;

    // ✅ Pagination variables
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
    // 시리즈 관련 버튼 및 모달
    const addSeriesBtn = document.getElementById('add-series-btn');
    const editSeriesBtn = document.getElementById('edit-series-btn');
    const createSeriesModal = document.getElementById('create-series-modal');
    const newSeriesNameInput = document.getElementById('new-series-name-input');
    const cancelCreateSeriesBtn = document.getElementById('cancel-create-series-btn');
    const confirmCreateSeriesBtn = document.getElementById('confirm-create-series-btn');
    const addToSeriesModal = document.getElementById('add-to-series-modal');
    const postSelectionList = document.getElementById('post-selection-list');
    const cancelAddToSeriesBtn = document.getElementById('cancel-add-to-series-btn');
    const confirmAddToSeriesBtn = document.getElementById('confirm-add-to-series-btn');
    const addSeriesBtnContainer = document.getElementById('series-add-btn-container');
    const editSeriesBtnContainer = document.getElementById('series-edit-btn-container');


    const paginationContainer = document.getElementById('pagination-container');
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

        await showCustomAlert(`${deletedCount}개의 글이 영구 삭제되었습니다.`);
        toggleSelectionMode();
        await fetchPostsAndRender();
    }
    
    // 이 함수는 시리즈와 포스트 목록을 렌더링하는 핵심 함수입니다.
    function renderPosts() {
        // 기존 탭 관련 버튼 가시성 설정
        const isSeriesTab = currentTab === 'series';
        selectBtn.style.display = isSeriesTab ? 'none' : (currentTab === 'deleted' ? 'block' : 'none');
        addPostBtn.style.display = isSeriesTab ? 'none' : 'block';
        addSeriesBtnContainer.style.display = isSeriesTab && !currentSeries ? 'block' : 'none';
        editSeriesBtnContainer.style.display = isSeriesTab && currentSeries ? 'block' : 'none';

        if (isSelectionMode) {
            toggleSelectionMode();
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
            postCountElement.textContent = '';
            return;
        }

        if (isSeriesTab) {
            if (currentSeries) {
                renderSeriesPosts(currentSeries);
                return;
            }

            let seriesToRender = allSeries;
            if (searchTerm) {
                seriesToRender = seriesToRender.filter(series =>
                    series.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    series.postIds.some(postId => {
                        const post = allPosts.find(p => p.id === postId);
                        return post && post.title.toLowerCase().includes(searchTerm.toLowerCase());
                    })
                );
            }

            if (currentSort === 'newest') {
                seriesToRender.sort((a, b) => b.firstPostTimestamp - a.firstPostTimestamp);
            } else if (currentSort === 'oldest') {
                seriesToRender.sort((a, b) => a.firstPostTimestamp - b.firstPostTimestamp);
            }

            postCountElement.textContent = `${seriesToRender.length}개의 시리즈`;
            postListContainer.innerHTML = '';
            if (seriesToRender.length === 0) {
                postListContainer.innerHTML = '<p style="text-align:center; color:#888; margin-top: 2rem;">표시할 시리즈가 없습니다.</p>';
            }

            seriesToRender.forEach(series => {
                const firstPost = allPosts.find(p => p.id === series.postIds[0]);
                const seriesItem = document.createElement('a');
                seriesItem.className = 'post-item-link';
                seriesItem.href = '#';
                seriesItem.innerHTML = `
                    <div class="post-item series-item">
                        <div class="thumbnail-container">
                            ${firstPost && firstPost.thumbnail ? `<img src="${firstPost.thumbnail}" alt="썸네일" class="thumbnail">` : ''}
                        </div>
                        <div class="post-info">
                            <h3>${series.name}</h3>
                            <p>${series.postIds.length}개의 글</p>
                        </div>
                    </div>
                `;
                seriesItem.addEventListener('click', (e) => {
                    e.preventDefault();
                    currentSeries = series;
                    renderPosts();
                });
                postListContainer.appendChild(seriesItem);
            });
            paginationContainer.innerHTML = ''; // 시리즈 탭에서는 페이지네이션 숨김
            return;
        }

        // 기존 포스트 렌더링 로직
        const purchasedPosts = allPosts.filter(p => p.status !== 'deleted');
        const deletedPosts = allPosts.filter(p => p.status === 'deleted');

        let postsToRender = [];
        // ... (기존 탭별 로직)
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
            postsToRender.sort((a, b) => b[sortKey] - a[sortKey]);
        } else if (currentSort === 'oldest') {
            postsToRender.sort((a, b) => a[sortKey] - b[sortKey]);
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
            const linkElement = createPostElement(post, isSelectionMode);
            postListContainer.appendChild(linkElement);
        });

        renderPagination();
    }

    // 시리즈 내의 포스트 목록을 렌더링하는 함수
    function renderSeriesPosts(series) {
        const seriesPosts = allPosts.filter(post => series.postIds.includes(post.id));
        seriesPosts.sort((a, b) => b.timestamp - a.timestamp); // 최신순 정렬

        postListContainer.innerHTML = `
            <div class="series-header">
                <h2>${series.name}</h2>
                <button id="back-to-series-list-btn" class="back-btn">← 시리즈 목록으로</button>
            </div>
        `;
        const backBtn = document.getElementById('back-to-series-list-btn');
        backBtn.addEventListener('click', () => {
            currentSeries = null;
            renderPosts();
        });

        seriesPosts.forEach(post => {
            const linkElement = createPostElement(post, false);
            postListContainer.appendChild(linkElement);
        });

        postCountElement.textContent = `${seriesPosts.length}개의 글`;
        paginationContainer.innerHTML = '';
    }

    // 포스트 아이템을 생성하는 함수
    function createPostElement(post, isSelectionMode) {
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
        return linkElement;
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
    
    // 포스트와 시리즈 데이터를 함께 불러오는 함수
    async function fetchAllData() {
        isLoadingPosts = true;
        renderPosts();

        try {
            const postsResponse = await fetch('/.netlify/functions/get-posts');
            if (!postsResponse.ok) throw new Error('Failed to fetch posts.');
            allPosts = await postsResponse.json();

            const seriesResponse = await fetch('/.netlify/functions/get-series');
            if (!seriesResponse.ok) throw new Error('Failed to fetch series.');
            allSeries = await seriesResponse.json();

            await fetchRecentViews();
        } catch (error) {
            console.error("Error fetching data:", error);
            allPosts = [];
            allSeries = [];
        } finally {
            isLoadingPosts = false;
            currentPage = 1;
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

    // 모달 관련 함수
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

    // 새로운 시리즈 생성 모달 함수
    function showCreateSeriesModal() {
        createSeriesModal.style.display = 'flex';
        newSeriesNameInput.value = '';
    }
    function hideCreateSeriesModal() {
        createSeriesModal.style.display = 'none';
    }
    async function handleCreateSeries() {
        const seriesName = newSeriesNameInput.value.trim();
        if (!seriesName) {
            showCustomAlert('시리즈 이름을 입력해주세요.');
            return;
        }

        try {
            // 서버에 시리즈 생성 요청
            const response = await fetch('/.netlify/functions/create-series', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: seriesName })
            });
            if (!response.ok) throw new Error('Failed to create series.');

            await showCustomAlert(`'${seriesName}' 시리즈가 생성되었습니다.`);
            hideCreateSeriesModal();
            await fetchAllData();
        } catch (error) {
            console.error('Error creating series:', error);
            showCustomAlert('시리즈 생성 중 오류가 발생했습니다.');
        }
    }

    // 시리즈에 글 추가/삭제 모달 함수
    function showAddToSeriesModal() {
        postSelectionList.innerHTML = '';
        const allPostList = allPosts.filter(p => p.status !== 'deleted');
        
        allPostList.forEach(post => {
            const isChecked = currentSeries.postIds.includes(post.id);
            const postItem = document.createElement('div');
            postItem.className = 'post-selection-item';
            postItem.innerHTML = `
                <input type="checkbox" id="post-${post.id}" data-id="${post.id}" ${isChecked ? 'checked' : ''}>
                <label for="post-${post.id}">${post.title}</label>
            `;
            postSelectionList.appendChild(postItem);
        });

        addToSeriesModal.style.display = 'flex';
    }
    function hideAddToSeriesModal() {
        addToSeriesModal.style.display = 'none';
    }
    async function handleAddToSeries() {
        const selectedIds = Array.from(postSelectionList.querySelectorAll('input:checked'))
            .map(checkbox => parseInt(checkbox.dataset.id));
        
        const seriesToUpdate = { ...currentSeries, postIds: selectedIds };

        try {
            const response = await fetch('/.netlify/functions/update-series', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(seriesToUpdate)
            });

            if (!response.ok) throw new Error('Failed to update series.');

            await showCustomAlert('시리즈가 성공적으로 업데이트되었습니다.');
            hideAddToSeriesModal();
            await fetchAllData();
        } catch (error) {
            console.error('Error updating series:', error);
            showCustomAlert('시리즈 업데이트 중 오류가 발생했습니다.');
        }
    }

    // 이벤트 리스너 설정
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
            currentSeries = null; // 탭 변경 시 시리즈 선택 초기화
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

      // 시리즈 관련 이벤트 리스너 추가
      addSeriesBtn.addEventListener('click', showCreateSeriesModal);
      cancelCreateSeriesBtn.addEventListener('click', hideCreateSeriesModal);
      confirmCreateSeriesBtn.addEventListener('click', handleCreateSeries);

      editSeriesBtn.addEventListener('click', showAddToSeriesModal);
      cancelAddToSeriesBtn.addEventListener('click', hideAddToSeriesModal);
      confirmAddToSeriesBtn.addEventListener('click', handleAddToSeries);
    }
    
    await initializeTab();
    await fetchAllData();
    setupEventListeners();
});
