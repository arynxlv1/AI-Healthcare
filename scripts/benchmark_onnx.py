import onnxruntime as rt
import numpy as np
import time

def run_benchmark():
    model_path = "ml/model.onnx"
    try:
        sess = rt.InferenceSession(model_path, providers=['CPUExecutionProvider'])
    except Exception as e:
        print(f"Error loading model: {e}")
        return

    input_name = sess.get_inputs()[0].name
    input_shape = sess.get_inputs()[0].shape
    
    # 100 features as per model.py
    input_dim = 100
    dummy_input = np.random.randn(1, input_dim).astype(np.float32)

    # Warmup
    for _ in range(10):
        sess.run(None, {input_name: dummy_input})

    # Benchmark
    latencies = []
    for _ in range(100):
        start = time.time()
        sess.run(None, {input_name: dummy_input})
        latencies.append((time.time() - start) * 1000)

    median_latency = np.median(latencies)
    print(f"ONNX Latency Benchmark (ml/model.onnx)")
    print(f"Median Latency: {median_latency:.2f} ms")
    print(f"Minimum Latency: {np.min(latencies):.2f} ms")
    print(f"Maximum Latency: {np.max(latencies):.2f} ms")
    
    if median_latency < 100:
        print("Verdict: Performance is within Stage 1 threshold (<100ms).")
    else:
        print("Verdict: Performance exceeds Stage 1 threshold. Documenting Phi-3 fallback.")

if __name__ == "__main__":
    run_benchmark()
