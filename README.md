# Violator · dataviz interactiva

**[Ver la infografía interactiva](https://javicanton.github.io/violator-dataviz/)**

Visualización de datos sobre *Violator* (1990), el álbum que consagró a Depeche Mode en todo el mundo. Es la versión interactiva de una infografía estática que publiqué en 2022.

La metáfora visual es la rosa de la portada:

- **Cada hoja es una canción.** Las hojas grandes son las nueve canciones del disco; las pequeñas, las caras B de sus cuatro sencillos.
- **Dentro de cada hoja, un gráfico de radar** con seis atributos sonoros de Spotify: bailabilidad, valencia (positividad), energía, expresión (presencia de voz hablada), instrumentalidad y acústica. Junto a cada hoja figuran la duración, el tempo y el tono.
- **El tallo está hecho con las formas de onda** de las canciones, una detrás de otra, en el orden del disco.
- **La rosa** resume el conjunto con la media de todas las pistas.

En esta versión se puede escuchar cada canción pulsando su hoja o su tramo del tallo, que funciona como barra de reproducción. También se pueden consultar los valores exactos, comparar cada canción con la media, explorar el disco atributo por atributo y ver dónde se grabó.

## Cómo se hizo

Los datos proceden de la API de Spotify, descargados con R y el paquete `spotifyr`. Las formas de onda se generaron con WaveFormer, los radares originales con Flourish y la composición final se montó en Adobe Illustrator. La versión web está hecha con D3 y el reproductor incrustado de Spotify.

El proceso completo está contado en mi web:

- [Artículo en español](https://javiercanton.com/2022/03/05/dataviz-violator-depeche-mode-spanish/)
- [Article in English](https://javiercanton.com/2022/03/05/violator-depeche-mode-dataviz-english/)

---

## In English

An interactive data visualization of *Violator* (1990), the album that established Depeche Mode worldwide. It is the interactive version of a static infographic I published in 2022.

The visual metaphor is the rose from the album cover. Each leaf is a song (large leaves for the nine album tracks, small ones for the B-sides of its four singles) and holds a radar chart with six Spotify audio features: danceability, valence, energy, speechiness, instrumentalness and acousticness. The stem is built from the songs' audio waveforms, and it works as the playback bar: click a leaf or a section of the stem to listen.

Data comes from the Spotify API (R and `spotifyr`), waveforms from WaveFormer, the original radar charts from Flourish, and the final layout was assembled in Adobe Illustrator. The web version uses D3 and the Spotify embedded player.

---

Datos: Spotify API y Wikipedia. *Violator* es una obra de Depeche Mode (Mute Records, 1990); portada de Anton Corbijn y Area.

Javi Cantón-Correa · [javiercanton.com](https://javiercanton.com)
