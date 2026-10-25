
import json
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import urlparse

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_FILE = BASE_DIR / "news.json"
MAX_NEWS = 30
TIMEOUT = 25

FEEDS = [
    (
        "Federal Reserve",
        "https://www.federalreserve.gov/feeds/press_all.xml",
    ),
    (
        "BLS",
        "https://www.bls.gov/feed/bls_latest.rss",
    ),
    (
        "EIA",
        "https://www.eia.gov/rss/todayinenergy.xml",
    ),
    (
        "ECB",
        "https://www.ecb.europa.eu/rss/press.html",
    ),
]

NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "content": "http://purl.org/rss/1.0/modules/content/",
    "dc": "http://purl.org/dc/elements/1.1/",
}


def clean_text(value):
    if value is None:
        return ""
    return " ".join(str(value).split()).strip()


def child_text(element, names):
    for name in names:
        node = element.find(name)
        if node is not None:
            value = clean_text(node.text)
            if value:
                return value
    return ""


def get_atom_link(element):
    for node in element.findall("atom:link", NS):
        href = clean_text(node.attrib.get("href", ""))
        rel = node.attrib.get("rel", "alternate")
        if href and rel in ("alternate", ""):
            return href
    return ""


def parse_date(value):
    value = clean_text(value)
    if not value:
        return ""

    try:
        dt = parsedate_to_datetime(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat()
    except (TypeError, ValueError, OverflowError):
        pass

    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat()
    except (TypeError, ValueError, OverflowError):
        return ""


def valid_url(url):
    try:
        parsed = urlparse(url)
        return parsed.scheme in ("http", "https") and bool(parsed.netloc)
    except ValueError:
        return False


def parse_feed(root, source):
    items = []

    # RSS 2.0 and RSS-like feeds
    for node in root.findall(".//item"):
        title = child_text(node, ["title"])
        link = child_text(node, ["link"])
        published = child_text(
            node,
            [
                "pubDate",
                "dc:date",
                "{http://purl.org/dc/elements/1.1/}date",
                "published",
                "updated",
            ],
        )

        if title and valid_url(link):
            items.append({
                "title": title,
                "url": link,
                "source": source,
                "published": parse_date(published),
            })

    # Atom feeds
    for node in root.findall(".//atom:entry", NS):
        title = child_text(node, ["atom:title"])
        link = get_atom_link(node)
        published = child_text(
            node,
            ["atom:published", "atom:updated"],
        )

        if title and valid_url(link):
            items.append({
                "title": title,
                "url": link,
                "source": source,
                "published": parse_date(published),
            })

    return items


def load_previous_items():
    if not OUTPUT_FILE.exists():
        return []

    try:
        with OUTPUT_FILE.open("r", encoding="utf-8") as file:
            data = json.load(file)
        items = data.get("items", [])
        return items if isinstance(items, list) else []
    except (OSError, json.JSONDecodeError):
        return []


def fetch_feed(source, url):
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "AMMAR-MARKET-PULSE/1.1",
            "Accept": (
                "application/rss+xml, application/atom+xml, "
                "application/xml, text/xml, */*"
            ),
        },
    )

    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        content = response.read()

    root = ET.fromstring(content)
    items = parse_feed(root, source)

    print(f"{source}: retrieved {len(items)} headlines")
    return items


def main():
    all_items = []

    for source, url in FEEDS:
        try:
            all_items.extend(fetch_feed(source, url))
        except Exception as exc:
            print(f"Feed failed: {source}: {exc}")

    # Keep previous news if all feeds temporarily fail.
    if not all_items:
        previous = load_previous_items()
        if previous:
            print("All feeds failed; keeping previous news.json.")
            return

    # Remove duplicate links.
    unique = {}
    for item in all_items:
        url = item.get("url", "").strip()
        title = clean_text(item.get("title", ""))

        if not title or not valid_url(url):
            continue

        key = url.rstrip("/").lower()
        if key not in unique:
            item["title"] = title
            unique[key] = item

    items = list(unique.values())

    # Sort newest first; entries without dates go last.
    items.sort(
        key=lambda item: item.get("published") or "",
        reverse=True,
    )

    data = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "items": items[:MAX_NEWS],
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    temporary_file = OUTPUT_FILE.with_suffix(".tmp")
    with temporary_file.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
        file.write("\n")

    temporary_file.replace(OUTPUT_FILE)

    print(f"Saved {len(data['items'])} unique news items.")
    print(f"Output file: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
