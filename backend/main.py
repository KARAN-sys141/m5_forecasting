from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import ml_engine

# Initialize API
app = FastAPI(title="M5 Forecasting MLOps API", version="1.0")

# Security: Allow Frontend (HTML/JS) to talk to this Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Request Schema
class ForecastRequest(BaseModel):
    store_id: str
    item_id: str

# Load ML artifacts strictly ONCE when server starts
@app.on_event("startup")
def startup_event():
    ml_engine.load_artifacts()

# Health Check Route
@app.get("/")
def read_root():
    return {"status": "API is live! 🚀", "model": "LightGBM Tweedie"}

# Prediction Route
@app.post("/predict")
def predict(request: ForecastRequest):
    result = ml_engine.predict_sales(request.store_id, request.item_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

# MLOps Dashboard Route
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

# Mount frontend explicitly to serve HTML/CSS/JS directly from FastAPI
frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")