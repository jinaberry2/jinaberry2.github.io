document.addEventListener('DOMContentLoaded', async () => {
    // ==========================================================
    // 🌟 [보안 가드] 로그인 체크 및 미인증 사용자 즉각 차단
    // ==========================================================
    const sessionUserData = localStorage.getItem('loggedInUser');
    if (!sessionUserData) {
        window.location.href = 'index.html';
        return;
    }
    const currentUser = JSON.parse(sessionUserData);

    // ==========================================================
    // 🌟 [실시간 접속자] 마지막 활동 시간 주기적 갱신 (1분마다)
    // ==========================================================
    async function updateActiveStatus() {
        try {
            await fetch('/.netlify/functions/update-active-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: currentUser.username })
            });
        } catch (e) {
            console.error("접속 상태 갱신 실패:", e);
        }
    }
    updateActiveStatus();
    setInterval(updateActiveStatus, 60000);

    // 기본 변수 선언부
    let currentTab = 'purchased';
    let searchTerm = '';
    let allPosts = [];
    let currentSort = 'newest';
    let isSelectionMode = false;
    let selectedPostIds = []; // 포스트 선택용 배열
    let selectedSeriesNames = []; // 시리즈 선택용 배열
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
    const bulkRestoreBtn = document.getElementById('bulk-restore-btn'); // 복구 버튼 바인딩
    const paginationContainer = document.getElementById('pagination-container');

    const seriesAddBtnContainer = document.getElementById('series-add-btn-container');
    const seriesEditBtnContainer = document.getElementById('series-edit-btn-container');

    // 비밀번호 모달창 관련 DOM 요소들
    const passwordModalOverlay = document.getElementById('password-modal-overlay');
    const modalPasswordInput = document.getElementById('modal-password-input');
    const modalLoginBtn = document.getElementById('modal-login-btn');
    const modalErrorMessage = document.getElementById('modal-error-message');
    const closeModalBtn = document.getElementById('close-modal-btn');

    const CORRECT_PASSWORD = '0506';

    function showPasswordModal() {
        if (!passwordModalOverlay) return;
        passwordModalOverlay.classList.add('visible');
        if (modalPasswordInput) {
            modalPasswordInput.value = '';
            modalPasswordInput.focus();
        }
        if (modalErrorMessage) modalErrorMessage.style.visibility = 'hidden';
    }

    function hidePasswordModal() {
        if (!passwordModalOverlay) return;
        passwordModalOverlay.classList.remove('visible');
    }

    function handleModalLogin() {
        if (!modalPasswordInput) return;
        const enteredPassword = modalPasswordInput.value;
        if (enteredPassword === CORRECT_PASSWORD) {
            localStorage.setItem('adminAuthenticated', 'true');
            hidePasswordModal();
            window.location.href = `write.html?tab=${currentTab}`;
        } else {
            if (modalErrorMessage) modalErrorMessage.style.visibility = 'visible';
        }
    }

    // ==========================================================
    // [관리자 모니터링 UI 동적 생성]
    // ==========================================================
    if (currentUser.role === 'admin') {
        const adminSection = document.createElement('section');
        adminSection.id = 'admin-dashboard-section';
        adminSection.style.cssText = "margin-top: 40px; padding: 20px; background: #fff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-top: 4px solid #3a3630;";
        adminSection.innerHTML = `
            <h2 style="font-size: 1.15rem; margin-top: 0; margin-bottom: 15px; color: #333; display: flex; align-items: center; gap: 8px; font-weight:600;">
                🛡️ 관리자 모니터링 대시보드
            </h2>
            <div style="display: flex; gap: 15px; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 12px;">
                <button id="admin-subtab-users" style="padding: 6px 14px; background: #3a3630; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; font-size:0.88rem;">가입 승인 관리</button>
                <button id="admin-subtab-logs" style="padding: 6px 14px; background: #f0f0f0; color: #333; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; font-size:0.88rem;">실시간 접속 & 로그</button>
            </div>
            <div id="admin-dashboard-content"></div>
        `;
        const mainElement = document.querySelector('main') || document.body;
        mainElement.appendChild(adminSection);

        document.getElementById('admin-subtab-users').onclick = (e) => {
            switchAdminTab('users', e.target);
        };
        document.getElementById('admin-subtab-logs').onclick = (e) => {
            switchAdminTab('logs', e.target);
        };

        loadPendingUsers();
    }

    function switchAdminTab(target, activeBtn) {
        const btns = [document.getElementById('admin-subtab-users'), document.getElementById('admin-subtab-logs')];
        btns.forEach(b => {
            if (b) {
                b.style.background = '#f0f0f0';
                b.style.color = '#333';
            }
        });
        activeBtn.style.background = '#3a3630';
        activeBtn.style.color = '#fff';

        if (target === 'users') {
            loadPendingUsers();
        } else {
            loadLiveUsersAndLogs();
        }
    }

    async function loadPendingUsers() {
        const contentDiv = document.getElementById('admin-dashboard-content');
        if (!contentDiv) return;
        contentDiv.innerHTML = '<p style="color:#888; font-size:0.9rem;">회원 목록 로드 중...</p>';
        try {
            const res = await fetch('/.netlify/functions/get-pending-users');
            const users = await res.json();
            if (!res.ok) throw new Error(users.message);

            if (users.length === 0) {
                contentDiv.innerHTML = '<p style="color:#aaa; text-align:center; padding: 15px 0; font-size:0.9rem;">승인 대기 중인 신규 가입자가 없습니다.</p>';
                return;
            }

            let html = `<table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
                <thead>
                    <tr style="background:#f8f9fa; border-bottom:2px solid #eee; text-align:left;">
                        <th style="padding:10px;">아이디</th><th style="padding:10px;">신청 일시</th><th style="padding:10px; text-align:center;">관리</th>
                    </tr>
                </thead>
                <tbody>`;
            users.forEach(u => {
                const dateStr = new Date(u.created_at).toLocaleString('ko-KR');
                html += `<tr style="border-bottom:1px solid #eee;">
                    <td style="padding:10px; font-weight:600; color:#333;">${u.username}</td>
                    <td style="padding:10px; color:#666;">${dateStr}</td>
                    <td style="padding:10px; text-align:center;">
                        <button class="approve-user-btn" data-username="${u.username}" style="padding:4px 10px; background:#28a745; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:0.8rem; font-weight:bold;">승인</button>
                    </td>
                </tr>`;
            });
            html += '</tbody></table>';
            contentDiv.innerHTML = html;

            contentDiv.querySelectorAll('.approve-user-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    const uname = e.target.dataset.username;
                    if (confirm(`${uname} 회원의 가입을 승인하시겠습니까?`)) {
                        try {
                            const approveRes = await fetch('/.netlify/functions/approve-user', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ username: uname })
                            });
                            if (approveRes.ok) {
                                alert("성공적으로 승인되었습니다.");
                                loadPendingUsers();
                            } else {
                                const err = await approveRes.json();
                                alert(`승인 실패: ${err.message}`);
                            }
                        } catch (err) {
                            alert("통신 중 에러 발생");
                        }
                    }
                };
            });
        } catch (err) {
            contentDiv.innerHTML = `<p style="color:red; font-size:0.9rem;">로드 실패: ${err.message}</p>';
        }
    }

    async function loadLiveUsersAndLogs() {
        const contentDiv = document.getElementById('admin-dashboard-content');
        if (!contentDiv) return;
        contentDiv.innerHTML = '<p style="color:#888; font-size:0.9rem;">접속 로그 분석 중...</p>';
        try {
            const res = await fetch('/.netlify/functions/get-login-logs');
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            let html = `<div style="margin-bottom: 25px;">
                <h3 style="font-size:0.95rem; margin-bottom:10px; color:#222; font-weight:600;">🟢 현재 접속 중인 멤버 (${data.liveUsers.length}명)</h3>`;
            
            if (data.liveUsers.length === 0) {
                html += '<p style="color:#999; font-size:0.85rem; padding-left:5px;">현재 활동 중인 회원이 없습니다.</p>';
            } else {
                html += '<div style="display:flex; gap:10px; flex-wrap:wrap;">';
                data.liveUsers.forEach(u => {
                    html += `<span style="padding:4px 12px; background:#f4f9f2; color:#385723; border-radius:20px; font-size:0.8rem; font-weight:bold; border:1px solid #c5e0b4;">👤 ${u.username}</span>`;
                });
                html += '</div>';
            }
            html += '</div>';

            html += `<div>
                <h3 style="font-size:0.95rem; margin-bottom:10px; color:#222; font-weight:600;">📋 최근 로그인 이력 기록</h3>
                <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
                    <thead>
                        <tr style="background:#f8f9fa; border-bottom:2px solid #eee; text-align:left;">
                            <th style="padding:8px;">유저명</th><th style="padding:8px;">로그인 시각</th><th style="padding:8px;">마지막 활동 시각</th>
                        </tr>
                    </thead>
                    <tbody>`;
            
            if (data.logs.length === 0) {
                html += '<tr><td colspan="3" style="padding:15px; text-align:center; color:#aaa;">남아있는 기록이 없습니다.</td></tr>';
            } else {
                data.logs.forEach(l => {
                    const loginStr = new Date(Number(l.login_at)).toLocaleString('ko-KR');
                    const activeStr = new Date(Number(l.last_active_at)).toLocaleString('ko-KR');
                    html += `<tr style="border-bottom:1px solid #eee;">
                        <td style="padding:8px; font-weight:600; color:#444;">${l.username}</td>
                        <td style="padding:8px; color:#666;">${loginStr}</td>
                        <td style="padding:8px; color:#888;">${activeStr}</td>
                    </tr>`;
                });
            }
            html += '</tbody></table></div>';
            contentDiv.innerHTML = html;
        } catch (err) {
            contentDiv.innerHTML = `<p style="color:red; font-size:0.9rem;">데이터 로드 실패: ${err.message}</p>`;
        }
    }

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
                        <button id="custom-confirm-ok-btn" style="background-color: #dc3545; color: white; font-weight: bold; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer;">확인</button>
                    </div>
                </div>
            `;
            document.body.appendChild(confirmBox);

            document.getElementById('custom-confirm-ok-btn').onclick = () => {
                document.body.removeChild(confirmBox);
                resolve(true);
            };
            document.getElementById('custom-confirm-cancel-btn').onclick = () => {
                confirmBox.parentNode.removeChild(confirmBox);
                resolve(false);
            };
        });
    }

    function toggleSelectionMode() {
        isSelectionMode = !isSelectionMode;
        selectedPostIds = [];
        selectedSeriesNames = [];
        
        if (isSelectionMode) {
            selectBtn.textContent = '취소';
            addPostBtn.style.display = 'none';
            bulkDeleteBar.style.display = 'flex';
            // 🌟 삭제된 글 탭일 때만 복구 버튼 노출
            if (bulkRestoreBtn) bulkRestoreBtn.style.display = (currentTab === 'deleted') ? 'block' : 'none';
        } else {
            selectBtn.textContent = '선택';
            addPostBtn.style.display = (currentTab === 'deleted' || currentTab === 'series') ? 'none' : 'flex';
            bulkDeleteBar.style.display = 'none';
            if (bulkRestoreBtn) bulkRestoreBtn.style.display = 'none';
        }
        updateBulkDeleteBtn();
        renderPosts();
    }

    function updateBulkDeleteBtn() {
        if (currentTab === 'series') {
            bulkDeleteBtn.textContent = `시리즈 삭제 (${selectedSeriesNames.length})`;
            bulkDeleteBtn.disabled = selectedSeriesNames.length === 0;
        } else {
            bulkDeleteBtn.textContent = `일괄 삭제 (${selectedPostIds.length})`;
            bulkDeleteBtn.disabled = selectedPostIds.length === 0;
            
            // 🌟 일괄 복구 카운트 동기화
            if (bulkRestoreBtn) {
                bulkRestoreBtn.textContent = `일괄 복구 (${selectedPostIds.length})`;
                bulkRestoreBtn.disabled = selectedPostIds.length === 0;
            }
        }
    }

    // 🌟 [신규 추가] 삭제된 글 일괄 복구 처리 함수
    async function restoreSelectedPosts() {
        if (selectedPostIds.length === 0) {
            await showCustomAlert("복구할 글이 선택되지 않았습니다.");
            return;
        }

        const confirmRestore = await showCustomConfirm(`선택한 ${selectedPostIds.length}개의 글을 다시 구매 탭 목록으로 복구하시겠습니까?`);
        if (!confirmRestore) return;

        try {
            const response = await fetch('/.netlify/functions/update-post-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedPostIds, status: 'active' }) // active(정상)로 변경
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "복구 요청 실패");

            await showCustomAlert(`선택한 글들이 성공적으로 복구되어 구매 탭으로 이동했습니다.`);
            toggleSelectionMode();
            await fetchPostsAndRender();
        } catch (error) {
            console.error("복구 처리 오류:", error);
            await showCustomAlert(`복구 중 오류가 발생했습니다: ${error.message}`);
        }
    }

    async function permanentDeleteSelectedPosts() {
        let confirmMsg = "";
        let targetFunction = "";
        let requestBody = {};
        let successMsg = "";

        if (currentTab === 'series') {
            if (selectedSeriesNames.length === 0) {
                await showCustomAlert("선택된 시리즈가 없습니다.");
                return;
            }
            confirmMsg = `선택한 ${selectedSeriesNames.length}개의 시리즈와 그 안에 포함된 모든 글들을 삭제 목록(휴지통)으로 이동하시겠습니까?`;
            
            const targetIds = allPosts
                .filter(p => p.status !== 'deleted' && p.seriesName && selectedSeriesNames.includes(p.seriesName.trim()))
                .map(p => p.id);
                
            if (targetIds.length === 0) {
                await showCustomAlert("시리즈에 포함된 글이 없어 빈 시리즈만 정리됩니다.");
                toggleSelectionMode();
                await fetchPostsAndRender();
                return;
            }
            
            targetFunction = '/.netlify/functions/update-post-status';
            requestBody = { ids: targetIds, status: 'deleted' };
            successMsg = `선택한 시리즈 내 포스트들이 삭제 목록으로 이동되었습니다.`;

        } else if (currentTab === 'deleted') {
            if (selectedPostIds.length === 0) {
                await showCustomAlert("선택된 글이 없습니다.");
                return;
            }
            confirmMsg = `${selectedPostIds.length}개의 글을 완전히 영구 삭제하시겠습니까? 이 작업은 절대 되돌릴 수 없습니다.`;
            targetFunction = '/.netlify/functions/delete-post';
            requestBody = { ids: selectedPostIds };
            successMsg = `선택한 글들이 완벽하게 영구 삭제되었습니다.`;

        } else {
            if (selectedPostIds.length === 0) {
                await showCustomAlert("선택된 글이 없습니다.");
                return;
            }
            confirmMsg = `${selectedPostIds.length}개의 글을 삭제 목록(휴지통)으로 이동하시겠습니까?`;
            targetFunction = '/.netlify/functions/update-post-status';
            requestBody = { ids: selectedPostIds, status: 'deleted' };
            successMsg = `선택한 글들이 삭제 목록으로 안전하게 이동되었습니다.`;
        }

        const confirmDelete = await showCustomConfirm(confirmMsg);
        if (!confirmDelete) return;

        try {
            const response = await fetch(targetFunction, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "서버 요청 처리 실패");

        } catch (error) {
            console.error("삭제 처리 오류:", error);
            await showCustomAlert(`삭제 처리 중 오류 발생: ${error.message}`);
            return;
        }

        await showCustomAlert(successMsg);
        toggleSelectionMode();
        await fetchPostsAndRender();
    }

    function renderPosts() {
        if (currentTab === 'purchased' || currentTab === 'deleted' || currentTab === 'series') {
            selectBtn.style.display = 'block';
        } else {
            selectBtn.style.display = 'none';
            if (isSelectionMode) toggleSelectionMode();
        }

        if (currentTab === 'purchased') {
            if (!isSelectionMode) addPostBtn.style.display = 'flex';
        } else {
            addPostBtn.style.display = 'none';
        }

        if (seriesAddBtnContainer) seriesAddBtnContainer.style.display = 'none';
        if (seriesEditBtnContainer) seriesEditBtnContainer.style.display = 'none';

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

        if (currentTab === 'series') {
            renderSeriesPosts();
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
            postsToRender = allPosts.filter(post => post.status !== 'deleted' && post.viewedTimestamp && Number(post.viewedTimestamp) > 0);
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
            postsToRender.sort((a, b) => (Number(b[sortKey]) || 0) - (Number(a[sortKey]) || 0));
        } else if (currentSort === 'oldest') {
            postsToRender.sort((a, b) => (Number(a[sortKey]) || 0) - (Number(b[sortKey]) || 0));
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
                if (isChecked) checkbox.checked = true;
                
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

    function renderSeriesPosts() {
        postListContainer.innerHTML = '';
        
        const seriesMap = {};
        allPosts.forEach(post => {
            if (post.status !== 'deleted' && post.seriesName && post.seriesName.trim() !== "") {
                const sName = post.seriesName.trim();
                if (!seriesMap[sName]) seriesMap[sName] = [];
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
            postsInSeries.sort((a, b) => (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0));
            
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

            const checkboxHTML = isSelectionMode ? `<div class="checkbox-container" style="margin-right:10px;"><input type="checkbox" class="series-checkbox" data-name="${name}"></div>` : '';

            seriesHeader.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px; flex: 1;">
                    ${checkboxHTML}
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
            const checkbox = seriesHeader.querySelector('.series-checkbox');

            seriesHeader.addEventListener('click', (e) => {
                if (isSelectionMode && checkbox) {
                    if (e.target === checkbox) return; 
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                    return;
                }

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

            if (checkbox) {
                const isChecked = selectedSeriesNames.includes(name);
                if (isChecked) checkbox.checked = true;

                checkbox.addEventListener('change', (e) => {
                    const sName = e.target.dataset.name;
                    if (e.target.checked) {
                        if (!selectedSeriesNames.includes(sName)) selectedSeriesNames.push(sName);
                    } else {
                        selectedSeriesNames = selectedSeriesNames.filter(n => n !== sName);
                    }
                    updateBulkDeleteBtn();
                });
            }

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
            allPosts = supabasePosts || [];
        } catch (error) {
            console.error("데이터 조회 중 치명적 오류 발생:", error);
            allPosts = [];
        } finally {
            isLoadingPosts = false;
            renderPosts();
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
            if (btn) {
                btn.classList.remove('active');
                if (btn.dataset.tab === currentTab) {
                    btn.classList.add('active');
                }
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
                if (sortText) sortText.textContent = '최신순';
                currentPage = 1;
                
                if (isSelectionMode) toggleSelectionMode();
                
                renderPosts();
            });
        });

        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    searchTerm = e.target.value;
                    currentPage = 1;
                    renderPosts();
                }, 300);
            });
        }

        if (sortButton) {
            sortButton.addEventListener('click', (e) => {
                e.stopPropagation();
                if (sortOptionsContainer) sortOptionsContainer.classList.toggle('active');
            });
        }

        if (sortMenu) {
            sortMenu.addEventListener('click', (e) => {
                if (e.target.classList.contains('sort-option')) {
                    const selectedSort = e.target.dataset.sort;
                    if (currentSort !== selectedSort) {
                        currentSort = selectedSort;
                        if (sortText) sortText.textContent = e.target.textContent;
                        currentPage = 1;
                        renderPosts();
                    }
                    if (sortOptionsContainer) sortOptionsContainer.classList.remove('active');
                }
            });
        }

        document.addEventListener('click', (e) => {
            if (sortOptionsContainer && !sortOptionsContainer.contains(e.target)) {
                sortOptionsContainer.classList.remove('active');
            }
        });

        if (selectBtn) selectBtn.addEventListener('click', toggleSelectionMode);
        if (bulkDeleteBtn) bulkDeleteBtn.addEventListener('click', permanentDeleteSelectedPosts);
        if (bulkRestoreBtn) bulkRestoreBtn.addEventListener('click', restoreSelectedPosts); // 🌟 일괄 복구 리스너 바인딩

        if (addPostBtn) {
            addPostBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const isAlreadyAuth = localStorage.getItem('adminAuthenticated');
                if (isAlreadyAuth === 'true') {
                    window.location.href = `write.html?tab=${currentTab}`;
                } else {
                    showPasswordModal();
                }
            });
        }

        if (modalLoginBtn) modalLoginBtn.addEventListener('click', handleModalLogin);
        if (modalPasswordInput) {
            modalPasswordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleModalLogin();
            });
        }

        if (closeModalBtn) closeModalBtn.addEventListener('click', hidePasswordModal);
        if (passwordModalOverlay) {
            passwordModalOverlay.addEventListener('click', (e) => {
                if (e.target === passwordModalOverlay) hidePasswordModal();
            });
        }
    }

    await initializeTab();
    await fetchPostsAndRender();
    setupEventListeners();
});
