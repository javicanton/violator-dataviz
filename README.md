# Violator · infografía interactiva

Versión web de la infografía de 2022 sobre *Violator* (Depeche Mode). HTML + D3, sin proceso de compilación.

## Estructura

- `index.html`, `css/`, `js/`: la página. `js/main.js` dibuja todo; `js/i18n.js` contiene los textos de interfaz ES/EN.
- `data/violator.json`: datos de las 15 pistas (atributos de Spotify, duración, tempo, tono y picos de la forma de onda). Se genera con `scripts/build_data.py`.
- `data/texts.json`: texto explicativo de cada canción en ES y EN. Se edita a mano.
- `assets/art.svg`: rosa, hojas, título, mapa e iconos extraídos del `.ai` original.
- `js/vendor/d3.min.js`: D3 7.9.0 (licencia ISC).

## Verla en local

La página carga los datos con `fetch`, así que necesita un servidor (no funciona abriendo el archivo con doble clic):

```
python3 -m http.server 8000
```

Y abrir http://localhost:8000

## Publicar en GitHub Pages

En el repositorio: Settings → Pages → Source "Deploy from a branch" → rama `main`, carpeta `/ (root)`.

## Regenerar los datos

Los ficheros fuente (`dm.xlsx` y los 15 SVG de forma de onda) no están en el repositorio. El script los busca en la carpeta que contiene a esta:

```
python3 scripts/build_data.py
```

## Enlaces directos

Cada pista tiene su ancla, por ejemplo `#personal-jesus`. El idioma se puede forzar con `?lang=es` o `?lang=en`.
