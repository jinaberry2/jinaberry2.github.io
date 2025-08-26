document.addEventListener('DOMContentLoaded', async () => {
    let currentTab = 'purchased';
    let searchTerm = '';
    let allPosts = [];
    let recentViews = [];
    let allSeries = [];
    let currentSeries = null;
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

    const seriesAddBtnContainer = document.getElementById('series-add-btn-container');
    const seriesEditBtnContainer = document.getElementById('series-edit-btn-container');
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

    function renderPosts() {
        if (currentTab === 'deleted') {
            selectBtn.style.display = 'block';
            addPostBtn.style.display = 'none';
            seriesAddBtnContainer.style.display = 'none';
            seriesEditBtnContainer.style.display = 'none';
        } else if (currentTab === 'series') {
            selectBtn.style.display = 'none';
            addPostBtn.style.display = 'none';
            seriesAddBtnContainer.style.display = 'flex';
            if (currentSeries) {
                seriesEditBtnContainer.style.display = 'flex';
            } else {
                seriesEditBtnContainer.style.display = 'none';
            }
            if (isSelectionMode) {
                toggleSelectionMode();
            }
        } else {
            selectBtn.style.display = 'none';
            addPostBtn.style.display = 'flex';
            seriesAddBtnContainer.style.display = 'none';
            seriesEditBtnContainer.style.display = 'none';
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
            postCountElement.textContent = '';
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
        } else if (currentTab === 'series') {
            if (currentSeries) {
                postsToRender = allPosts.filter(p => p.seriesId === currentSeries.id);
            } else {
                renderSeriesPosts();
                return;
            }
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

        renderPagination();
    }

    function renderSeriesPosts() {
        seriesEditBtnContainer.style.display = 'none';
        postListContainer.innerHTML = '';
        if (allSeries.length === 0) {
            postListContainer.innerHTML = '<p style="text-align:center; color:#888; margin-top: 2rem;">생성된 시리즈가 없습니다.</p>';
            return;
        }

        allSeries.forEach(series => {
            const seriesDiv = document.createElement('div');
            seriesDiv.className = 'series-item';
            seriesDiv.innerHTML = `
                <h4>${series.name}</h4>
                <p>총 ${series.postIds.length}개의 글</p>
            `;
            seriesDiv.addEventListener('click', () => {
                currentSeries = series;
                renderPosts();
            });
            postListContainer.appendChild(seriesDiv);
        });
        postCountElement.textContent = `${allSeries.length}개의 시리즈`;
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
            const [postsResponse, viewsResponse, seriesResponse] = await Promise.all([
                fetch('posts.json'),
                fetch('recent-views.json'),
                fetch('/.netlify/functions/get-series')
            ]);

            if (!postsResponse.ok) throw new Error('Failed to fetch posts.');
            if (!viewsResponse.ok) throw new Error('Failed to fetch recent views.');
            if (!seriesResponse.ok) throw new Error('Failed to fetch series.');

            allPosts = await postsResponse.json();
            recentViews = await viewsResponse.json();
            allSeries = await seriesResponse.json();

        } catch (error) {
            console.error("Error fetching data:", error);
            allPosts = [];
            recentViews = [];
            allSeries = [];
        } finally {
            isLoadingPosts = false;
            currentPage = 1;
            renderPosts();
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

    async function createSeries() {
        const seriesName = newSeriesNameInput.value.trim();
        if (!seriesName) {
            await showCustomAlert('시리즈명을 입력해주세요.');
            return;
        }

        if (allSeries.some(s => s.name === seriesName)) {
            await showCustomAlert('이미 존재하는 시리즈명입니다.');
            return;
        }

        try {
            const response = await fetch('/.netlify/functions/create-series', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: seriesName })
            });

            if (!response.ok) {
                throw new Error('시리즈 생성 실패.');
            }

            await fetchPostsAndRender();
            createSeriesModal.style.display = 'none';
            await showCustomAlert('시리즈가 생성되었습니다.');
        } catch (error) {
            console.error("Error creating series:", error);
            await showCustomAlert('시리즈 생성 중 오류가 발생했습니다.');
        }
    }

    function renderPostSelectionList() {
        postSelectionList.innerHTML = '';
        const allPostList = allPosts.filter(p => p.status !== 'deleted');
        allPostList.forEach(post => {
            const isSelected = currentSeries.postIds.includes(post.id);
            const postItem = document.createElement('div');
            postItem.className = 'post-select-item';
            postItem.innerHTML = `
                <input type="checkbox" data-id="${post.id}" ${isSelected ? 'checked' : ''}>
                <span>${post.title}</span>
            `;
            postSelectionList.appendChild(postItem);
        });
    }

    async function saveSeriesPosts() {
        const selectedIds = Array.from(postSelectionList.querySelectorAll('input:checked'))
            .map(input => parseInt(input.dataset.id));

        try {
<<<<<<< HEAD
            const response = await fetch('./netlify/functions/update-series.js', {
=======
            const response = await fetch('/.netlify/functions/update-series', {
>>>>>>> 9867953 (script.js 파일 전체 수정)
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ seriesId: currentSeries.id, postIds: selectedIds })
            });

            if (!response.ok) {
                throw new Error('시리즈 업데이트 실패.');
            }

            await fetchPostsAndRender();
            addToSeriesModal.style.display = 'none';
            await showCustomAlert('시리즈가 업데이트되었습니다.');
        } catch (error) {
            console.error("Error updating series:", error);
            await showCustomAlert('시리즈 업데이트 중 오류가 발생했습니다.');
        }
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
                currentSeries = null;
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

        addSeriesBtn.addEventListener('click', () => {
            createSeriesModal.style.display = 'flex';
            newSeriesNameInput.value = '';
            newSeriesNameInput.focus();
        });

        cancelCreateSeriesBtn.addEventListener('click', () => {
            createSeriesModal.style.display = 'none';
        });

        confirmCreateSeriesBtn.addEventListener('click', createSeries);

        editSeriesBtn.addEventListener('click', () => {
            renderPostSelectionList();
            addToSeriesModal.style.display = 'flex';
        });

        cancelAddToSeriesBtn.addEventListener('click', () => {
            addToSeriesModal.style.display = 'none';
        });

        confirmAddToSeriesBtn.addEventListener('click', saveSeriesPosts);

    }

    await initializeTab();
    await fetchPostsAndRender();
    setupEventListeners();
});
