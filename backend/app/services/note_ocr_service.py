"""Reconnaissance du matricule et de la note sur une fiche standardisée.

Pipeline (100 % local, sans IA générative) :

    image → OpenCV (redressement, contraste, débruitage, binarisation)
          → détection de la zone de la fiche
          → segmentation des cases (grille) du matricule et de la note
          → EasyOCR case par case (liste de caractères restreinte)
          → reconstruction + validation

Contraintes du cahier des charges :
  * Matricule : 2 lettres majuscules + 6 chiffres  → ``^[A-Z]{2}[0-9]{6}$``
  * Note      : sur 20, jusqu'à 2 décimales (0, 5, 12, 17.5, 18.75, 20…)

Le module ne dépend d'EasyOCR qu'au premier appel (chargement paresseux du
modèle, coûteux) afin de ne pas ralentir le démarrage de l'application.
"""

from __future__ import annotations

import base64
import logging
import re
from dataclasses import dataclass, field
from threading import Lock

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# --- Règles métier ----------------------------------------------------------
MATRICULE_RE = re.compile(r"^[A-Z]{2}[0-9]{6}$")
MATRICULE_LEN = 8  # 2 lettres + 6 chiffres
NOTE_CELLS = 5  # [dizaine][unité][.][dixième][centième]
NOTE_DOT_INDEX = 2  # la 3ᵉ case est le séparateur décimal
LETTER_ALLOWLIST = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
DIGIT_ALLOWLIST = "0123456789"

# --- Moteur EasyOCR (singleton paresseux) -----------------------------------
_reader = None
_reader_lock = Lock()


def _get_reader():
    """Retourne l'instance EasyOCR (chargée une seule fois, thread-safe)."""
    global _reader
    if _reader is None:
        with _reader_lock:
            if _reader is None:
                import easyocr  # import local : évite le coût au boot

                logger.info("Chargement du modèle EasyOCR (première utilisation)…")
                _reader = easyocr.Reader(["en"], gpu=False, verbose=False)
    return _reader


# --- Structures -------------------------------------------------------------
@dataclass
class Cell:
    """Case détectée dans la grille (coordonnées dans l'image redressée)."""

    x: int
    y: int
    w: int
    h: int

    @property
    def cx(self) -> int:
        return self.x + self.w // 2

    @property
    def cy(self) -> int:
        return self.y + self.h // 2

    @property
    def area(self) -> int:
        return self.w * self.h


@dataclass
class OcrResult:
    """Résultat brut de la reconnaissance."""

    matricule: str | None = None
    note: float | None = None
    matricule_valid: bool = False
    note_valid: bool = False
    matricule_confidence: float | None = None
    note_confidence: float | None = None
    preview_png_b64: str | None = None
    warnings: list[str] = field(default_factory=list)


class NoteOCRError(Exception):
    """Erreur métier de reconnaissance (image illisible, format inattendu…)."""


# ---------------------------------------------------------------------------
# Étape 1 — Décodage & prétraitement OpenCV
# ---------------------------------------------------------------------------
def decode_image(image_bytes: bytes) -> np.ndarray:
    """Décode des octets (JPEG/PNG) en image BGR OpenCV."""
    if not image_bytes:
        raise NoteOCRError("Image vide.")
    buf = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(buf, cv2.IMREAD_COLOR)
    if img is None:
        raise NoteOCRError("Format d'image non reconnu ou fichier corrompu.")
    return img


def _resize_max(img: np.ndarray, max_side: int = 1600) -> np.ndarray:
    """Réduit l'image si un côté dépasse ``max_side`` (accélère l'OCR)."""
    h, w = img.shape[:2]
    scale = max_side / float(max(h, w))
    if scale < 1.0:
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    return img


def correct_perspective(img: np.ndarray) -> np.ndarray:
    """Détecte la feuille (plus grand quadrilatère) et corrige la perspective.

    Si aucun quadrilatère plausible n'est trouvé, l'image est renvoyée telle
    quelle (le reste du pipeline reste fonctionnel).
    """
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(gray, 50, 150)
    edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=1)

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return img

    page = max(contours, key=cv2.contourArea)
    if cv2.contourArea(page) < 0.25 * h * w:
        # La feuille occupe moins d'un quart de l'image : on ne recadre pas.
        return img

    peri = cv2.arcLength(page, True)
    approx = cv2.approxPolyDP(page, 0.02 * peri, True)
    if len(approx) != 4:
        return img

    pts = approx.reshape(4, 2).astype("float32")
    rect = _order_corners(pts)
    (tl, tr, br, bl) = rect
    width = int(max(np.linalg.norm(br - bl), np.linalg.norm(tr - tl)))
    height = int(max(np.linalg.norm(tr - br), np.linalg.norm(tl - bl)))
    if width < 100 or height < 100:
        return img

    dst = np.array(
        [[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]],
        dtype="float32",
    )
    matrix = cv2.getPerspectiveTransform(rect, dst)
    return cv2.warpPerspective(img, matrix, (width, height))


def _order_corners(pts: np.ndarray) -> np.ndarray:
    """Ordonne 4 points en (haut-gauche, haut-droit, bas-droit, bas-gauche)."""
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]  # haut-gauche : somme min
    rect[2] = pts[np.argmax(s)]  # bas-droit : somme max
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]  # haut-droit : diff min
    rect[3] = pts[np.argmax(diff)]  # bas-gauche : diff max
    return rect


def deskew(gray: np.ndarray) -> np.ndarray:
    """Corrige une légère inclinaison (rotation) du document."""
    inv = cv2.bitwise_not(gray)
    thr = cv2.threshold(inv, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]
    coords = np.column_stack(np.where(thr > 0))
    if coords.shape[0] < 50:
        return gray
    angle = cv2.minAreaRect(coords)[-1]
    angle = -(90 + angle) if angle < -45 else -angle
    if abs(angle) < 0.5 or abs(angle) > 20:
        return gray  # rien à faire, ou rotation aberrante
    h, w = gray.shape
    matrix = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
    return cv2.warpAffine(
        gray, matrix, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
    )


def enhance(img: np.ndarray) -> np.ndarray:
    """Niveaux de gris + débruitage + amélioration du contraste (CLAHE)."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.fastNlMeansDenoising(gray, None, h=10, templateWindowSize=7, searchWindowSize=21)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)
    return gray


def preprocess(image_bytes: bytes) -> np.ndarray:
    """Chaîne complète de prétraitement → image en niveaux de gris redressée."""
    img = decode_image(image_bytes)
    img = _resize_max(img)
    img = correct_perspective(img)
    gray = enhance(img)
    gray = deskew(gray)
    return gray


# ---------------------------------------------------------------------------
# Étape 2 — Segmentation des cases (grille)
# ---------------------------------------------------------------------------
def detect_cells(gray: np.ndarray) -> list[Cell]:
    """Détecte les cases rectangulaires de la fiche via les lignes de la grille.

    On isole les traits horizontaux et verticaux par morphologie, on reforme la
    grille, puis on récupère chaque région fermée (= une case) par contours.
    """
    h, w = gray.shape
    binary = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 15, 10
    )

    # Longueur des noyaux proportionnelle à la taille de l'image.
    h_len = max(10, w // 40)
    v_len = max(10, h // 40)
    horizontal = cv2.morphologyEx(
        binary, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (h_len, 1))
    )
    vertical = cv2.morphologyEx(
        binary, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, v_len))
    )
    grid = cv2.dilate(cv2.add(horizontal, vertical), np.ones((3, 3), np.uint8), iterations=1)

    contours, _ = cv2.findContours(grid, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    img_area = h * w
    cells: list[Cell] = []
    for c in contours:
        x, y, cw, ch = cv2.boundingRect(c)
        area = cw * ch
        if area < img_area * 0.0004 or area > img_area * 0.05:
            continue  # trop petit (bruit) ou trop grand (cadre entier)
        ratio = cw / float(ch) if ch else 0
        if ratio < 0.3 or ratio > 3.5:
            continue  # une case reste proche du carré
        cells.append(Cell(x, y, cw, ch))
    return _dedupe_cells(cells)


def _dedupe_cells(cells: list[Cell]) -> list[Cell]:
    """Supprime les cases quasi-dupliquées (contours interne/externe)."""
    kept: list[Cell] = []
    for cell in sorted(cells, key=lambda c: c.area, reverse=True):
        if any(
            abs(cell.cx - k.cx) < k.w * 0.5 and abs(cell.cy - k.cy) < k.h * 0.5
            for k in kept
        ):
            continue
        kept.append(cell)
    return kept


def group_into_rows(cells: list[Cell]) -> list[list[Cell]]:
    """Regroupe les cases par ligne (proximité verticale) et trie chaque ligne."""
    if not cells:
        return []
    median_h = float(np.median([c.h for c in cells]))
    tol = median_h * 0.6
    rows: list[list[Cell]] = []
    for cell in sorted(cells, key=lambda c: c.cy):
        placed = False
        for row in rows:
            if abs(cell.cy - float(np.mean([r.cy for r in row]))) <= tol:
                row.append(cell)
                placed = True
                break
        if not placed:
            rows.append([cell])
    for row in rows:
        row.sort(key=lambda c: c.x)
    return rows


def _pick_rows(rows: list[list[Cell]]) -> tuple[list[Cell] | None, list[Cell] | None]:
    """Identifie la ligne matricule (≈8 cases) et la ligne note (≈5 cases).

    On tolère quelques cases parasites : on tronque à la longueur attendue en
    gardant la suite de cases la plus régulièrement espacée.
    """
    matricule_row = _best_row(rows, MATRICULE_LEN)
    note_row = _best_row(rows, NOTE_CELLS, exclude=matricule_row)
    return matricule_row, note_row


def _best_row(
    rows: list[list[Cell]], target: int, exclude: list[Cell] | None = None
) -> list[Cell] | None:
    """Ligne dont le nombre de cases est le plus proche de ``target`` (≥ target)."""
    candidates = [r for r in rows if r is not exclude and len(r) >= target]
    if not candidates:
        # Aucune ligne assez fournie : on prend la plus longue disponible.
        candidates = [r for r in rows if r is not exclude]
        if not candidates:
            return None
        return max(candidates, key=len)
    best = min(candidates, key=lambda r: (len(r) - target, -_row_regularity(r)))
    return _trim_row(best, target)


def _row_regularity(row: list[Cell]) -> float:
    """Score de régularité de l'espacement (plus grand = plus régulier)."""
    if len(row) < 2:
        return 0.0
    gaps = np.diff([c.cx for c in row])
    return -float(np.std(gaps))


def _trim_row(row: list[Cell], target: int) -> list[Cell]:
    """Conserve ``target`` cases consécutives les plus régulières de la ligne."""
    if len(row) <= target:
        return row
    best_start, best_score = 0, -np.inf
    for start in range(0, len(row) - target + 1):
        window = row[start : start + target]
        score = _row_regularity(window)
        if score > best_score:
            best_score, best_start = score, start
    return row[best_start : best_start + target]


# ---------------------------------------------------------------------------
# Étape 3 — OCR case par case (EasyOCR)
# ---------------------------------------------------------------------------
def _prepare_cell(gray: np.ndarray, cell: Cell) -> np.ndarray:
    """Découpe une case, retire les bordures et normalise pour l'OCR."""
    margin_x = int(cell.w * 0.16)
    margin_y = int(cell.h * 0.16)
    x0 = max(cell.x + margin_x, 0)
    y0 = max(cell.y + margin_y, 0)
    x1 = min(cell.x + cell.w - margin_x, gray.shape[1])
    y1 = min(cell.y + cell.h - margin_y, gray.shape[0])
    crop = gray[y0:y1, x0:x1]
    if crop.size == 0:
        return np.full((48, 48), 255, dtype=np.uint8)

    # Binarisation (texte foncé sur fond clair) puis agrandissement + marge.
    crop = cv2.threshold(crop, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]
    if np.mean(crop) < 127:  # majorité sombre → on inverse
        crop = cv2.bitwise_not(crop)
    scale = max(1.0, 56.0 / max(crop.shape))
    crop = cv2.resize(
        crop, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC
    )
    crop = cv2.copyMakeBorder(crop, 12, 12, 12, 12, cv2.BORDER_CONSTANT, value=255)
    return crop


def _recognize_char(cell_img: np.ndarray, allowlist: str) -> tuple[str, float]:
    """Reconnaît un caractère unique dans la case (liste restreinte)."""
    reader = _get_reader()
    rgb = cv2.cvtColor(cell_img, cv2.COLOR_GRAY2RGB)
    results = reader.readtext(
        rgb, allowlist=allowlist, detail=1, paragraph=False, batch_size=1
    )
    if not results:
        return "", 0.0
    # Meilleure détection par confiance ; on ne garde que les caractères permis.
    best_text, best_conf = "", 0.0
    for _box, text, conf in results:
        cleaned = "".join(ch for ch in text.upper() if ch in allowlist)
        if cleaned and conf >= best_conf:
            best_text, best_conf = cleaned[0], float(conf)
    return best_text, best_conf


def _read_matricule(gray: np.ndarray, row: list[Cell]) -> tuple[str, float]:
    """Lit les 8 cases : 2 lettres puis 6 chiffres."""
    chars, confs = [], []
    for idx, cell in enumerate(row):
        allow = LETTER_ALLOWLIST if idx < 2 else DIGIT_ALLOWLIST
        ch, conf = _recognize_char(_prepare_cell(gray, cell), allow)
        chars.append(ch or "?")
        confs.append(conf)
    return "".join(chars), float(np.mean(confs)) if confs else 0.0


def _read_note(gray: np.ndarray, row: list[Cell]) -> tuple[float | None, float, list[str]]:
    """Lit la note. La case centrale est le séparateur décimal (imposé)."""
    warnings: list[str] = []
    digits, confs = [], []
    for idx, cell in enumerate(row):
        if idx == NOTE_DOT_INDEX and len(row) == NOTE_CELLS:
            continue  # séparateur décimal : valeur fixée à '.'
        ch, conf = _recognize_char(_prepare_cell(gray, cell), DIGIT_ALLOWLIST)
        digits.append(ch or "0")
        confs.append(conf)

    if len(row) == NOTE_CELLS and len(digits) == 4:
        raw = f"{digits[0]}{digits[1]}.{digits[2]}{digits[3]}"
    else:
        # Disposition inattendue : on tente une reconstruction générique.
        warnings.append("Disposition de la note inattendue, lecture approximative.")
        joined = "".join(digits)
        raw = joined if "." in joined else joined
    try:
        note = round(float(raw), 2)
    except ValueError:
        return None, float(np.mean(confs)) if confs else 0.0, warnings
    return note, float(np.mean(confs)) if confs else 0.0, warnings


# ---------------------------------------------------------------------------
# Étape 4 — Aperçu des zones détectées
# ---------------------------------------------------------------------------
def _build_preview(
    gray: np.ndarray,
    matricule_row: list[Cell] | None,
    note_row: list[Cell] | None,
) -> str:
    """Dessine les cases détectées et renvoie un PNG encodé base64."""
    canvas = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    for row, color in ((matricule_row, (0, 170, 0)), (note_row, (200, 120, 0))):
        for cell in row or []:
            cv2.rectangle(
                canvas, (cell.x, cell.y), (cell.x + cell.w, cell.y + cell.h), color, 2
            )
    ok, buf = cv2.imencode(".png", canvas)
    if not ok:
        return ""
    return "data:image/png;base64," + base64.b64encode(buf.tobytes()).decode("ascii")


# ---------------------------------------------------------------------------
# Point d'entrée
# ---------------------------------------------------------------------------
def extract_matricule_and_note(image_bytes: bytes) -> OcrResult:
    """Reconnaît le matricule et la note à partir d'une photo de fiche.

    Ne lève jamais d'exception pour une simple mauvaise reconnaissance : renvoie
    un ``OcrResult`` avec les champs disponibles et des avertissements. Ne lève
    ``NoteOCRError`` que si l'image est totalement inexploitable.
    """
    gray = preprocess(image_bytes)
    cells = detect_cells(gray)
    rows = group_into_rows(cells)
    matricule_row, note_row = _pick_rows(rows)

    result = OcrResult()
    result.preview_png_b64 = _build_preview(gray, matricule_row, note_row)

    if matricule_row and len(matricule_row) >= MATRICULE_LEN:
        matricule, m_conf = _read_matricule(gray, matricule_row[:MATRICULE_LEN])
        result.matricule = matricule
        result.matricule_confidence = m_conf
        result.matricule_valid = bool(MATRICULE_RE.match(matricule))
    else:
        result.warnings.append("Zone du matricule (8 cases) non détectée.")

    if note_row:
        note, n_conf, warns = _read_note(gray, note_row)
        result.note = note
        result.note_confidence = n_conf
        result.note_valid = note is not None and 0.0 <= note <= 20.0
        result.warnings.extend(warns)
    else:
        result.warnings.append("Zone de la note non détectée.")

    return result
