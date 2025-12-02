from pydantic import BaseModel
from typing import Optional, List

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None

class ProductOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price: float
    image_path: Optional[str] = None
    embedding: Optional[List[float]] = None

    class Config:
        from_attributes = True

