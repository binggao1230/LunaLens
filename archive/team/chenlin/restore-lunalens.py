from pathlib import Path
from hashlib import sha256
from zipfile import ZipFile
from io import BytesIO
import json

root = Path(__file__).resolve().parent
parts = ['lunalens.zip.part01', 'lunalens.zip.part02', 'lunalens.zip.part03', 'lunalens.zip.part04', 'lunalens.zip.part05', 'lunalens.zip.part06', 'lunalens.zip.part07', 'lunalens.zip.part08', 'lunalens.zip.part09', 'lunalens.zip.part10', 'lunalens.zip.part11', 'lunalens.zip.part12']
missing = [name for name in parts if not (root / name).is_file()]
if missing:
    raise SystemExit('Download these files into the same folder first: ' + ', '.join(missing))
data = b''.join((root / name).read_bytes() for name in parts)
if sha256(data).hexdigest() != '2d3cd26a1b18972b1060aa8222e1ff797af0e478bb9ef8e96c899e334b6ab011':
    raise SystemExit('Download verification failed. Check the part files.')
with ZipFile(BytesIO(data)) as archive:
    if archive.testzip() is not None:
        raise SystemExit('Archive verification failed.')
    archive.extractall(root)
manifest = json.loads((root / 'lunalens-files.json').read_text())
for name, expected in manifest.items():
    if sha256((root / 'lunalens' / name).read_bytes()).hexdigest() != expected['sha256']:
        raise SystemExit('File verification failed: ' + name)
print('LunaLens extracted and verified. Run:')
print('cd lunalens')
print('python3 tools/serve.py 8765')
print('Then open http://127.0.0.1:8765/')
