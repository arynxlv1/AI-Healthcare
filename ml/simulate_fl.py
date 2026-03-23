import numpy as np
import redis
import json
import time

# Simulation parameters
REDIS_URL = "redis://localhost:6379"

def publish_update(hospital_id: str, round_num: int, accuracy: float, epsilon: float):
    r = redis.from_url(REDIS_URL)
    event = {
        "type": "round_update",
        "round": round_num,
        "accuracy": accuracy,
        "epsilon": epsilon,
        "latency": np.random.randint(50, 150)
    }
    # Publish to global and hospital-specific channels
    r.publish("fl_updates_global", json.dumps(event))
    r.publish(f"fl_updates_{hospital_id}", json.dumps(event))

def run_simulation():
    print("Starting Federated Learning Simulation with Live Updates...")
    
    current_accuracy = 0.60
    current_epsilon = 0.1
    
    for r_num in range(1, 11):
        print(f"--- Round {r_num} ---")
        time.sleep(2) # Simulate training time
        
        current_accuracy += np.random.uniform(0.02, 0.05)
        current_accuracy = min(current_accuracy, 0.96)
        current_epsilon += 0.04
        
        # In this simulation, we'll blast updates for 3 main test hospitals
        for h_id in ["HOSP_001", "HOSP_002", "HOSP_003"]:
            publish_update(h_id, r_num, current_accuracy, current_epsilon)
            
        print(f"Round {r_num} complete. Accuracy: {current_accuracy:.2f}")

if __name__ == "__main__":
    # We'll just run our custom simulator if called directly
    run_simulation()
