import os
import shutil
from pathlib import Path
import pytest

TEST_DATA_DIR = Path(__file__).parent / "test_data"
os.environ["AUTITIC_DATA_DIR"] = str(TEST_DATA_DIR)
os.environ["AUTITIC_USE_OPENVINO_IMAGE"] = "0"

@pytest.fixture(scope="session", autouse=True)
def isolated_test_db():
    if TEST_DATA_DIR.exists():
        shutil.rmtree(TEST_DATA_DIR, ignore_errors=True)
    TEST_DATA_DIR.mkdir(parents=True, exist_ok=True)
    yield
    if TEST_DATA_DIR.exists():
        shutil.rmtree(TEST_DATA_DIR, ignore_errors=True)
