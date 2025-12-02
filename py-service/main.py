from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import os
import shutil
from io import BytesIO
from PIL import Image
from transformers import CLIPModel, CLIPProcessor
from datetime import datetime
import torch
import uvicorn
from .db import SessionLocal, Base, engine
from .models import Product
from .schemas import ProductCreate, ProductUpdate, ProductOut

app = FastAPI()
uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


model_id = "openai/clip-vit-base-patch32"
_model = None
_processor = None

async def get_components():
    global _model, _processor
    if _model is None:
        _processor = CLIPProcessor.from_pretrained(model_id)
        _model = CLIPModel.from_pretrained(model_id)
        _model.eval()
    return _model, _processor

@app.get("/datetime")
def get_datetime():
    return {"datetime": datetime.utcnow().isoformat() + "Z"}

@app.post("/embed")
async def embed(image: UploadFile = File(...)):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="unsupported media type")
    data = await image.read()
    if not data:
        raise HTTPException(status_code=400, detail="image file is required")
    try:
        img = Image.open(BytesIO(data)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="invalid image")

    model, processor = await get_components()
    inputs = processor(images=img, return_tensors="pt")
    with torch.no_grad():
        feats = model.get_image_features(**inputs)
    feats = feats / feats.norm(dim=-1, keepdim=True)
    embedding = feats.squeeze(0).cpu().numpy().tolist()
    return {"embedding": embedding, "dims": len(embedding), "model": model_id}

@app.post("/products", response_model=ProductOut)
async def create_product(payload: ProductCreate = Depends(), image: UploadFile = File(...), db: Session = Depends(get_db)):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="unsupported media type")
    tmp_path = os.path.join(uploads_dir, image.filename)
    with open(tmp_path, "wb") as f:
        shutil.copyfileobj(image.file, f)
    img = Image.open(tmp_path).convert("RGB")
    model, processor = await get_components()
    inputs = processor(images=img, return_tensors="pt")
    with torch.no_grad():
        feats = model.get_image_features(**inputs)
    feats = feats / feats.norm(dim=-1, keepdim=True)
    embedding = feats.squeeze(0).cpu().numpy().tolist()
    item = Product(name=payload.name, description=payload.description, price=payload.price, image_path=tmp_path, embedding=embedding)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@app.get("/products", response_model=list[ProductOut])
def list_products(db: Session = Depends(get_db)):
    return db.query(Product).order_by(Product.id.asc()).all()

@app.get("/products/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    item = db.get(Product, product_id)
    if not item:
        raise HTTPException(status_code=404, detail="not found")
    return item

@app.put("/products/{product_id}", response_model=ProductOut)
async def update_product(product_id: int, payload: ProductUpdate = Depends(), image: UploadFile | None = File(None), db: Session = Depends(get_db)):
    item = db.get(Product, product_id)
    if not item:
        raise HTTPException(status_code=404, detail="not found")
    if payload.name is not None:
        item.name = payload.name
    if payload.description is not None:
        item.description = payload.description
    if payload.price is not None:
        item.price = payload.price
    if image is not None:
        if image.content_type and not image.content_type.startswith("image/"):
            raise HTTPException(status_code=415, detail="unsupported media type")
        tmp_path = os.path.join(uploads_dir, image.filename)
        with open(tmp_path, "wb") as f:
            shutil.copyfileobj(image.file, f)
        if item.image_path and os.path.exists(item.image_path):
            try:
                os.remove(item.image_path)
            except Exception:
                pass
        img = Image.open(tmp_path).convert("RGB")
        model, processor = await get_components()
        inputs = processor(images=img, return_tensors="pt")
        with torch.no_grad():
            feats = model.get_image_features(**inputs)
        feats = feats / feats.norm(dim=-1, keepdim=True)
        embedding = feats.squeeze(0).cpu().numpy().tolist()
        item.image_path = tmp_path
        item.embedding = embedding
    db.commit()
    db.refresh(item)
    return item

@app.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    item = db.get(Product, product_id)
    if not item:
        raise HTTPException(status_code=404, detail="not found")
    if item.image_path and os.path.exists(item.image_path):
        try:
            os.remove(item.image_path)
        except Exception:
            pass
    db.delete(item)
    db.commit()
    return {"ok": True}

def cosine(a, b):
    dot = 0.0
    na = 0.0
    nb = 0.0
    m = min(len(a), len(b))
    for i in range(m):
        dot += a[i]*b[i]
        na += a[i]*a[i]
        nb += b[i]*b[i]
    import math
    return dot / (math.sqrt(na) * math.sqrt(nb) or 1.0)

@app.post("/search/image")
async def search_image(image: UploadFile = File(...), db: Session = Depends(get_db)):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="unsupported media type")
    data = await image.read()
    img = Image.open(BytesIO(data)).convert("RGB")
    model, processor = await get_components()
    inputs = processor(images=img, return_tensors="pt")
    with torch.no_grad():
        feats = model.get_image_features(**inputs)
    feats = feats / feats.norm(dim=-1, keepdim=True)
    query_emb = feats.squeeze(0).cpu().numpy().tolist()
    items = db.query(Product).filter(Product.embedding.isnot(None)).all()
    scored = [{"id": p.id, "name": p.name, "score": cosine(query_emb, p.embedding or [])} for p in items]
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:5]

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
