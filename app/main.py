import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from app.routers import auth, categories, expenses

app = FastAPI(title="Учёт расходов")

#secret_key из чек-листа
SECRET_KEY = os.getenv("SECRET_KEY", "e8f9a2b4c6d1e3f5a7b9c0d2e4f6a8b1c3d5e7f9a0b2c4d6e8f1a3b5c7d9e0f2")

app.add_middleware(
    SessionMiddleware,
    secret_key=SECRET_KEY,
    session_cookie="expense_session",
    max_age=60 * 60 * 24 * 7,
    same_site="lax",
    https_only=False
)

app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(expenses.router)

app.mount("/", StaticFiles(directory="static", html=True), name="static")