from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_current_user
from app.models import Category, User
from app.schemas import CategoryCreate, CategoryOut

router = APIRouter(prefix="/api/categories", tags=["Categories"])

PALETTE = ["#E5C79B", "#9EF7F7", "#E598E5", "#A3E28C", "#F7B267", "#8AB6F9", "#FF8FA3"]

@router.get("", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    stmt = select(Category).where(Category.owner_id == current_user.id).order_by(Category.id.asc())
    return db.execute(stmt).scalars().all()

@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = db.execute(
        select(Category).where(
            Category.owner_id == current_user.id,
            Category.name.ilike(data.name.strip())
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Такая категория уже есть")

    count = len(db.execute(select(Category).where(Category.owner_id == current_user.id)).scalars().all())
    color = PALETTE[count % len(PALETTE)]

    category = Category(name=data.name.strip(), color=color, owner_id=current_user.id)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category

@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    category = db.execute(
        select(Category).where(Category.id == category_id, Category.owner_id == current_user.id)
    ).scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    db.delete(category)
    db.commit()