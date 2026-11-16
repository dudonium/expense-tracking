from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_current_user
from app.models import Category, User
from app.schemas import UserAuth, UserOut
from app.security import hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["Auth"])

DEFAULT_CATEGORIES = [
    ("Продукты", "#E5C79B"),
    ("Транспорт", "#9EF7F7"),
    ("Развлечения", "#E598E5"),
    ("Услуги", "#A3E28C"),
    ("Другое", "#8E8E8E"),
]

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(data: UserAuth, request: Request, db: Session = Depends(get_db)):
    existing = db.execute(select(User).where(User.username == data.username.strip())).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким логином уже существует"
        )
    user = User(
        username=data.username.strip(),
        password_hash=hash_password(data.password)
    )
    db.add(user)
    db.flush()

    for cat_name, cat_color in DEFAULT_CATEGORIES:
        db.add(Category(name=cat_name, color=cat_color, owner_id=user.id))

    db.commit()
    db.refresh(user)
    request.session["user_id"] = user.id
    return user

@router.post("/login", response_model=UserOut)
def login(data: UserAuth, request: Request, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.username == data.username.strip())).scalar_one_or_none()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль"
        )
    request.session["user_id"] = user.id
    return user

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request):
    request.session.clear()

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user