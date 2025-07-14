// auth.js
(function() {
    const isAuthenticated = localStorage.getItem('authenticated');
    const path = window.location.pathname;

    // 인증 상태가 아니면 로그인 페이지로 리디렉션
    if (isAuthenticated !== 'true' && path.includes('archive.html')) {
        window.location.href = 'index.html';
    } else if (isAuthenticated !== 'true' && path.includes('write.html')) {
        window.location.href = 'index.html';
    }
})();
