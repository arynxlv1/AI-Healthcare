import flwr as fl
from typing import List, Tuple, Dict, Optional
import numpy as np

class CustomFedAvg(fl.server.strategy.FedAvg):
    def aggregate_evaluate(
        self,
        server_round: int,
        results: List[Tuple[fl.server.client_proxy.ClientProxy, fl.common.EvaluateRes]],
        failures: List[BaseException],
    ) -> Tuple[Optional[fl.common.Scalar], Dict[str, fl.common.Scalar]]:
        """Aggregate evaluation metrics using weighted average."""
        if not results:
            return None, {}
        
        # Standard weighted average for accuracy
        accuracies = [res.metrics["accuracy"] * res.num_examples for _, res in results]
        examples = [res.num_examples for _, res in results]
        
        aggregated_accuracy = sum(accuracies) / sum(examples)
        print(f"Round {server_round} accuracy: {aggregated_accuracy}")
        
        # Call parent to get standard loss aggregation
        loss, _ = super().aggregate_evaluate(server_round, results, failures)
        
        return loss, {"accuracy": aggregated_accuracy}

def start_server():
    # Senior Dev Requirement: Fault tolerance (min_available_clients)
    strategy = CustomFedAvg(
        fraction_fit=1.0,
        min_fit_clients=2,
        min_available_clients=2, # Minimum hospitals needed to start a round
        min_evaluate_clients=2,
    )

    print("Starting Flower Aggregation Server...")
    fl.server.start_server(
        server_address="0.0.0.0:8080",
        config=fl.server.ServerConfig(num_rounds=10),
        strategy=strategy,
    )

if __name__ == "__main__":
    start_server()
