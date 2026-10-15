"""Publish the approved v9 single-cat deck as lightweight application assets."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source', type=Path, help='Approved delivery directory containing cards.json and mobile/*.jpg')
SOURCE = parser.parse_args().source.resolve()
if not (SOURCE / 'cards.json').is_file():
    parser.error('Source must contain cards.json; generation files are not bundled with the application.')
TARGET = ROOT / 'public/cards/skins/quqi-v9'
BASE_URL = '/cards/skins/quqi-v9/'

cards = json.loads((SOURCE / 'cards.json').read_text(encoding='utf-8'))
faces = [card for card in cards if card['stem'] != 'back']
app_cards = json.loads((ROOT / 'src/data/tarot_cards_merged_zh.json').read_text(encoding='utf-8'))['cards']
assert len(faces) == 78 and {card['id'] for card in faces} == {card['id'] for card in app_cards}
assets = sorted((SOURCE / 'mobile').glob('*.jpg'))
assert len(assets) == 79 and {path.stem for path in assets} == {card['stem'] for card in faces} | {'back'}
TARGET.mkdir(parents=True, exist_ok=True)
hashes = {}
for source in assets:
    destination = TARGET / source.name
    shutil.copyfile(source, destination)
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    assert hashlib.sha256(destination.read_bytes()).hexdigest() == digest
    hashes[source.name] = digest
manifest = {
    'id': 'quqi', 'name': '曲奇皮肤', 'version': 'v9-fifteen-remake-single-cat-v1',
    'format': 'jpg', 'width': 828, 'height': 1428, 'cardCount': 78,
    'cardBackImageUrl': BASE_URL + 'back.jpg',
    'cards': {card['id']: BASE_URL + card['stem'] + '.jpg' for card in faces},
}
text = json.dumps(manifest, ensure_ascii=False, indent=2) + '\n'
(TARGET / 'manifest.json').write_text(text, encoding='utf-8')
(ROOT / 'src/data/quqiSkin.json').write_text(text, encoding='utf-8')
(TARGET / 'checksums.json').write_text(json.dumps(hashes, indent=2) + '\n', encoding='utf-8')
print(f'Published {len(assets)} verified JPG assets: 78 faces and 1 back. W05 uses approved original v9 artwork.')
