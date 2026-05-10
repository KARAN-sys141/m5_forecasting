import mlflow
import joblib
import lightgbm as lgb
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'lgbm_forecaster.pkl')

def register_model_to_mlflow():
    print("🚀 Initializing MLflow Registry...")
    # Setup local MLflow tracking
    mlflow.set_tracking_uri("sqlite:///mlflow.db")
    mlflow.set_experiment("M5_Demand_Forecasting")
    
    with mlflow.start_run(run_name="Production_LGBM_Tweedie"):
        # Log parameters (jo humne Optuna se nikale the)
        mlflow.log_params({
            "n_estimators": 99,
            "learning_rate": 0.091,
            "max_depth": 6,
            "objective": "tweedie"
        })
        
        # Log Model Metrics (Tumhare actual dashboard wale)
        mlflow.log_metrics({
            "RMSSE": 0.6172,
            "R2": 0.598,
            "Asymmetric_Cost": 1.55
        })
        
        # Load and Log the actual model
        model = joblib.load(MODEL_PATH)
        mlflow.lightgbm.log_model(model, "lgbm_model", registered_model_name="M5_Forecaster_V1")
        
        print("✅ Model successfully registered in MLflow!")

if __name__ == "__main__":
    register_model_to_mlflow()