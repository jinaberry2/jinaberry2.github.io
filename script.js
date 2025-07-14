// DOMContentLoaded 이벤트 리스너: 문서가 완전히 로드되고 파싱된 후 실행됩니다.
document.addEventListener('DOMContentLoaded', async () => {
    // 탭 클릭 이벤트 리스너를 설정합니다.
    setupTabListeners();

    // 로컬 스토리지에서 마지막으로 활성화된 탭을 가져옵니다.
    // 저장된 탭이 없으면 'purchase' 탭을 기본값으로 설정합니다.
    const lastActiveTab = localStorage.getItem('activeTab');
    showTab(lastActiveTab || 'purchase');

    // 초기 포스트 로드 (모든 포스트, 인기 포스트 등)
    await loadAllPosts();
    await loadPopularPosts(); // 인기 포스트 로드 함수가 있다면 호출
});

/**
 * 탭 클릭 이벤트 리스너를 설정합니다.
 */
function setupTabListeners() {
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (event) => {
            const tabName = event.target.dataset.tab;
            showTab(tabName);
        });
    });
}

/**
 * 지정된 탭을 활성화하고 내용을 표시합니다.
 * @param {string} tabName - 활성화할 탭의 이름 (예: 'all', 'recent', 'popular', 'purchase')
 */
async function showTab(tabName) {
    // 모든 탭 내용을 숨깁니다.
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // 모든 탭 버튼의 'active' 클래스를 제거합니다.
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });

    // 선택된 탭 내용과 버튼을 활성화합니다.
    document.getElementById(`${tabName}-content`).classList.add('active');
    document.querySelector(`.tab-button[data-tab="${tabName}"]`).classList.add('active');

    // 로컬 스토리지에 현재 활성화된 탭을 저장합니다.
    localStorage.setItem('activeTab', tabName);

    // 'recent' 탭이 활성화될 때마다 최근 포스트를 다시 로드합니다.
    if (tabName === 'recent') {
        await loadRecentPosts();
    }
    // 다른 탭에 대한 특정 로드 로직이 있다면 여기에 추가합니다.
    // 예: if (tabName === 'popular') { await loadPopularPosts(); }
}

/**
 * 모든 포스트를 가져와서 'all' 탭에 표시합니다.
 */
async function loadAllPosts() {
    try {
        const response = await fetch('/.netlify/functions/get-posts');
        const posts = await response.json();
        displayPosts(posts, 'all-posts-list');
    } catch (error) {
        console.error('모든 포스트를 불러오는 중 오류 발생:', error);
        document.getElementById('all-posts-list').innerHTML = '<p>포스트를 불러올 수 없습니다.</p>';
    }
}

/**
 * 최근 조회된 포스트를 가져와서 'recent' 탭에 표시합니다.
 * 조회 시간에 따라 최신순으로 정렬됩니다.
 */
async function loadRecentPosts() {
    try {
        // 1. 최근 조회 기록을 가져옵니다.
        const recentViewsResponse = await fetch('/.netlify/functions/get-recent-views');
        const recentViews = await recentViewsResponse.json();

        // 2. 모든 포스트 데이터를 가져옵니다.
        const allPostsResponse = await fetch('/.netlify/functions/get-posts');
        const allPosts = await allPostsResponse.json();

        // 3. recentViews를 postId를 키로 하는 맵으로 변환하여 조회 시간을 쉽게 찾을 수 있도록 합니다.
        const recentViewsMap = new Map();
        recentViews.forEach(view => {
            // 같은 postId가 여러 번 조회될 경우, 가장 최근의 timestamp를 사용합니다.
            if (!recentViewsMap.has(view.postId) || new Date(view.timestamp) > new Date(recentViewsMap.get(view.postId).timestamp)) {
                recentViewsMap.set(view.postId, view);
            }
        });

        // 4. 최근 조회된 포스트만 필터링하고, 조회 시간에 따라 정렬합니다.
        const recentPosts = allPosts.filter(post => recentViewsMap.has(post.id))
                                    .map(post => ({
                                        ...post,
                                        viewTimestamp: recentViewsMap.get(post.id).timestamp // 조회 시간 추가
                                    }))
                                    .sort((a, b) => new Date(b.viewTimestamp) - new Date(a.viewTimestamp)); // 최신순 정렬

        displayPosts(recentPosts, 'recent-posts-list');

        if (recentPosts.length === 0) {
            document.getElementById('recent-posts-list').innerHTML = '<p>최근에 본 포스트가 없습니다.</p>';
        }

    } catch (error) {
        console.error('최근 포스트를 불러오는 중 오류 발생:', error);
        document.getElementById('recent-posts-list').innerHTML = '<p>최근 포스트를 불러올 수 없습니다.</p>';
    }
}

/**
 * 인기 포스트를 가져와서 'popular' 탭에 표시합니다.
 * (이 함수는 현재 구현되어 있지 않으므로, 필요에 따라 구현해야 합니다.)
 */
async function loadPopularPosts() {
    // 이 함수는 '인기' 포스트를 로드하는 로직을 포함해야 합니다.
    // 현재는 더미 데이터 또는 비어있는 상태입니다.
    // 예: 조회수 또는 좋아요 수 기준으로 정렬된 포스트를 가져오는 로직 추가
    try {
        const response = await fetch('/.netlify/functions/get-posts'); // 예시: 모든 포스트를 가져옴
        let posts = await response.json();
        // 실제 인기 포스트 로직 (예: 좋아요 수 또는 조회수 기준 정렬)
        posts.sort((a, b) => (b.likes || 0) - (a.likes || 0)); // 좋아요 수 기준으로 정렬 예시
        displayPosts(posts.slice(0, 5), 'popular-posts-list'); // 상위 5개만 표시
    } catch (error) {
        console.error('인기 포스트를 불러오는 중 오류 발생:', error);
        document.getElementById('popular-posts-list').innerHTML = '<p>인기 포스트를 불러올 수 없습니다.</p>';
    }
}


/**
 * 주어진 포스트 배열을 지정된 HTML 요소에 표시합니다.
 * @param {Array} posts - 표시할 포스트 객체 배열
 * @param {string} elementId - 포스트를 표시할 HTML 요소의 ID
 */
function displayPosts(posts, elementId) {
    const postListElement = document.getElementById(elementId);
    postListElement.innerHTML = ''; // 기존 내용 지우기

    if (posts.length === 0) {
        postListElement.innerHTML = '<p>표시할 포스트가 없습니다.</p>';
        return;
    }

    posts.forEach(post => {
        const postItem = document.createElement('div');
        postItem.className = 'post-item';
        postItem.innerHTML = `
            <h3><a href="post.html?id=${post.id}">${post.title}</a></h3>
            <p>${post.summary || post.content.substring(0, 100) + '...'}</p>
            <small>작성일: ${new Date(post.date).toLocaleDateString()}</small>
            <small>좋아요: ${post.likes || 0}</small>
        `;
        postListElement.appendChild(postItem);
    });
}
