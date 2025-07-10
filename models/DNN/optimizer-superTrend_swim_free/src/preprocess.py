import json
import numpy as np
from sklearn.model_selection import train_test_split

def load_data(json_path):
    with open(json_path, 'r') as f:
        data = json.load(f)
    X = np.array([d['features'] for d in data], dtype=np.float32)
    y = np.array([d['label'] for d in data], dtype=np.float32)
    return train_test_split(X, y, test_size=0.2, random_state=42)
