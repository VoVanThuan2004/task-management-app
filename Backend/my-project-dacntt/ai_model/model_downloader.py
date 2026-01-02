"""
Utilities to download models from Hugging Face Hub (Cached)
"""

from huggingface_hub import hf_hub_download
import os

# HF Repos
PRIORITY_MODEL_REPO = "kerodat2004/task-priority-model"
CHATBOT_MODEL_REPO = "kerodat2004/chatbot-intent-model"

def get_model_path(repo_id: str, filename: str):
    """
    Get path to model file from Hugging Face Cache
    (Downloads automatically if not in cache)
    """
    try:
        print(f"Resolving {filename} from Hugging Face ({repo_id})...")
        # local_dir=None to use system cache (~/.cache/huggingface)
        cached_path = hf_hub_download(
            repo_id=repo_id,
            filename=filename
        )
        print(f"Model path: {cached_path}")
        return cached_path
    
    except Exception as e:
        print(f"Error resolving {filename}: {e}")
        return None

def get_priority_model_path():
    """Get path for Priority Model"""
    return get_model_path(
        repo_id=PRIORITY_MODEL_REPO,
        filename="task_priority_model.pkl"
    )

def get_chatbot_model_path():
    """Get path for Chatbot Model"""
    return get_model_path(
        repo_id=CHATBOT_MODEL_REPO,
        filename="intent_model.joblib"
    )
