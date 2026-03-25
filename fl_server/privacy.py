"""
Server-side privacy accounting and enforcement.

Tracks cumulative epsilon across rounds and enforces a hard budget cap.
When the budget is exhausted, the server refuses to start new rounds.
"""
from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class PrivacyBudget:
    """
    Tracks (ε, δ)-DP budget consumption across FL rounds.

    Args:
        max_epsilon: Hard cap on total privacy budget. Training stops when exceeded.
        delta: The δ parameter (probability of privacy failure).
    """
    max_epsilon: float = 10.0
    delta: float = 1e-5
    _consumed: float = field(default=0.0, init=False, repr=False)
    _history: list[dict] = field(default_factory=list, init=False, repr=False)

    def record_round(self, round_num: int, epsilon: float) -> None:
        """Record epsilon consumed in a round (additive composition)."""
        self._consumed += epsilon
        self._history.append({
            "round": round_num,
            "round_epsilon": epsilon,
            "cumulative_epsilon": self._consumed,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        print(
            f"[Privacy] Round {round_num} — ε this round: {epsilon:.4f}, "
            f"cumulative ε: {self._consumed:.4f} / {self.max_epsilon}"
        )

    def is_budget_exhausted(self) -> bool:
        return self._consumed >= self.max_epsilon

    @property
    def remaining(self) -> float:
        return max(0.0, self.max_epsilon - self._consumed)

    @property
    def consumed(self) -> float:
        return self._consumed

    def summary(self) -> dict:
        return {
            "max_epsilon": self.max_epsilon,
            "consumed_epsilon": round(self._consumed, 4),
            "remaining_epsilon": round(self.remaining, 4),
            "delta": self.delta,
            "rounds_completed": len(self._history),
            "budget_exhausted": self.is_budget_exhausted(),
        }
