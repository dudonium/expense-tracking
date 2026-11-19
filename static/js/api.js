async function apiRequest(url, options = {}) {
    const config = {
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        },
        ...options
    };

    const response = await fetch(url, config);

    if (response.status === 401) {
        if (!window.location.pathname.endsWith("login.html") && !window.location.pathname.endsWith("register.html")) {
            window.location.href = "/login.html";
        }
        throw new Error("Неверный логин/пароль или сессия истекла");
    }

    if (response.status === 204) {
        return null;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        if (response.status === 422 && Array.isArray(data.detail)) {
            const messages = data.detail.map(err => `${err.loc[err.loc.length - 1]}: ${err.msg}`);
            throw new Error("Ошибка проверки данных: " + messages.join("; "));
        }
        throw new Error(data.detail || `Ошибка сервера (${response.status})`);
    }

    return data;
}