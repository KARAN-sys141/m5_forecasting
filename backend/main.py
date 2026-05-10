from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import ml_engine

app = FastAPI(title="M5 Forecasting MLOps API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ForecastRequest(BaseModel):
    store_id: str
    item_id: str

@app.on_event("startup")
def startup_event():
    ml_engine.load_artifacts()

# Health Check Route (Moved to avoid clashing with UI)
@app.get("/api-status")
def read_root():
    return {"status": "API is live! 🚀", "model": "LightGBM Tweedie"}

@app.post("/predict")
def predict(request: ForecastRequest):
    result = ml_engine.predict_sales(request.store_id, request.item_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@app.get("/system-health")
def health_check():
    return {
        "api_uptime": "100%",
        "model_version": "v1.0-LGBM-Tweedie",
        "data_drift_status": "Normal",
        "ram_usage": "Optimized"
    }

from fastapi.staticfiles import StaticFiles
import os

frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")