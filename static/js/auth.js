document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("register-form");
    const loginForm = document.getElementById("login-form");
    const errorBox = document.getElementById("auth-error");

    function showError(msg) {
        errorBox.textContent = msg;
        errorBox.classList.remove("hidden");
    }

    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            errorBox.classList.add("hidden");
            const username = document.getElementById("username").value;
            const password = document.getElementById("password").value;

            try {
                await apiRequest("/api/auth/register", {
                    method: "POST",
                    body: JSON.stringify({ username, password })
                });
                window.location.href = "/index.html";
            } catch (err) {
                showError(err.message);
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            errorBox.classList.add("hidden");
            const username = document.getElementById("username").value;
            const password = document.getElementById("password").value;

            try {
                await apiRequest("/api/auth/login", {
                    method: "POST",
                    body: JSON.stringify({ username, password })
                });
                window.location.href = "/index.html";
            } catch (err) {
                showError(err.message);
            }
        });
    }
});