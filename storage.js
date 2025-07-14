// storage.js (새 파일)

const Storage = {
    // 'myPosts' 키로 저장된 모든 글을 가져옵니다.
    getPosts: function() {
        const data = localStorage.getItem('myPosts');
        if (data) {
            return JSON.parse(data);
        } else {
            // 만약 저장된 글이 없으면, 초기 예시 데이터를 생성합니다.
            const initialPosts = [
                { id: 1, title: '첫 번째 예시 글', author: '월리스오', tag: '성인', thumbnail: 'https://images.unsplash.com/photo-1558025137-0b406e9b3658?w=500&q=80', content: '이 글은 localStorage에서 불러왔습니다.', liked: true },
                { id: 2, title: '두 번째 글', author: '살구', tag: '성인', thumbnail: '', content: '이제 코드가 훨씬 깔끔해졌습니다!', liked: false }
            ];
            this.savePosts(initialPosts);
            return initialPosts;
        }
    },

    // 글 배열 전체를 'myPosts' 키로 저장합니다.
    savePosts: function(posts) {
        localStorage.setItem('myPosts', JSON.stringify(posts));
    },

    // 'deletedPosts' 키로 저장된 삭제된 글 목록을 가져옵니다.
    getDeletedPosts: function() {
        const data = localStorage.getItem('deletedPosts');
        return data ? JSON.parse(data) : [];
    },

    // 삭제된 글 배열 전체를 'deletedPosts' 키로 저장합니다.
    saveDeletedPosts: function(posts) {
        localStorage.setItem('deletedPosts', JSON.stringify(posts));
    },

    // 'recentViews' 키로 저장된 최근 본 글 목록을 가져옵니다.
    getRecentViews: function() {
        const data = localStorage.getItem('recentViews');
        return data ? JSON.parse(data) : [];
    },
    
    // 특정 ID의 글을 최근 본 글로 기록합니다.
    addRecentView: function(postId) {
        if (!postId) return;
        let recentViews = this.getRecentViews();
        // 기존 기록은 제거하고 새로 추가 (최신 순서 유지를 위해)
        recentViews = recentViews.filter(view => view.id !== postId);
        recentViews.unshift({ id: postId, timestamp: Date.now() });
        // 최대 50개까지만 저장
        if (recentViews.length > 50) {
            recentViews = recentViews.slice(0, 50);
        }
        localStorage.setItem('recentViews', JSON.stringify(recentViews));
    }
};
