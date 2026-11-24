"""Parse external MusicXML fixtures using Python's standard XML library.

Test-only adapter: the shipped app still uses the browser DOMParser. This
script never fetches DTDs or uses an XML parser with external entity support.
"""
import json
import sys
import xml.etree.ElementTree as ET

def serialize(element):
    tag = element.tag.partition("}")[2] if "}" in element.tag else element.tag
    return {
        "tag": tag,
        "attrs": element.attrib,
        "text": element.text or "",
        "tail": element.tail or "",
        "children": [serialize(child) for child in element],
    }

try:
    root = ET.fromstring(sys.stdin.read())
    print(json.dumps(serialize(root), ensure_ascii=False))
except ET.ParseError as exc:
    print(f"Fixture XML parsing error: {exc}", file=sys.stderr)
    sys.exit(2)
