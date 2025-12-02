from sqlalchemy import Column, Integer, String, Text, Numeric
from sqlalchemy.dialects.postgresql import JSONB
from .db import Base

class Product(Base):
    __tablename__ = "Products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    price = Column(Numeric(10, 2), nullable=False, default=0)
    image_path = Column(String)
    embedding = Column(JSONB)

