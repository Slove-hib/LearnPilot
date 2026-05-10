import time
from rate_limit import check_rate_limit, _store


def test_rate_limit_allows_within_limit():
    _store.clear()
    for i in range(5):
        check_rate_limit("test_key_ok", limit=10, window=60)
    assert len(_store["test_key_ok"]) == 5


def test_rate_limit_blocks_over_limit():
    _store.clear()
    for i in range(3):
        check_rate_limit("test_key_block", limit=3, window=60)

    try:
        check_rate_limit("test_key_block", limit=3, window=60)
        assert False, "Should have raised 429"
    except Exception as e:
        assert e.status_code == 429


def test_rate_limit_resets_after_window():
    _store.clear()
    # Use a very short window
    for i in range(2):
        check_rate_limit("test_key_reset", limit=2, window=0.1)

    # Wait for window to expire
    time.sleep(0.15)

    # Should work again
    check_rate_limit("test_key_reset", limit=2, window=0.1)
    assert len(_store["test_key_reset"]) == 1
