from datetime import date
from typing import Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.deps import get_current_user
from app.models import Category, Expense, User
from app.schemas import CategoryStat, DashboardStats, ExpenseCreate, ExpenseOut, ExpenseUpdate

router = APIRouter(prefix="/api/expenses", tags=["Expenses"])

@router.get("/stats", response_model=DashboardStats)
def get_stats(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    #сумма расходов и доходов за какой-то период
    base_filter = [Expense.owner_id == current_user.id]
    if date_from:
        base_filter.append(Expense.spent_date >= date_from)
    if date_to:
        base_filter.append(Expense.spent_date <= date_to)

    totals_stmt = (
        select(Expense.is_income, func.coalesce(func.sum(Expense.amount), 0.0))
        .where(*base_filter)
        .group_by(Expense.is_income)
    )
    totals_rows = db.execute(totals_stmt).all()
    total_income = 0.0
    total_expense = 0.0
    for is_inc, val in totals_rows:
        if is_inc:
            total_income = float(val)
        else:
            total_expense = float(val)

    #группировка расходов
    cat_stmt = (
        select(
            func.coalesce(Category.name, "Без категории").label("cat_name"),
            func.coalesce(Category.color, "#8E8E8E").label("cat_color"),
            func.sum(Expense.amount).label("cat_total"),
        )
        .outerjoin(Category, Expense.category_id == Category.id)
        .where(*base_filter, Expense.is_income == False)
        .group_by(Category.id, Category.name, Category.color)
        .order_by(func.sum(Expense.amount).desc())
    )
    cat_rows = db.execute(cat_stmt).all()

    by_category = []
    for row in cat_rows:
        pct = round((row.cat_total / total_expense) * 100, 1) if total_expense > 0 else 0.0
        by_category.append(
            CategoryStat(
                category_name=row.cat_name,
                color=row.cat_color,
                total=round(float(row.cat_total), 2),
                percentage=pct
            )
        )

    return DashboardStats(
        total_income=round(total_income, 2),
        total_expense=round(total_expense, 2),
        balance=round(total_income - total_expense, 2),
        by_category=by_category
    )

@router.get("", response_model=list[ExpenseOut])
def list_expenses(
    search: Optional[str] = Query(None, description="Поиск по названию"),
    category_id: Optional[int] = Query(None, description="Фильтр по категории"),
    date_from: Optional[date] = Query(None, description="Дата от"),
    date_to: Optional[date] = Query(None, description="Дата до"),
    sort_by: Literal["date_desc", "date_asc", "amount_desc", "amount_asc"] = "date_desc",
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = (
        select(Expense)
        .options(joinedload(Expense.category))
        .where(Expense.owner_id == current_user.id)
    )

    if search:
        stmt = stmt.where(Expense.title.ilike(f"%{search.strip()}%"))
    if category_id is not None:
        stmt = stmt.where(Expense.category_id == category_id)
    if date_from:
        stmt = stmt.where(Expense.spent_date >= date_from)
    if date_to:
        stmt = stmt.where(Expense.spent_date <= date_to)

    order_map = {
        "date_desc": (Expense.spent_date.desc(), Expense.id.desc()),
        "date_asc": (Expense.spent_date.asc(), Expense.id.asc()),
        "amount_desc": (Expense.amount.desc(), Expense.id.desc()),
        "amount_asc": (Expense.amount.asc(), Expense.id.asc()),
    }
    stmt = stmt.order_by(*order_map[sort_by]).limit(limit).offset(offset)
    return db.execute(stmt).scalars().all()

@router.get("/{expense_id}", response_model=ExpenseOut)
def get_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    expense = db.execute(
        select(Expense)
        .options(joinedload(Expense.category))
        .where(Expense.id == expense_id, Expense.owner_id == current_user.id)
    ).scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    return expense

@router.post("", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if data.category_id is not None:
        cat = db.execute(
            select(Category).where(Category.id == data.category_id, Category.owner_id == current_user.id)
        ).scalar_one_or_none()
        if not cat:
            raise HTTPException(status_code=404, detail="Выбранная категория не найдена")

    expense = Expense(
        title=data.title.strip(),
        amount=data.amount,
        spent_date=data.spent_date,
        comment=data.comment.strip() if data.comment else None,
        is_income=data.is_income,
        category_id=data.category_id,
        owner_id=current_user.id
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return get_expense(expense.id, db, current_user)

@router.patch("/{expense_id}", response_model=ExpenseOut)
def update_expense(
    expense_id: int,
    data: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    expense = db.execute(
        select(Expense).where(Expense.id == expense_id, Expense.owner_id == current_user.id)
    ).scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Запись не найдена")

    update_data = data.model_dump(exclude_unset=True)
    if "category_id" in update_data and update_data["category_id"] is not None:
        cat = db.execute(
            select(Category).where(Category.id == update_data["category_id"], Category.owner_id == current_user.id)
        ).scalar_one_or_none()
        if not cat:
            raise HTTPException(status_code=404, detail="Категория не найдена")

    for field, value in update_data.items():
        setattr(expense, field, value)

    db.commit()
    return get_expense(expense.id, db, current_user)

@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    expense = db.execute(
        select(Expense).where(Expense.id == expense_id, Expense.owner_id == current_user.id)
    ).scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    db.delete(expense)
    db.commit()