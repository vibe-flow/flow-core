#!/usr/bin/env bash
# Génère les icônes PNG d'une PWA à partir d'un SVG, sans rien installer.
#
# macOS n'a ni rsvg-convert ni ImageMagick par défaut, et les installer pour
# trois images est disproportionné. Chrome, lui, est déjà là et rend le SVG
# exactement comme le navigateur qui affichera l'app.
#
#   ./make-icons.sh apps/web/public/icon.svg apps/web/public
#
# Produit icon-512.png, icon-192.png (manifeste) et apple-touch-icon.png (iOS,
# qui ignore le manifeste et va chercher ce nom précis).
#
# Chrome ne rend QUE le 512. Headless impose une taille de fenêtre minimale :
# une capture en 192 ou 180 sort rognée (un coin de l'image, ou l'image coupée
# en deux), quelle que soit la façon dont le SVG est dimensionné. Les petites
# tailles sont donc dérivées du 512 par réduction — sips sur macOS, ImageMagick
# ailleurs.
set -euo pipefail

svg="${1:?usage: make-icons.sh <source.svg> <dossier-de-sortie>}"
out="${2:?usage: make-icons.sh <source.svg> <dossier-de-sortie>}"

if [[ -z "${CHROME:-}" ]]; then
  for c in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
           google-chrome google-chrome-stable chromium chromium-browser; do
    if command -v "$c" >/dev/null 2>&1; then CHROME="$(command -v "$c")"; break; fi
  done
fi
chrome="${CHROME:-}"

[[ -f "$svg" ]] || { echo "SVG introuvable : $svg" >&2; exit 1; }
[[ -n "$chrome" && -x "$chrome" ]] || { echo "Chrome introuvable — définir CHROME=<chemin>" >&2; exit 1; }

# Chrome exige un chemin absolu pour file://
abs_svg="$(cd "$(dirname "$svg")" && pwd)/$(basename "$svg")"
mkdir -p "$out"

"$chrome" --headless --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=512,512 \
  --screenshot="$out/icon-512.png" "file://$abs_svg" >/dev/null 2>&1
echo "→ $out/icon-512.png (512px, Chrome)"

reduire() { # taille fichier
  if command -v sips >/dev/null 2>&1; then
    sips -z "$1" "$1" "$out/icon-512.png" --out "$out/$2" >/dev/null
  elif command -v magick >/dev/null 2>&1; then
    magick "$out/icon-512.png" -resize "${1}x${1}" "$out/$2"
  elif command -v convert >/dev/null 2>&1; then
    convert "$out/icon-512.png" -resize "${1}x${1}" "$out/$2"
  else
    echo "Ni sips ni ImageMagick : impossible de dériver $2 (${1}px)." >&2
    echo "Installer ImageMagick (apt install imagemagick) et relancer." >&2
    echo "Ne PAS rendre cette taille avec Chrome : elle sortirait rognée." >&2
    exit 1
  fi
  echo "→ $out/$2 (${1}px, réduit du 512)"
}

reduire 192 icon-192.png
reduire 180 apple-touch-icon.png

echo "✓ Icônes générées. Vérifiez-les à l'œil : un glyphe trop petit dans son"
echo "  carré se voit tout de suite, et c'est l'image de l'app sur un écran"
echo "  d'accueil pendant des années."
