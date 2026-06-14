# pytorch_es_loss.py
# Contributed by Dipayan Dey (https://github.com/dipayandey1244)
# Implements a differentiable Expected Shortfall (ES) tail risk loss function for PyTorch

import torch
import torch.nn as nn

class ExpectedShortfallLoss(nn.Module):
    """
    Differentiable Expected Shortfall (ES) Loss module in PyTorch.
    Allows neural networks to optimize portfolio allocations or parameter targets 
    by penalizing losses exceeding the alpha-quantile Value at Risk (VaR).
    
    Args:
        alpha (float): Risk confidence level (e.g. 0.99 for Basel III).
        temp (float): Softmax/Sigmoid temperature parameter for smooth gradient flow.
    """
    def __init__(self, alpha=0.99, temp=0.1):
        super(ExpectedShortfallLoss, self).__init__()
        self.alpha = alpha
        self.temp = temp

    def forward(self, predictions, targets):
        # Loss represents negative return or model error parameters
        losses = targets - predictions
        
        # 1. Estimate Value at Risk (VaR) using differentiable quantile sort
        sorted_losses, _ = torch.sort(losses)
        n = losses.size(0)
        var_idx = int(self.alpha * n)
        var_idx = min(max(var_idx, 0), n - 1)
        var = sorted_losses[var_idx].detach() # Detach VaR threshold for stable gradients
        
        # 2. Differentiable Expected Shortfall approximation using sigmoid masking
        tail_mask = torch.sigmoid((losses - var) / self.temp)
        tail_losses = losses * tail_mask
        
        # Expected Shortfall is the conditional expectation of losses in the tail
        es = torch.sum(tail_losses) / (torch.sum(tail_mask) + 1e-8)
        
        return es
