// 🌟 auth.js 최종 동기화 수정본
(function() {
    const rawData = localStorage.getItem('loggedInUser');
    let isValidUser = false;

    if (rawData && rawData !== 'null' && rawData !== 'undefined' && rawData !== '{}' && rawData !== '""') {
        try {
            const user = JSON.parse(rawData);
            if (user && user.username) {
                isValidUser = true;
            }
        } catch (e) {
            localStorage.removeItem('loggedInUser');
        }
    }

    // 외부 스크립트 레벨에서도 옛날 주소(login.html) 대신 새 통합 대문(index.html)으로 맞춤
    if (!isValidUser) {
        localStorage.removeItem('loggedInUser');
        window.location.href = 'index.html';
    }
})();
