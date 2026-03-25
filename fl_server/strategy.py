"""
Custom FedAvg strategy with weighted accuracy aggregation and
epsilon (privacy budget) tracking across clients.
"""
from typing import List, Tuple, Dict, Optional, Union
import numpy as np
import flwr as fl
from flwr.common import Scalar, EvaluateRes, FitRes, Parameters, Metrics
from flwr.server.client_proxy import ClientProxy


class PrivacyAwareFedAvg(fl.server.strategy.FedAvg):
    """
    FedAvg extended with:
    - Weighted accuracy aggregation across hospitals
    - Per-round epsilon tracking (max across clients)
    - Minimum client enforcement for privacy guarantees
    """

    def __init__(self, min_clients: int = 2, **kwargs):
        super().__init__(
            fraction_fit=1.0,
            min_fit_clients=min_clients,
            min_available_clients=min_clients,
            min_evaluate_clients=min_clients,
            **kwargs,
        )
        self.round_metrics: list[dict] = []

    def aggregate_fit(
        self,
        server_round: int,
        results: List[Tuple[ClientProxy, FitRes]],
        failures: List[Union[Tuple[ClientProxy, FitRes], BaseException]],
    ) -> Tuple[Optional[Parameters], Dict[str, Scalar]]:
        """Aggregate model weights and track max epsilon across clients."""
        if failures:
            print(f"[Strategy] Round {server_round}: {len(failures)} client(s) failed.")

        aggregated_params, metrics = super().aggregate_fit(server_round, results, failures)

        # Track worst-case privacy budget (max epsilon across all clients)
        epsilons = [res.metrics.get("epsilon", 0.0) for _, res in results if res.metrics]
        max_epsilon = max(epsilons) if epsilons else 0.0
        print(f"[Strategy] Round {server_round} — max ε across clients: {max_epsilon:.4f}")

        return aggregated_params, {"max_epsilon": max_epsilon}

    def aggregate_evaluate(
        self,
        server_round: int,
        results: List[Tuple[ClientProxy, EvaluateRes]],
        failures: List[Union[Tuple[ClientProxy, EvaluateRes], BaseException]],
    ) -> Tuple[Optional[float], Dict[str, Scalar]]:
        """Weighted accuracy aggregation."""
        if not results:
            return None, {}

        total_examples = sum(res.num_examples for _, res in results)
        weighted_accuracy = sum(
            res.metrics.get("accuracy", 0.0) * res.num_examples
            for _, res in results
        ) / max(total_examples, 1)

        loss, _ = super().aggregate_evaluate(server_round, results, failures)

        self.round_metrics.append({
            "round": server_round,
            "accuracy": weighted_accuracy,
            "loss": loss,
            "clients": len(results),
        })
        print(f"[Strategy] Round {server_round} — accuracy: {weighted_accuracy:.4f}, loss: {loss}")

        return loss, {"accuracy": weighted_accuracy}
