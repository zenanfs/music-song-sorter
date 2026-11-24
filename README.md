# Retro Music Song Sorters

Colección de páginas web clásicas estilo retro (inspiradas en `rhcpsorter.neocities.org` / `charasort`) para enfrentar canciones **1 vs 1** y armar tu ranking personal, con filtros por álbum, exclusión de lados B/conciertos/remixes/unplugged, guardado automático, enlace compartible y descarga de imagen PNG.

## Bandas incluidas
- **Twenty One Pilots** (`TwentyOnePilotsSorter/`) — 177 pistas de Kworb Spotify + 5 exclusivas de *Regional at Best* (182 totales, 99 por defecto).
- **The Beatles** (`TheBeatlesSorter/`) — 500 pistas de Kworb Spotify + *Her Majesty* (501 totales, 200 canciones canónicas sin duplicados por defecto).

## Cómo publicarlo gratis para que cualquiera juegue desde cualquier PC o celular

### Opción 1: GitHub Pages (Recomendada — URL permanente y gratis)
1. Crea un repositorio público en GitHub (por ejemplo `music-song-sorters`).
2. Sube esta carpeta:
   ```bash
   cd ~/Musica
   git remote add origin https://github.com/<tu-usuario>/music-song-sorters.git
   git push -u origin main
   ```
3. En GitHub ve a **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` (`/ (root)`) → Save**.
4. En ~1 minuto quedará publicado en `https://<tu-usuario>.github.io/music-song-sorters/` listo para compartir con cualquier persona.

### Opción 2: Netlify Drop (Sin comandos — 10 segundos)
1. Entra a https://app.netlify.com/drop
2. Arrastra la carpeta `/home/zfernandez/Musica` directamente a la página.
3. Obtendrás al instante un enlace público `https://...netlify.app/` para compartir.

### Opción 3: Neocities (igual que `rhcpsorter.neocities.org`)
1. Crea una cuenta gratis en https://neocities.org/
2. Sube los archivos y carpetas desde el panel de Neocities.
