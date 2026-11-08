# Regenerates sites.json from the GitHub API (repos with Pages enabled, public, live 200)
import json,os,re,urllib.request
U="piyaster11";T=os.environ.get("GH_TOKEN","")
def get(u,raw=False):
    h={"User-Agent":"my-sites"}
    if T and "api.github.com" in u: h["Authorization"]="Bearer "+T
    r=urllib.request.urlopen(urllib.request.Request(u,headers=h),timeout=30)
    return r.read() if raw else json.load(r)
meta=json.load(open("meta.json"));out=[]
for r in get(f"https://api.github.com/users/{U}/repos?per_page=100&sort=pushed"):
    n=r["name"]
    if r["private"] or not r.get("has_pages") or n.lower()==f"{U}.github.io".lower() or n=="my-sites": continue
    url=f"https://{U}.github.io/{n}/"
    try: html=get(url,True).decode("utf8","ignore")
    except Exception: continue
    t=re.search(r"<title>(.*?)</title>",html,re.S); t=t.group(1).strip() if t else n
    m=meta.get(n,{})
    if m.get("hide"): continue
    out.append({"repo":n,"url":url,"title":m.get("title",t),"th":m.get("th",""),"cat":m.get("cat","Other"),
      "emoji":m.get("emoji","🌐"),"desc":m.get("desc") or r.get("description") or "",
      "thumb":f"thumbs/{n}.jpg" if os.path.exists(f"thumbs/{n}.jpg") else "","pushed":r["pushed_at"]})
json.dump(out,open("sites.json","w"),ensure_ascii=False,indent=1);print(len(out),"sites")
