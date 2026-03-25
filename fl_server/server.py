"""
Flower aggregation server.

Run with:
    python -m fl_server.server

Requires at least MIN_CLIENTS hospital clients to connect before a round starts.
After each round, the global model is saved to the registry and exported to ONNX.
"""
import flwr as fl
from fl_server.strategy import PrivacyAwareFedAvg
from fl_server.model_registry import save_global_weights, export_to_onnx
from fl_server.privacy import PrivacyBudget

MIN_CLIENTS = 2
NUM_ROUNDS = 10
MAX_EPSILON = 10.0  # Hard privacy budget cap

privacy_budget = PrivacyBudget(max_epsilon=MAX_EPSILON)


def get_on_fit_config(server_round: int):
    """Send per-round config to clients."""
    return {"server_round": server_round, "local_epochs": 3}


def get_evaluate_fn(privacy: PrivacyBudget):
    """
    Server-side evaluation callback — runs after each aggregation round.
    Saves weights, exports ONNX, and enforces the privacy budget.
    """
    def evaluate(server_round: int, parameters, config):
        import numpy as np
        weights = [np.array(p) for p in parameters]
        save_global_weights(weights, server_round)
        export_to_onnx(server_round)

        # Record epsilon from strategy metrics (passed via config)
        epsilon = config.get("max_epsilon", 0.0)
        privacy.record_round(server_round, epsilon)

        if privacy.is_budget_exhausted():
            print(f"[Server] Privacy budget exhausted after round {server_round}. Stopping.")

        summary = privacy.summary()
        return 0.0, summary  # loss=0 (server has no eval dataset), metrics=privacy summary

    return evaluate


def start_server(host: str = "0.0.0.0", port: int = 8080):
    strategy = PrivacyAwareFedAvg(
        min_clients=MIN_CLIENTS,
        on_fit_config_fn=get_on_fit_config,
        evaluate_fn=get_evaluate_fn(privacy_budget),
    )

    print(f"[Server] Starting Flower server on {host}:{port}")
    print(f"[Server] Waiting for {MIN_CLIENTS} clients, running {NUM_ROUNDS} rounds.")
    print(f"[Server] Privacy budget: ε ≤ {MAX_EPSILON}, δ = {privacy_budget.delta}")

    fl.server.start_server(
        server_address=f"{host}:{port}",
        config=fl.server.ServerConfig(num_rounds=NUM_ROUNDS),
        strategy=strategy,
    )


if __name__ == "__main__":
    start_server()
