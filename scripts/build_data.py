#!/usr/bin/env python3
"""Genera data/violator.json a partir de dm.xlsx y de los SVG de forma de onda.
Los ficheros fuente (dm.xlsx y los 15 SVG) no se suben al repositorio: el script los busca
en la carpeta que contiene a esta (la carpeta de trabajo original del proyecto).
Uso: python3 scripts/build_data.py"""
import json, re, glob, os, openpyxl

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # carpeta del sitio (el repositorio)
ROOT = os.path.dirname(SITE)                                         # carpeta con dm.xlsx y los SVG de onda
ALBUM = "Violator (2006 Remaster)"   # edicion usada en la infografia de 2022
N_PEAKS = 400
FEATURES = ["danceability", "energy", "speechiness", "acousticness", "instrumentalness", "valence"]

# Datos editoriales que no vienen de Spotify (tomados de la infografia original)
# n: orden en el Excel -> (id, tipo, cara B de, tempo percibido, fecha single UK, fichero de onda)
EDIT = {
    1:  ("world-in-my-eyes", "album", None, 122, "1990-09-17", "01"),
    2:  ("sweetest-perfection", "album", None, 102, None, "02"),
    3:  ("personal-jesus", "album", None, 130, "1989-08-29", "03"),
    4:  ("halo", "album", None, 112, None, "04"),
    5:  ("waiting-for-the-night", "album", None, 91, None, "05"),
    6:  ("enjoy-the-silence", "album", None, 113, "1990-02-05", "06"),
    7:  ("policy-of-truth", "album", None, 114, "1990-05-07", "07"),
    8:  ("blue-dress", "album", None, 63, None, "08"),
    9:  ("clean", "album", None, 92, None, "09"),
    10: ("dangerous", "bside", "personal-jesus", 105, None, "10"),
    11: ("memphisto", "bside", "enjoy-the-silence", 110, None, "15"),
    12: ("sibeling", "bside", "enjoy-the-silence", 68, None, "14"),
    13: ("kaleid", "bside", "policy-of-truth", 110, None, "12"),
    14: ("happiest-girl", "bside", "world-in-my-eyes", 118, None, "11"),
    15: ("sea-of-sin", "bside", "world-in-my-eyes", 125, None, "13"),
}
HIDDEN = {"enjoy-the-silence": "Interlude #2 (Crucified)", "blue-dress": "Interlude #3"}

def peaks(prefix):
    path = glob.glob(os.path.join(ROOT, prefix + " *.svg"))[0]
    svg = open(path, encoding="utf-8").read()
    amps = [abs(float(b) - float(a)) / 2 for a, b in
            re.findall(r'd=" M \S+ (\S+) L \S+ (\S+)"', svg)]
    out = []
    for i in range(N_PEAKS):
        lo, hi = i * len(amps) // N_PEAKS, max((i + 1) * len(amps) // N_PEAKS, i * len(amps) // N_PEAKS + 1)
        out.append(max(amps[lo:hi]))
    return out, len(amps), os.path.basename(path)

ws = openpyxl.load_workbook(os.path.join(ROOT, "dm.xlsx"), data_only=True).active
rows = list(ws.iter_rows(values_only=True))
head = rows[0]
recs = [dict(zip(head, r)) for r in rows[1:] if r[head.index("album_name")] == ALBUM]

tracks, gmax = [], 0
for r in sorted(recs, key=lambda r: r["track_number"]):
    tid, kind, bside_of, bpm, single, wave = EDIT[r["track_number"]]
    pk, nbars, fname = peaks(wave)
    gmax = max(gmax, max(pk))
    ms = r["duration_ms"]
    sec = round(ms / 1000)  # redondeo, como en la infografia original
    tracks.append({
        "id": tid, "n": r["track_number"] if kind == "album" else None,
        "title": r["track_name"].strip(), "type": kind, "bside_of": bside_of,
        "duration_ms": ms, "duration": f"{sec // 60}:{sec % 60:02d}",
        "bpm": bpm, "tempo_spotify": round(r["tempo"], 1),
        "key": r["key_mode"], "single_uk": single, "hidden_track": HIDDEN.get(tid),
        "features": {f: r[f] for f in FEATURES},
        "spotify_id": r["track_id"], "spotify_uri": r["track_uri"],
        "wave_source": fname, "peaks": pk,
    })
for t in tracks:  # misma escala para todas: se conserva el volumen relativo entre canciones
    t["peaks"] = [round(p / gmax, 3) for p in t["peaks"]]

data = {
    "album": {
        "title": "Violator", "artist": "Depeche Mode", "release": "1990-03-19",
        "edition": ALBUM, "duration": "46:58", "sales": "+7.500.000",
        # el radar de la rosa del original es la media de las 15 pistas (9 del disco + 6 caras B)
        "features_mean": {f: round(sum(t["features"][f] for t in tracks) / len(tracks), 3) for f in FEATURES},
    },
    "features": FEATURES,
    "tracks": tracks,
}
out = os.path.join(SITE, "data", "violator.json")
json.dump(data, open(out, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("OK", out, os.path.getsize(out), "bytes")
for t in tracks:
    print(f'{t["n"] or "B":>2} {t["title"]:<26} {t["duration"]} {t["bpm"]:>3} {t["key"]:<9} {t["wave_source"]:<30} max={max(t["peaks"])}')
print(data["album"]["features_mean"])
