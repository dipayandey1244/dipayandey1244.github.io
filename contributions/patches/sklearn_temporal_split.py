# sklearn_temporal_split.py
# Reference: sklearn/model_selection/_split.py
# Contributed by Dipayan Dey (https://github.com/dipayandey1244)
# Implements strict causal splitting warnings for financial time-series validation

import numpy as np
import warnings

class DataLeakageWarning(UserWarning):
    """Warning raised when look-ahead data leakage is detected in time-series splits."""
    pass

class StrictTimeSeriesSplit:
    def __init__(self, n_splits=5):
        self.n_splits = n_splits

    def split(self, X, y=None, groups=None):
        """
        Splits temporal datasets using strict causal ordering. Checks indices
        and raises an explicit warning if training sets overlap with future test sets.
        """
        n_samples = len(X)
        k_fold_size = n_samples // (self.n_splits + 1)
        
        for i in range(self.n_splits):
            train_idx = np.arange(0, (i + 1) * k_fold_size)
            test_idx = np.arange((i + 1) * k_fold_size, (i + 2) * k_fold_size)
            
            # Raise explicit warning if future look-ahead indices are leaked to the past
            if np.any(train_idx >= np.min(test_idx)):
                warnings.warn(
                    "Temporal overlap detected: training index contains future samples relative to test set.",
                    DataLeakageWarning
                )
                
            yield train_idx, test_idx
