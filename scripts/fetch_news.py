
import json
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

FEEDS = [
    ("Federal Reserve", "https://www.federalreserve.gov/feeds/press_all.xml"),
    ("BLS", "https://www.bls.gov/feed/bls_latest.rss"),
    ("EIA", "https://www.eia.gov/rss/todayinenergy.xml"),
    ("ECB", "https://www.ecb.europa.eu/rss/press.html"),
]

def text_of(element, name):
    node = element.find(name)
    return (node.text or "").strip() if node is not None else ""

def main():
    items = []
    for source, url in FEEDS:
        try:
            request = urllib.request.Request(
                url, headers={"User-Agent": "AMMAR-MARKET-PULSE/1.0"}
            )
            with urllib.request.urlopen(request, timeout=20) as response:
                root = ET.fromstring(response.read())

            for node in root.findall(".//item"):
                title = text_of(node, "title")
                link = text_of(node, "link")
                pub = text_of(node, "pubDate")
                if not title or not link:
                    continue

                try:
                    published = parsedate_to_datetime(pub).isoformat() if pub else ""
                except (TypeError, ValueError):
                    published = pub

                items.append({
                    "title": title,
                    "url": link,
                    "source": source,
                    "published": published,
                })
        except Exception as exc:
            print(f"Feed failed: {source}: {exc}")

    items.sort(key=lambda x: x["published"], reverse=True)
    data = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "items": items[:30],
    }
    with open("news.json", "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)

    print(f"Saved {len(data['items'])} news items.")

if __name__ == "__main__":
    main()
