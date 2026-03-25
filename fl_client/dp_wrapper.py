"""
Differential Privacy wrapper using Opacus.

Wraps a model + optimizer + data_loader with Opacus PrivacyEngine
and exposes helpers for epsilon accounting.
"""
from dataclasses import dataclass
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torch.optim import Optimizer


@dataclass
class DPConfig:
    noise_multiplier: float = 1.1   # Controls noise added to gradients
    max_grad_norm: float = 1.0      # Gradient clipping bound
    delta: float = 1e-5             # Target δ for (ε, δ)-DP


class DPWrapper:
    """
    Wraps a PyTorch model with Opacus differential privacy.

    Usage:
        wrapper = DPWrapper(config)
        model, optimizer, train_loader = wrapper.make_private(model, optimizer, train_loader)
        # ... train normally ...
        epsilon = wrapper.get_epsilon()
    """

    def __init__(self, config: DPConfig | None = None):
        self.config = config or DPConfig()
        self._privacy_engine = None

    def make_private(
        self,
        model: nn.Module,
        optimizer: Optimizer,
        data_loader: DataLoader,
    ) -> tuple[nn.Module, Optimizer, DataLoader]:
        """Attach Opacus PrivacyEngine and return the wrapped objects."""
        try:
            from opacus import PrivacyEngine
        except ImportError:
            print("[DP] Opacus not installed — running WITHOUT differential privacy.")
            return model, optimizer, data_loader

        self._privacy_engine = PrivacyEngine()
        model, optimizer, data_loader = self._privacy_engine.make_private(
            module=model,
            optimizer=optimizer,
            data_loader=data_loader,
            noise_multiplier=self.config.noise_multiplier,
            max_grad_norm=self.config.max_grad_norm,
        )
        print(
            f"[DP] Privacy engine attached — "
            f"noise_multiplier={self.config.noise_multiplier}, "
            f"max_grad_norm={self.config.max_grad_norm}"
        )
        return model, optimizer, data_loader

    def get_epsilon(self) -> float:
        """Return the privacy budget consumed so far (ε)."""
        if self._privacy_engine is None:
            return 0.0
        return self._privacy_engine.get_epsilon(delta=self.config.delta)

    @property
    def is_active(self) -> bool:
        return self._privacy_engine is not None
