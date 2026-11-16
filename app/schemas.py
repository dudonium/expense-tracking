from datetime import date
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class UserAuth(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Логин от 3 до 50 символов")
    password: str = Field(..., min_length=4, max_length=100, description="Пароль от 4 символов")

class UserOut(BaseModel):
    id: int
    username: str
    model_config = ConfigDict(from_attributes=True)

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)

class CategoryOut(BaseModel):
    id: int
    name: str
    color: str
    model_config = ConfigDict(from_attributes=True)

class ExpenseCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    amount: float = Field(..., gt=0, description="Сумма должна быть больше 0")
    spent_date: date
    comment: Optional[str] = Field(None, max_length=500)
    is_income: bool = False
    category_id: Optional[int] = None

class ExpenseUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    amount: Optional[float] = Field(None, gt=0)
    spent_date: Optional[date] = None
    comment: Optional[str] = Field(None, max_length=500)
    is_income: Optional[bool] = None
    category_id: Optional[int] = None

class ExpenseOut(BaseModel):
    id: int
    title: str
    amount: float
    spent_date: date
    comment: Optional[str]
    is_income: bool
    category_id: Optional[int]
    category: Optional[CategoryOut] = None
    model_config = ConfigDict(from_attributes=True)

class CategoryStat(BaseModel):
    category_name: str
    color: str
    total: float
    percentage: float

class DashboardStats(BaseModel):
    total_income: float
    total_expense: float
    balance: float
    by_category: list[CategoryStat]