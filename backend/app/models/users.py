from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from sqlmodel import Field, Relationship, SQLModel

# Forward references를 위한 TYPE_CHECKING
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from . import User, Product, Order, CartItem, Wishlist, Review

# Product 관련 모델
class ProductBase(SQLModel):
    name: str
    description: Optional[str] = None
    price: float
    stock: int = 0
    image_url: Optional[str] = None

class Product(ProductBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    user_email: EmailStr = Field(foreign_key='user.email')
    # Relationships
    user: Optional["User"] = Relationship(back_populates="products")
    cart_items: List["CartItem"] = Relationship(back_populates="product")
    wishlists: List["Wishlist"] = Relationship(back_populates="product")
    reviews: List["Review"] = Relationship(back_populates="product")

# CartItem 관련 모델
class CartItemBase(SQLModel):
    product_id: int
    quantity: int = 1

class CartItem(CartItemBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key='product.id')
    user_email: EmailStr = Field(foreign_key='user.email')
    # Relationships
    user: Optional["User"] = Relationship(back_populates="cart_items")
    product: Optional["Product"] = Relationship(back_populates="cart_items")

# Wishlist 모델
class Wishlist(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_email: EmailStr = Field(foreign_key='user.email')
    product_id: int = Field(foreign_key='product.id')
    created_at: datetime = Field(default_factory=datetime.utcnow)
    # Relationships
    user: Optional["User"] = Relationship(back_populates="wishlists")
    product: Optional["Product"] = Relationship(back_populates="wishlists")

# Order 관련 모델
class OrderBase(SQLModel):
    order_id: str = Field(unique=True, index=True)
    total_price: float
    status: str = "pending"
    buyer_name: str
    buyer_email: str
    buyer_tel: str
    zipcode: Optional[str] = None
    address: Optional[str] = None
    address_detail: Optional[str] = None
    receipt_id: Optional[str] = None
    payment_method: Optional[str] = None

class Order(OrderBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_email: EmailStr = Field(foreign_key='user.email')
    created_at: datetime = Field(default_factory=datetime.utcnow)
    paid_at: Optional[datetime] = None
    # Relationships
    user: Optional["User"] = Relationship(back_populates="orders")
    order_items: List["OrderItem"] = Relationship(back_populates="order")

class OrderItemBase(SQLModel):
    product_id: int
    quantity: int
    price: float

class OrderItem(OrderItemBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key='order.id')
    # Relationships
    order: Optional["Order"] = Relationship(back_populates="order_items")

# Review 관련 모델 (새로 추가)
class ReviewBase(SQLModel):
    product_id: int
    rating: int = Field(ge=1, le=5)  # 1-5점
    content: str
    
class Review(ReviewBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_email: EmailStr = Field(foreign_key='user.email')
    product_id: int = Field(foreign_key='product.id')
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: Optional["User"] = Relationship(back_populates="reviews")
    product: Optional["Product"] = Relationship(back_populates="reviews")

# Q&A 관련 모델 (Order 모델 뒤에 추가)
class QnABase(SQLModel):
    title: str
    content: str
    is_answered: bool = False
    is_private: bool = False

class QnA(QnABase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_email: EmailStr = Field(foreign_key='user.email')
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    # Relationships
    user: Optional["User"] = Relationship(back_populates="qnas")
    answer: Optional["QnAAnswer"] = Relationship(back_populates="question")

class QnAAnswerBase(SQLModel):
    content: str

class QnAAnswer(QnAAnswerBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    qna_id: int = Field(foreign_key='qna.id', unique=True)
    admin_email: EmailStr = Field(foreign_key='user.email')
    created_at: datetime = Field(default_factory=datetime.utcnow)
    # Relationships
    question: Optional["QnA"] = Relationship(back_populates="answer")
    admin: Optional["User"] = Relationship()

# User 관련 모델 - 맨 마지막에 정의
class User(SQLModel, table=True):
    email: EmailStr = Field(primary_key=True)
    username: str
    password: Optional[str] = None
    is_admin: bool = False
    # Relationships
    products: List["Product"] = Relationship(back_populates="user")
    cart_items: List["CartItem"] = Relationship(back_populates="user")
    orders: List["Order"] = Relationship(back_populates="user")
    wishlists: List["Wishlist"] = Relationship(back_populates="user")
    qnas: List["QnA"] = Relationship(back_populates="user")
    reviews: List["Review"] = Relationship(back_populates="user")

# API 요청/응답 모델
class UserSignup(BaseModel):
    email: EmailStr
    username: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class GoogleSignup(BaseModel):
    email: EmailStr
    username: str
    exp: int

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    is_admin: bool
    username: str

# Review 응답 모델
class ReviewResponse(BaseModel):
    id: int
    user_name: str
    rating: int
    content: str
    created_at: datetime