# langgraph_state_patch.py
# Reference: langchain-ai/langgraph/state.py
# Contributed by Dipayan Dey (https://github.com/dipayandey1244)
# Solves recursive memory leakage in cyclic multi-agent graphs

class StateHistoryManager:
    def __init__(self, max_history_depth=100):
        self.max_history_depth = max_history_depth
        self.history = {}

    def update_state(self, current_state, updates):
        """
        Updates the cyclic state history. Truncates older history states 
        when max_history_depth is reached to prevent memory leakage 
        across highly repetitive cyclic loops.
        """
        for key, val in updates.items():
            if key not in current_state.history:
                current_state.history[key] = []
                
            # Truncate cyclic history to prevent memory/token buildup
            if len(current_state.history[key]) >= self.max_history_depth:
                current_state.history[key].pop(0)
                
            current_state.history[key].append(val)
            
        return current_state
