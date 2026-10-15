"""Read generated alpha components into UV metadata; never rewrite image pixels."""
import argparse
import hashlib
import json
from collections import deque
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument("character", choices=["star-moon", "scholar"])
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
image_path = root / "public" / "characters" / args.character / "fingers-v1.png"
image = Image.open(image_path).convert("RGBA")
width, height = image.size
mask = bytearray(255 if alpha >= 224 else 0 for alpha in image.getchannel("A").tobytes())
components = []
for start in range(len(mask)):
    if not mask[start]:
        continue
    queue = deque([start]); mask[start] = 0
    x0 = x1 = start % width; y0 = y1 = start // width; area = 0
    while queue:
        point = queue.popleft(); x = point % width; y = point // width; area += 1
        x0 = min(x0, x); x1 = max(x1, x); y0 = min(y0, y); y1 = max(y1, y)
        for neighbor in ([point - 1] if x else []) + ([point + 1] if x < width - 1 else []) + ([point - width] if y else []) + ([point + width] if y < height - 1 else []):
            if mask[neighbor]:
                mask[neighbor] = 0; queue.append(neighbor)
    if area >= 1500 and x1 - x0 > 25 and y1 - y0 > 70:
        components.append({"bounds": [max(0, x0 - 2), max(0, y0 - 2), min(width, x1 + 3), min(height, y1 + 3)], "area": area})

parts = {}
names = ["palm", "thumb", "index", "middle", "ring", "little"]
for row, prefix in [(0, "left"), (1, "right")]:
    regions = [component for component in components if (sum(component["bounds"][1::2]) / 2 >= height / 2) == bool(row)]
    regions.sort(key=lambda component: sum(component["bounds"][::2]))
    if len(regions) != 6:
        raise ValueError(f"Expected six independent parts in row {row}: {regions}")
    for name, component in zip(names, regions):
        x0, y0, x1, y1 = component["bounds"]
        parts[f"{prefix}-{name}"] = [0, 0, x0 / width, y0 / height, (x1 - x0) / width, (y1 - y0) / height]

manifest_path = image_path.with_name("manifest.json")
manifest = json.loads(manifest_path.read_text(encoding="utf-8-sig"))
manifest["fingerAtlas"] = {"atlas": f"/characters/{args.character}/fingers-v1.png", "grid": [1, 1], "parts": parts}
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"character": args.character, "size": image.size, "parts": len(parts), "sha256": hashlib.sha256(image_path.read_bytes()).hexdigest()}))
