import json, os, gen

def test_remote_filters():
    repos = [
        {"name": "live-one", "private": False, "has_pages": True, "pushed_at": "2026-11-01T00:00:00Z", "description": "From API"},
        {"name": "secret", "private": True, "has_pages": True, "pushed_at": "2026-11-02T00:00:00Z", "description": ""},
        {"name": "no-pages", "private": False, "has_pages": False, "pushed_at": "2026-11-02T00:00:00Z", "description": ""},
        {"name": "piyaster11.github.io", "private": False, "has_pages": True, "pushed_at": "2026-11-02T00:00:00Z", "description": ""},
        {"name": "my-sites", "private": False, "has_pages": True, "pushed_at": "2026-11-02T00:00:00Z", "description": ""},
        {"name": "hidden", "private": False, "has_pages": True, "pushed_at": "2026-11-02T00:00:00Z", "description": ""},
        {"name": "down", "private": False, "has_pages": True, "pushed_at": "2026-11-02T00:00:00Z", "description": ""},
    ]
    def fetch(url):
        if url.endswith("/down/"):
            raise OSError("down")
        return "<title>Live title</title>"
    out = gen.remote_sites(repos, {"hidden": {"hide": True}, "live-one": {"cat": "Tools", "emoji": "🔧"}}, fetch, lambda path: False)
    assert [x["repo"] for x in out] == ["live-one"]
    assert out[0]["title"] == "Live title"
    assert out[0]["cat"] == "Tools"
    assert out[0]["desc"] == "From API"
    assert out[0]["url"] == "https://piyaster11.github.io/live-one/"
    assert out[0]["thumb"] == ""

def test_local_and_merge():
    meta = {"invoice-match": {"title": "Invoice Match · sample test", "th": "ตัวอย่าง", "cat": "Business", "emoji": "🧾", "desc": "Sample"}, "gone": {"hide": True}}
    items = [
        {"repo": "invoice-match", "url": "https://piyaster11.github.io/invoice-match/", "path": "invoice-match", "pushed": "2026-11-08T03:00:00Z"},
        {"repo": "gone", "url": "https://piyaster11.github.io/gone/", "path": "gone", "pushed": "2026-11-09T00:00:00Z"},
        {"repo": "missing", "url": "https://piyaster11.github.io/missing/", "path": "missing", "pushed": "2026-11-09T00:00:00Z"},
        {"url": "https://example.invalid/"},
        "nope",
    ]
    def exists(path):
        return path == os.path.join("invoice-match", "index.html") or path == "thumbs/invoice-match.jpg"
    local = gen.local_entries(items, meta, exists, exists)
    assert [x["repo"] for x in local] == ["invoice-match"]
    assert local[0]["thumb"] == "thumbs/invoice-match.jpg"
    assert local[0]["title"] == "Invoice Match · sample test"
    remote = [
        {"repo": "older", "url": "https://piyaster11.github.io/older/", "title": "Older", "th": "", "cat": "Other", "emoji": "🌐", "desc": "", "thumb": "", "pushed": "2026-11-01T00:00:00Z"},
        {"repo": "invoice-match", "url": "https://piyaster11.github.io/invoice-match/", "title": "Remote wins", "th": "", "cat": "Other", "emoji": "🌐", "desc": "", "thumb": "", "pushed": "2026-11-08T03:00:00Z"},
    ]
    merged = gen.merge_sites(remote, local)
    assert [x["repo"] for x in merged] == ["invoice-match", "older"]
    assert merged[0]["title"] == "Remote wins"
    fresh = gen.merge_sites(remote[:1], local)
    assert [x["repo"] for x in fresh] == ["invoice-match", "older"]

def test_checked_in_launcher():
    sites = json.load(open("sites.json", encoding="utf-8"))
    card = next(s for s in sites if s["repo"] == "invoice-match")
    assert card["url"] == "https://piyaster11.github.io/invoice-match/"
    assert card["cat"] == "Business"
    assert card["thumb"] == "thumbs/invoice-match.jpg"
    meta = json.load(open("meta.json", encoding="utf-8"))
    assert meta["invoice-match"]["title"] == card["title"]
    pinned = json.load(open("local-sites.json", encoding="utf-8"))
    assert pinned[0]["path"] == "invoice-match"
    assert os.path.exists("invoice-match/index.html")
    real = gen.local_entries(pinned, meta, os.path.exists, os.path.exists)
    assert real[0]["url"] == card["url"]
    assert real[0]["thumb"] == "thumbs/invoice-match.jpg"
    assert os.path.exists(card["thumb"])
    home = open("index.html", encoding="utf-8").read()
    assert 'fetch("sites.json?' in home
    page = open("invoice-match/index.html", encoding="utf-8").read() + open("invoice-match/match-rules.js", encoding="utf-8").read()
    for needle in ["THB 12,840.00", "THB 10,860.50", "THB 10,272.00", "THB 8,560.00", "1.50%", "not proof of payment", "never approves"]:
        assert needle in page, needle
    import re
    assert not re.search(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", page)
    assert not re.search(r"\b\d{13}\b", page)
    assert "malee" not in page.lower()
    assert "bank" not in page.lower()

if __name__ == "__main__":
    test_remote_filters()
    test_local_and_merge()
    test_checked_in_launcher()
    print("gen: local card preserved and remote filters unchanged")
