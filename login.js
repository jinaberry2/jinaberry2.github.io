// login.js
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    const passwordInput = document.getElementById('password-input');
    const errorMessage = document.getElementById('error-message');

    // ✅ 여기에 원하는 비밀번호를 설정하세요.
    const CORRECT_PASSWORD = '1234';

    loginBtn.addEventListener('click', handleLogin);
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });

    function handleLogin() {
        const enteredPassword = passwordInput.value;
        if (enteredPassword === CORRECT_PASSWORD) {
            localStorage.setItem('authenticated', 'true');
            window.location.href = 'archive.html';
        } else {
            errorMessage.style.visibility = 'visible';
        }
    }
});
