from fastapi import FastAPI, UploadFile, File, HTTPException
from io import BytesIO
from PIL import Image
from transformers import CLIPModel, CLIPProcessor
from datetime import datetime
import torch
import uvicorn

app = FastAPI()

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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

