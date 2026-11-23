"""Configuration tests for MediVoice AI"""

def test_config_import():
    """Test that configuration loads correctly"""
    from config import APP_NAME, DEFAULT_LLM_PROVIDER, WHISPER_MODEL_SIZE
    assert APP_NAME == "MediVoice AI"
    assert DEFAULT_LLM_PROVIDER in ["openai", "gemini"]
    assert WHISPER_MODEL_SIZE in ["tiny", "base", "small", "medium", "large"]
    print("✓ Config test passed")

def test_env_example():
    """Test that .env.example exists and has required fields"""
    import os
    assert os.path.exists(".env.example"), ".env.example must exist"
    with open(".env.example") as f:
        content = f.read()
    required_keys = ["OPENAI_API_KEY", "GEMINI_API_KEY", "SECRET_KEY", "POSTGRES_DB"]
    for key in required_keys:
        assert key in content, f".env.example must contain {key}"
    print("✓ Env example test passed")
