from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from arc_api.config import Settings
from arc_api.main import create_app


@pytest.fixture
def internal_token() -> str:
    return "test-internal-token-value"


@pytest.fixture
def client(internal_token: str) -> Iterator[TestClient]:
    app = create_app(
        Settings(
            internal_api_token=internal_token,
            cors_origins=("http://testserver",),
        )
    )
    with TestClient(app) as test_client:
        yield test_client
