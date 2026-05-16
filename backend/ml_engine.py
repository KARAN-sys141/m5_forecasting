import pandas as pd
import numpy as np
import lightgbm as lgb
import joblib
import os
import time

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, 'models')

model = None
encoders = None
history_df = None

def load_artifacts():
    global model, encoders, history_df
    print("Loading ML Artifacts into RAM...")
    model = joblib.load(os.path.join(MODEL_DIR, 'lgbm_forecaster.pkl'))
    encoders = joblib.load(os.path.join(MODEL_DIR, 'target_encoders.pkl'))
    history_df = pd.read_parquet(os.path.join(MODEL_DIR, 'recent_history.parquet'))
    print("ML Engine Ready & Artifacts Loaded Successfully!")

def predict_sales(store_id: str, item_id: str):
    start_time = time.time()
    
    item_history = history_df[(history_df['store_id'] == store_id) & (history_df['item_id'] == item_id)].copy()
    
    if item_history.empty:
        return {"error": f"Item {item_id} at Store {store_id} not found in recent history."}
    
    item_history.sort_values('d', inplace=True)
    
    last_day = item_history['d'].max()
    next_day = last_day + 1
    
    try:
        lag_7 = item_history[item_history['d'] == next_day - 7]['sales'].values[0]
        lag_28 = item_history[item_history['d'] == next_day - 28]['sales'].values[0]
        
        rolling_7 = item_history[item_history['d'] > last_day - 7]['sales'].mean()
        rolling_28 = item_history[item_history['d'] > last_day - 28]['sales'].mean()
        
        current_price = item_history[item_history['d'] == last_day]['sell_price'].values[0]
        price_7_days_ago = item_history[item_history['d'] == next_day - 7]['sell_price'].values[0]
        price_change = (current_price / price_7_days_ago) - 1 if price_7_days_ago > 0 else 0
        
        last_14_sales = item_history[item_history['d'] > last_day - 14]['sales'].sum()
        is_stockout = 1 if last_14_sales == 0 else 0
        
    except IndexError:
        return {"error": "Not enough historical data (minimum 28 days required) to calculate lag features."}
    
    enc_mean = encoders.get(store_id, {}).get(item_id, {}).get('mean', 0)
    enc_std = encoders.get(store_id, {}).get(item_id, {}).get('std', 0)
    
    dept_id = item_id.rsplit('_', 1)[0]
    wday, month = 1, 5
    
    features = pd.DataFrame([{
        'item_id': item_id, 'dept_id': dept_id, 'store_id': store_id, 
        'wday': wday, 'month': month, 'lag_7': lag_7, 'lag_28': lag_28, 
        'rolling_mean_7': rolling_7, 'rolling_mean_28': rolling_28,
        'price_change': price_change, 'sell_price_scaled': current_price / 10.0, 
        'is_stockout': is_stockout, 'enc_store_item_mean': enc_mean, 'enc_store_item_std': enc_std
    }])
    
    for col in ['item_id', 'dept_id', 'store_id', 'wday', 'month']:
        features[col] = features[col].astype('category')
        
    pred = model.predict(features)[0]
    pred = max(0, float(pred))
    
    latency = round((time.time() - start_time) * 1000, 2)
    
    trend_dates = ["d_" + str(d) for d in item_history['d'].tail(14).tolist()]
    trend_sales = item_history['sales'].tail(14).tolist()
    
    return {
        "store_id": store_id,
        "item_id": item_id,
        "forecast_date": f"d_{next_day}",
        "predicted_sales": round(pred, 2),
        "latency_ms": latency,
        "trend_dates": trend_dates,
        "trend_sales": trend_sales
    }