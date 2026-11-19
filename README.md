# Веб-приложение "Учёт расходов"
Выполнила: Андреева Дарья Владимировна, группа ИСиП-1-9-24

## Установка и запуск
1. Клонировать репозиторий и перейти в папку проекта
   - git clone https://github.com/dudonium/expense-tracking.git
   - cd project1

2. Создание виртуального окружения
    - python -m venv venv
    - venv\Scripts\activate

3. Установка зависимостей
    - pip install -r requirements.txt

4. Применение миграций БД
    - alembic upgrade head

5. Запуск сервера
    - uvicorn app.main:app --reload

## Схема БД
- users (id, username, password_hash) — хранит данные пользователей. Пароли сохраняются только в виде хеша с солью.
- categories (id, name, color, owner_id) — категории операций. Связана с таблицей users внешним ключом owner_id (связь 1:N, каскадное удаление).
- expenses (id, title, amount, spent_date, comment, is_income, category_id, owner_id) — основная сущность с записями о расходах и доходах. Связана с users через owner_id и с categories через category_id (при удалении категории поле обнуляется).

## Список эндпоинтов
### Авторизация (/api/auth)
- POST /api/auth/register — регистрация нового пользователя и создание стартовых категорий (201)
- POST /api/auth/login — вход в систему, установка cookie-сессии (200, 401)
- POST /api/auth/logout — выход из системы, очистка сессии (204)
- GET /api/auth/me — получение данных текущего пользователя (200, 401)

### Категории (/api/categories)
- GET /api/categories — список категорий текущего пользователя (200)
- POST /api/categories — создание новой категории (201, 400, 422)
- DELETE /api/categories/{id} — удаление своей категории (204, 404)

### Операции и статистика (/api/expenses)
- GET /api/expenses — список операций с поиском (search), фильтрацией (category_id, date_from, date_to), сортировкой (sort_by) и пагинацией (limit, offset) (200)
- GET /api/expenses/{id} — получение одной своей операции (200, 404)
- POST /api/expenses — добавление новой операции (201, 422)
- PATCH /api/expenses/{id} — редактирование своей операции (200, 404, 422)
- DELETE /api/expenses/{id} — удаление своей операции (204, 404)
- GET /api/expenses/stats — сводная статистика: текущий баланс, суммы доходов/расходов и группировка трат по категориям (GROUP BY) (200)
    
## Скриншоты интерфейса
- screenshots/rm-main.png
- screenshots/rm-login.png
- screenshots/rm-register.png
