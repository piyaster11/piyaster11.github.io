# Regenerates sites.json from the GitHub API (repos with Pages enabled, public, live 200)
# and keeps local pages listed in local-sites.json (folders on this user site).
import json, os, re, urllib.request

U = "piyaster11"
T = os.environ.get("GH_TOKEN", "")

def get(u, raw=False):
    h = {"User-Agent": "my-sites"}
    if T and "api.github.com" in u:
        h["Authorization"] = "Bearer " + T
    r = urllib.request.urlopen(urllib.request.Request(u, headers=h), timeout=30)
    return r.read() if raw else json.load(r)

def repo_title(html, fallback):
    t = re.search(r"<title>(.*?)</title>", html, re.S)
    return t.group(1).strip() if t else fallback

def remote_sites(repos, meta, fetch_html, thumb_exists):
    out = []
    for r in repos:
        n = r["name"]
        if r["private"] or not r.get("has_pages") or n.lower() == f"{U}.github.io".lower() or n == "my-sites":
            continue
        url = f"https://{U}.github.io/{n}/"
        try:
            html = fetch_html(url)
        except Exception:
            continue
        m = meta.get(n, {})
        if m.get("hide"):
            continue
        out.append({
            "repo": n,
            "url": url,
            "title": m.get("title", repo_title(html, n)),
            "th": m.get("th", ""),
            "cat": m.get("cat", "Other"),
            "emoji": m.get("emoji", "🌐"),
            "desc": m.get("desc") or r.get("description") or "",
            "thumb": f"thumbs/{n}.jpg" if thumb_exists(f"thumbs/{n}.jpg") else "",
            "pushed": r["pushed_at"],
        })
    return out

def local_entries(items, meta, index_exists, thumb_exists):
    out = []
    if not isinstance(items, list):
        return out
    for item in items:
        if not isinstance(item, dict):
            continue
        n = item.get("repo")
        url = item.get("url")
        if not n or not url:
            continue
        folder = item.get("path") or n
        if not index_exists(os.path.join(folder, "index.html")):
            continue
        m = meta.get(n, {})
        if m.get("hide"):
            continue
        out.append({
            "repo": n,
            "url": url,
            "title": m.get("title", item.get("title", n)),
            "th": m.get("th", ""),
            "cat": m.get("cat", "Other"),
            "emoji": m.get("emoji", "🌐"),
            "desc": m.get("desc") or item.get("desc") or "",
            "thumb": f"thumbs/{n}.jpg" if thumb_exists(f"thumbs/{n}.jpg") else "",
            "pushed": item.get("pushed") or "",
        })
    return out

def merge_sites(remote, local):
    seen = {x["repo"] for x in remote}
    combined = list(remote)
    for item in local:
        if item["repo"] in seen:
            continue
        combined.append(item)
        seen.add(item["repo"])
    combined.sort(key=lambda x: x.get("pushed") or "", reverse=True)
    return combined

def main():
    meta = json.load(open("meta.json", encoding="utf-8"))
    repos = get(f"https://api.github.com/users/{U}/repos?per_page=100&sort=pushed")
    remote = remote_sites(
        repos,
        meta,
        lambda url: get(url, True).decode("utf-8", "ignore"),
        os.path.exists,
    )
    local = []
    if os.path.exists("local-sites.json"):
        local = local_entries(
            json.load(open("local-sites.json", encoding="utf-8")),
            meta,
            os.path.exists,
            os.path.exists,
        )
    out = merge_sites(remote, local)
    with open("sites.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(len(out), "sites")

if __name__ == "__main__":
    main()
