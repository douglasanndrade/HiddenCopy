#!/usr/bin/env python3
"""HiddenCopy - Cloaker de Imagem.

Pipeline independente do cloaker de video. Recebe um JSON via argv[1]:

{
  "input": "path/to/input.jpg",
  "output": "path/to/output.jpg",
  "intensidade": "leve" | "medio" | "forte",
  "seed": null
}

Etapas (nessa ordem):
  1. GLCM normalization     - piso de textura de 2a ordem
  2. Ruido gaussiano
  3. Perturbacao por pixel
  4. Simulacao de camera    - bayer/demosaic, aberracao cromatica, vinheta,
                              shot noise, read noise, hot pixels, banding,
                              motion blur, ciclos de JPEG
  5. Reposicao de textura   - repoe o GLCM que o demosaic e o JPEG comeram
  6. FFT spectral matching  - shaping final do decaimento radial
  7. Auto white balance + EXIF falso de camera real

O casamento espectral e a ultima etapa de proposito: e o sinal que os
detectores realmente leem, e qualquer injecao de textura posterior (grao,
ruido, JPEG) achataria o espectro de novo. Rodando por ultimo, o slope
entregue e o slope escolhido.

Dependencias: numpy, scipy, Pillow. Sem torch, sem opencv, sem skimage.
"""

from __future__ import annotations

import io
import json
import sys
import traceback
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

Image.MAX_IMAGE_PIXELS = None


def log(msg: str) -> None:
    print(msg, flush=True)


# ---------------------------------------------------------------- presets

PRESETS = {
    "leve": {
        "fft_cutoff": 0.30, "fft_strength": 0.50, "fft_alpha": 1.0,
        "fft_phase": 0.04, "fft_random": 0.03, "fft_bins_smooth": 7,
        "glcm_strength": 0.45, "glcm_target": 1.2,
        "noise_std": 0.005,
        "perturb": 0.003,
        "jpeg_cycles": 1, "jpeg_qmin": 92, "jpeg_qmax": 97,
        "vignette": 0.05, "chroma": 0.4, "iso_scale": 1.0,
        "read_noise": 0.8, "hot_pixel": 5e-7, "banding": 0.0,
        "motion_blur": 1,
        "awb": 0.08,
    },
    "medio": {
        "fft_cutoff": 0.25, "fft_strength": 0.75, "fft_alpha": 1.0,
        "fft_phase": 0.08, "fft_random": 0.05, "fft_bins_smooth": 5,
        "glcm_strength": 0.70, "glcm_target": 1.8,
        "noise_std": 0.010,
        "perturb": 0.005,
        "jpeg_cycles": 1, "jpeg_qmin": 88, "jpeg_qmax": 94,
        "vignette": 0.08, "chroma": 0.9, "iso_scale": 1.4,
        "read_noise": 1.3, "hot_pixel": 1e-6, "banding": 0.002,
        "motion_blur": 1,
        "awb": 0.12,
    },
    "forte": {
        "fft_cutoff": 0.20, "fft_strength": 0.92, "fft_alpha": 1.0,
        "fft_phase": 0.14, "fft_random": 0.08, "fft_bins_smooth": 5,
        "glcm_strength": 0.90, "glcm_target": 2.5,
        "noise_std": 0.016,
        "perturb": 0.009,
        "jpeg_cycles": 2, "jpeg_qmin": 82, "jpeg_qmax": 90,
        "vignette": 0.12, "chroma": 1.5, "iso_scale": 2.0,
        "read_noise": 2.0, "hot_pixel": 2e-6, "banding": 0.004,
        "motion_blur": 3,
        "awb": 0.18,
    },
}


# ------------------------------------------------------------ helpers

def luminance(img: np.ndarray) -> np.ndarray:
    return 0.299 * img[..., 0] + 0.587 * img[..., 1] + 0.114 * img[..., 2]


def _radial_index(h: int, w: int, nbins: int):
    """Indice de bin radial (0..nbins-1) para o espectro ja shiftado."""
    fy = np.fft.fftshift(np.fft.fftfreq(h))[:, None]
    fx = np.fft.fftshift(np.fft.fftfreq(w))[None, :]
    r = np.sqrt((fy * 2) ** 2 + (fx * 2) ** 2)   # 0 no centro, ~1 na borda
    r = np.clip(r, 0.0, 1.0)
    idx = np.minimum((r * (nbins - 1)).astype(np.int32), nbins - 1)
    return r.astype(np.float32), idx


def _radial_mean(values: np.ndarray, idx: np.ndarray, nbins: int) -> np.ndarray:
    total = np.bincount(idx.ravel(), values.ravel(), minlength=nbins)
    count = np.bincount(idx.ravel(), minlength=nbins)
    return total / np.maximum(count, 1)


def _smooth_profile(prof: np.ndarray, win: int) -> np.ndarray:
    if win <= 1:
        return prof
    k = np.ones(win, dtype=np.float64) / win
    return np.convolve(prof, k, mode="same")


# ------------------------------------------------------- 1. FFT matching

def fft_spectral_match(img: np.ndarray, p: dict, rng) -> np.ndarray:
    """Casa o perfil radial de amplitude com um modelo 1/f^alpha.

    Imagens naturais tem amplitude ~ 1/f. Geradores de IA desviam desse
    decaimento (excesso ou falta de energia em alta frequencia) e e isso
    que a maioria dos detectores le. Aqui o perfil e reescrito por bin
    radial e a fase ganha um jitter, sem mexer nas baixas frequencias
    (que carregam a aparencia da imagem).
    """
    h, w, _ = img.shape
    nbins = max(64, min(h, w) // 4)
    r, idx = _radial_index(h, w, nbins)

    # rampa suave: 0 abaixo do cutoff, 1 acima de cutoff+0.10
    lo = p["fft_cutoff"]
    hi = min(1.0, lo + 0.10)
    t = np.clip((r - lo) / max(hi - lo, 1e-6), 0.0, 1.0)
    ramp = t * t * (3.0 - 2.0 * t)          # smoothstep

    bin_centers = (np.arange(nbins) + 0.5) / nbins
    model = 1.0 / np.power(np.maximum(bin_centers, 1e-3), p["fft_alpha"])

    out = np.empty_like(img)
    for c in range(3):
        F = np.fft.fftshift(np.fft.fft2(img[..., c]))
        mag = np.abs(F)
        phase = np.angle(F)

        prof = _smooth_profile(_radial_mean(mag, idx, nbins), p["fft_bins_smooth"])
        prof = np.maximum(prof, 1e-8)

        # ancora o modelo no bin do cutoff pra nao alterar o brilho global
        anchor = max(int(lo * nbins), 1)
        target = model * (prof[anchor] / model[anchor])

        gain_prof = np.clip(target / prof, 0.05, 8.0)
        gain = gain_prof[idx].astype(np.float32)

        # blend pela forca + rampa, mais uma pitada de aleatoriedade
        gain = 1.0 + p["fft_strength"] * ramp * (gain - 1.0)
        if p["fft_random"] > 0:
            gain = gain * (1.0 + p["fft_random"] * ramp
                           * rng.standard_normal(gain.shape).astype(np.float32))

        new_phase = phase + p["fft_phase"] * ramp * rng.standard_normal(phase.shape)
        spectrum = mag * gain * np.exp(1j * new_phase)
        out[..., c] = np.fft.ifft2(np.fft.ifftshift(spectrum)).real

    return np.clip(out, 0.0, 1.0).astype(np.float32)


# --------------------------------------------------- 2. GLCM normalization

_GLCM_OFFSETS = [(0, 1), (-1, 1), (-1, 0), (-1, -1)]   # 0, 45, 90, 135 graus


def _shift_pair(q: np.ndarray, dy: int, dx: int):
    h, w = q.shape
    a = q[max(0, -dy):h - max(0, dy), max(0, -dx):w - max(0, dx)]
    b = q[max(0, dy):h - max(0, -dy), max(0, dx):w - max(0, -dx)]
    return a, b


def glcm_contrast(L: np.ndarray, levels: int = 32) -> float:
    """Contraste GLCM medio nos 4 angulos.

    Na matriz de co-ocorrencia, o contraste sum_ij (i-j)^2 P(i,j) e
    identicamente a media de (a-b)^2 sobre os pares de pixels naquele
    offset - entao da pra calcular direto, sem montar a matriz.
    """
    q = np.clip(L * (levels - 1), 0, levels - 1).astype(np.float32)
    vals = []
    for dy, dx in _GLCM_OFFSETS:
        a, b = _shift_pair(q, dy, dx)
        d = a - b
        vals.append(float(np.mean(d * d)))
    return float(np.mean(vals))


def _inject_texture(img: np.ndarray, deficit_q2: float, levels: int, strength: float, rng):
    """Injeta textura na luminancia pra fechar um deficit de contraste GLCM.

    Mistura 70% realce de detalhe (acompanha a estrutura da imagem) e 30%
    grao branco. Ruido iid de desvio s soma 2*s^2 ao E[(a-b)^2], entao o
    desvio necessario sai direto do deficit medido.
    """
    L = luminance(img)
    deficit = max(deficit_q2, 0.0) / float((levels - 1) ** 2)
    sigma = float(np.sqrt(deficit / 2.0)) * strength
    if sigma <= 1e-6:
        return img

    detail = L - ndimage.gaussian_filter(L, sigma=1.0)
    dstd = float(detail.std())
    detail = detail / dstd if dstd > 1e-6 else np.zeros_like(L)
    grain = rng.standard_normal(L.shape).astype(np.float32)

    texture = 0.7 * detail + 0.3 * grain
    tstd = float(texture.std())
    if tstd > 1e-6:
        texture = texture / tstd * sigma
    return np.clip(img + texture[..., None], 0.0, 1.0).astype(np.float32)


def glcm_topup(img: np.ndarray, p: dict, rng) -> np.ndarray:
    """Repoe o contraste GLCM que o demosaic e o JPEG comeram.

    A etapa 2 injeta textura antes da simulacao de camera, mas o demosaic
    e passa-baixa e o ciclo JPEG remove grao de 1px -- na pratica boa parte
    do trabalho e desfeita. Aqui a gente mede o que sobrou no resultado e
    fecha a diferenca, seguido de um ciclo JPEG leve pra que o grao reposto
    fique quantizado igual ao resto (grao inconsistente com a compressao e,
    por si so, um sinal).
    """
    levels = 32
    atual = glcm_contrast(luminance(img), levels)
    falta = p["glcm_target"] - atual
    if falta <= 0.01 or p["glcm_strength"] <= 0:
        return img
    return _inject_texture(img, falta, levels, p["glcm_strength"], rng)


def glcm_normalize(img: np.ndarray, p: dict, rng):
    """Eleva o contraste GLCM da luminancia ate a faixa de foto de camera.

    Imagem de IA e lisa demais na escala de 1px. A correcao injeta textura
    - 70% realce de detalhe (segue a estrutura da imagem) e 30% grao branco
    - dimensionada para o deficit medido, e aplica so na luminancia pra nao
    sujar o croma.
    """
    levels = 32
    L = luminance(img)
    before = glcm_contrast(L, levels)
    target = p["glcm_target"]

    if before >= target or p["glcm_strength"] <= 0:
        return img, before, before

    out = _inject_texture(img, target - before, levels, p["glcm_strength"], rng)
    return out, before, glcm_contrast(luminance(out), levels)


# ------------------------------------------------ 3/4. ruido e perturbacao

def gaussian_noise(img: np.ndarray, std: float, rng) -> np.ndarray:
    if std <= 0:
        return img
    n = rng.standard_normal(img.shape).astype(np.float32) * std
    return np.clip(img + n, 0.0, 1.0)


def perturb(img: np.ndarray, mag: float, rng) -> np.ndarray:
    if mag <= 0:
        return img
    n = rng.uniform(-mag, mag, size=img.shape).astype(np.float32)
    return np.clip(img + n, 0.0, 1.0)


# ------------------------------------------------- 5. simulacao de camera

_BAYER_RB = np.array([[1, 2, 1], [2, 4, 2], [1, 2, 1]], dtype=np.float32) / 4.0
_BAYER_G = np.array([[0, 1, 0], [1, 4, 1], [0, 1, 0]], dtype=np.float32) / 4.0


def bayer_demosaic(img: np.ndarray) -> np.ndarray:
    """Mosaico RGGB + demosaic bilinear.

    Reproduz o borrao cruzado entre canais que todo sensor real produz e
    que renderizacao sintetica nao tem.
    """
    h, w, _ = img.shape
    mR = np.zeros((h, w), dtype=np.float32); mR[0::2, 0::2] = 1.0
    mG = np.zeros((h, w), dtype=np.float32); mG[0::2, 1::2] = 1.0; mG[1::2, 0::2] = 1.0
    mB = np.zeros((h, w), dtype=np.float32); mB[1::2, 1::2] = 1.0

    R = ndimage.convolve(img[..., 0] * mR, _BAYER_RB, mode="reflect")
    G = ndimage.convolve(img[..., 1] * mG, _BAYER_G, mode="reflect")
    B = ndimage.convolve(img[..., 2] * mB, _BAYER_RB, mode="reflect")
    return np.clip(np.stack([R, G, B], axis=-1), 0.0, 1.0).astype(np.float32)


def chromatic_aberration(img: np.ndarray, strength_px: float) -> np.ndarray:
    """Escala R e B em fracoes de pixel em relacao ao G (lente real dispersa)."""
    if strength_px <= 0:
        return img
    h, w, _ = img.shape
    diag = float(np.hypot(h, w)) * 0.5
    cy, cx = (h - 1) / 2.0, (w - 1) / 2.0
    out = img.copy()
    for c, sign in ((0, 1.0), (2, -1.0)):
        s = 1.0 + sign * strength_px / max(diag, 1.0)
        mat = np.array([[1.0 / s, 0.0], [0.0, 1.0 / s]])
        off = np.array([cy - cy / s, cx - cx / s])
        out[..., c] = ndimage.affine_transform(
            img[..., c], mat, offset=off, order=1, mode="reflect"
        )
    return np.clip(out, 0.0, 1.0).astype(np.float32)


def vignette(img: np.ndarray, strength: float) -> np.ndarray:
    if strength <= 0:
        return img
    h, w, _ = img.shape
    yy = (np.arange(h) - (h - 1) / 2.0)[:, None] / (h / 2.0)
    xx = (np.arange(w) - (w - 1) / 2.0)[None, :] / (w / 2.0)
    r2 = yy ** 2 + xx ** 2
    mask = (1.0 - strength * (r2 / 2.0)).astype(np.float32)
    return np.clip(img * mask[..., None], 0.0, 1.0)


def sensor_noise(img: np.ndarray, p: dict, rng) -> np.ndarray:
    """Shot noise (Poisson, depende do sinal) + read noise (gaussiano fixo)."""
    out = img
    if p["iso_scale"] > 0:
        full_well = 12000.0 / max(p["iso_scale"], 1e-3)
        electrons = np.clip(out, 0.0, 1.0) * full_well
        out = rng.poisson(electrons).astype(np.float32) / full_well
    if p["read_noise"] > 0:
        out = out + rng.standard_normal(out.shape).astype(np.float32) * (p["read_noise"] / 255.0)
    return np.clip(out, 0.0, 1.0).astype(np.float32)


def hot_pixels(img: np.ndarray, prob: float, rng) -> np.ndarray:
    if prob <= 0:
        return img
    h, w, _ = img.shape
    n = int(h * w * prob)
    if n <= 0:
        return img
    ys = rng.integers(0, h, n)
    xs = rng.integers(0, w, n)
    cs = rng.integers(0, 3, n)
    out = img.copy()
    out[ys, xs, cs] = rng.uniform(0.85, 1.0, n).astype(np.float32)
    return out


def banding(img: np.ndarray, strength: float, rng) -> np.ndarray:
    if strength <= 0:
        return img
    h = img.shape[0]
    rows = ndimage.gaussian_filter1d(rng.standard_normal(h).astype(np.float32), 3.0)
    rows = rows / max(float(np.abs(rows).max()), 1e-6) * strength
    return np.clip(img * (1.0 + rows[:, None, None]), 0.0, 1.0).astype(np.float32)


def motion_blur(img: np.ndarray, k: int, rng) -> np.ndarray:
    if not k or k <= 1:
        return img
    kern = np.zeros((k, k), dtype=np.float32)
    kern[k // 2, :] = 1.0
    kern = ndimage.rotate(kern, float(rng.uniform(0, 180)), reshape=False, order=1)
    s = float(kern.sum())
    if s <= 1e-6:
        return img
    kern /= s
    out = np.stack([ndimage.convolve(img[..., c], kern, mode="reflect") for c in range(3)], -1)
    return np.clip(out, 0.0, 1.0).astype(np.float32)


def jpeg_cycles(img: np.ndarray, p: dict, rng) -> np.ndarray:
    """Recompressao JPEG: deixa a assinatura de bloco 8x8 de arquivo real."""
    out = img
    for _ in range(max(0, int(p["jpeg_cycles"]))):
        q = int(rng.integers(p["jpeg_qmin"], p["jpeg_qmax"] + 1))
        buf = io.BytesIO()
        arr = (np.clip(out, 0, 1) * 255.0).round().astype(np.uint8)
        Image.fromarray(arr).save(buf, format="JPEG", quality=q, subsampling=2)
        buf.seek(0)
        out = np.asarray(Image.open(buf).convert("RGB"), dtype=np.float32) / 255.0
    return out


# margem espelhada durante as etapas geometricas. Sem ela o "reflect" do
# demosaic espelha o proprio padrao RGGB e dobra a energia na primeira
# linha/coluna, deixando uma moldura de 1px. Par, pra manter a fase RGGB.
_PAD = 8


def simulate_camera(img: np.ndarray, p: dict, rng) -> np.ndarray:
    padded = np.pad(img, ((_PAD, _PAD), (_PAD, _PAD), (0, 0)), mode="reflect")
    out = bayer_demosaic(padded)
    out = chromatic_aberration(out, p["chroma"])
    out = motion_blur(out, p["motion_blur"], rng)
    out = out[_PAD:-_PAD, _PAD:-_PAD]
    out = vignette(out, p["vignette"])
    out = sensor_noise(out, p, rng)
    out = hot_pixels(out, p["hot_pixel"], rng)
    out = banding(out, p["banding"], rng)
    out = jpeg_cycles(out, p, rng)
    return out


# --------------------------------------------------- 6. auto white balance

def auto_white_balance(img: np.ndarray, strength: float) -> np.ndarray:
    if strength <= 0:
        return img
    means = img.reshape(-1, 3).mean(axis=0)
    gray = float(means.mean())
    gains = np.where(means > 1e-6, gray / np.maximum(means, 1e-6), 1.0)
    gains = 1.0 + strength * (gains - 1.0)
    return np.clip(img * gains.astype(np.float32), 0.0, 1.0)


# --------------------------------------------------------- 7. EXIF falso

_CAMERAS = [
    ("Canon", "Canon EOS R6", "RF24-70mm F2.8 L IS USM", 35.0, 2.8, 400),
    ("Canon", "Canon EOS 6D Mark II", "EF50mm f/1.8 STM", 50.0, 4.0, 200),
    ("NIKON CORPORATION", "NIKON Z 6_2", "NIKKOR Z 24-70mm f/4 S", 45.0, 4.0, 320),
    ("SONY", "ILCE-7M4", "FE 24-105mm F4 G OSS", 55.0, 4.5, 250),
    ("FUJIFILM", "X-T4", "XF35mmF1.4 R", 35.0, 2.0, 160),
    ("Apple", "iPhone 14 Pro", "iPhone 14 Pro back camera 6.86mm f/1.78", 6.86, 1.78, 64),
]


def save_with_fake_exif(img: np.ndarray, path: Path, rng) -> None:
    """Grava com bloco EXIF de camera real (arquivo sem EXIF ja e um sinal)."""
    arr = (np.clip(img, 0, 1) * 255.0).round().astype(np.uint8)
    pil = Image.fromarray(arr)

    make, model, lens, focal, fnum, iso = _CAMERAS[int(rng.integers(0, len(_CAMERAS)))]
    stamp = "%04d:%02d:%02d %02d:%02d:%02d" % (
        int(rng.integers(2023, 2026)), int(rng.integers(1, 13)), int(rng.integers(1, 28)),
        int(rng.integers(7, 22)), int(rng.integers(0, 60)), int(rng.integers(0, 60)),
    )
    exposure = float(rng.choice([1 / 60, 1 / 125, 1 / 250, 1 / 500]))

    exif = Image.Exif()
    exif[0x010F] = make                       # Make
    exif[0x0110] = model                      # Model
    exif[0x0131] = "Adobe Lightroom Classic"  # Software
    exif[0x0132] = stamp                      # DateTime
    exif[0x0112] = 1                          # Orientation
    exif[0x011A] = 72.0                       # XResolution
    exif[0x011B] = 72.0                       # YResolution
    exif[0x0128] = 2                          # ResolutionUnit

    ifd = exif.get_ifd(0x8769)
    ifd[0x9003] = stamp                       # DateTimeOriginal
    ifd[0x9004] = stamp                       # DateTimeDigitized
    ifd[0x829A] = exposure                    # ExposureTime
    ifd[0x829D] = fnum                        # FNumber
    ifd[0x8827] = iso                         # ISOSpeedRatings
    ifd[0x920A] = focal                       # FocalLength
    ifd[0xA002] = int(arr.shape[1])           # PixelXDimension
    ifd[0xA003] = int(arr.shape[0])           # PixelYDimension
    ifd[0xA434] = lens                        # LensModel
    ifd[0x9207] = 5                           # MeteringMode
    ifd[0x9209] = 16                          # Flash (off)
    ifd[0xA402] = 0                           # ExposureMode
    ifd[0xA403] = 0                           # WhiteBalance

    suffix = path.suffix.lower()
    blob = exif.tobytes()
    if suffix == ".png":
        pil.save(path, format="PNG", exif=blob)
    elif suffix == ".webp":
        pil.save(path, format="WEBP", quality=95, exif=blob)
    else:
        pil.save(path, format="JPEG", quality=95, subsampling=2, exif=blob)


# ------------------------------------------------------------- analise

def spectral_slope(img: np.ndarray) -> float:
    """Inclinacao alpha do espectro (amplitude ~ 1/f^alpha) na banda media."""
    L = luminance(img)
    h, w = L.shape
    nbins = max(64, min(h, w) // 4)
    _, idx = _radial_index(h, w, nbins)
    mag = np.abs(np.fft.fftshift(np.fft.fft2(L)))
    prof = _radial_mean(mag, idx, nbins)
    f = (np.arange(nbins) + 0.5) / nbins
    band = (f > 0.08) & (f < 0.8) & (prof > 0)
    if band.sum() < 8:
        return float("nan")
    a, _ = np.polyfit(np.log(f[band]), np.log(prof[band]), 1)
    return float(-a)


def noise_floor(img: np.ndarray) -> float:
    """Sigma do ruido via MAD do laplaciano (Immerkaer), em niveis de 0-255."""
    L = luminance(img)
    k = np.array([[1, -2, 1], [-2, 4, -2], [1, -2, 1]], dtype=np.float32)
    r = ndimage.convolve(L, k, mode="reflect")
    return float(np.median(np.abs(r)) / 0.6745 / 6.0 * 255.0)


# ---------------------------------------------------------------- main

def process(cfg: dict) -> None:
    src = Path(cfg["input"])
    dst = Path(cfg["output"])
    nivel = cfg.get("intensidade", "medio")
    if nivel not in PRESETS:
        raise ValueError("intensidade invalida: %s" % nivel)
    p = PRESETS[nivel]

    seed = cfg.get("seed")
    rng = np.random.default_rng(seed)

    pil = Image.open(src).convert("RGB")
    img = np.asarray(pil, dtype=np.float32) / 255.0
    original = img.copy()
    log("[1/7] carregado %dx%d  intensidade=%s" % (img.shape[1], img.shape[0], nivel))

    img, glcm_before, glcm_after = glcm_normalize(img, p, rng)
    log("[2/7] glcm normalization  contraste %.2f -> %.2f (alvo %.2f)"
        % (glcm_before, glcm_after, p["glcm_target"]))

    img = gaussian_noise(img, p["noise_std"], rng)
    log("[3/7] ruido gaussiano std=%.3f" % p["noise_std"])

    img = perturb(img, p["perturb"], rng)
    log("[4/7] perturbacao por pixel mag=%.3f" % p["perturb"])

    img = simulate_camera(img, p, rng)
    log("[5/7] simulacao de camera")

    img = glcm_topup(img, p, rng)
    log("[6/7] reposicao de textura pos-camera")

    # O casamento espectral vem por ultimo de proposito. Ele e o sinal que os
    # detectores realmente leem, e qualquer etapa posterior que injete textura
    # (grao, ruido, JPEG) achata o espectro de novo. Rodando por ultimo, o
    # slope entregue e o slope que a gente escolheu.
    img = fft_spectral_match(img, p, rng)
    log("[7/7] fft spectral matching (shaping final)")

    img = auto_white_balance(img, p["awb"])

    dst.parent.mkdir(parents=True, exist_ok=True)
    save_with_fake_exif(img, dst, rng)

    a0, a1 = spectral_slope(original), spectral_slope(img)
    n0, n1 = noise_floor(original), noise_floor(img)
    # o contraste que importa e o do arquivo final, depois de ruido e camera
    glcm_final = glcm_contrast(luminance(img), 32)
    delta = float(np.abs(img - original).mean() * 255.0)
    mse = max(float(np.mean((img - original) ** 2)), 1e-12)
    psnr = float(10.0 * np.log10(1.0 / mse))

    log("")
    log("--- analise ---")
    log("  slope espectral : %.3f -> %.3f" % (a0, a1))
    log("  contraste glcm  : %.2f -> %.2f (alvo %.2f)" % (glcm_before, glcm_final, p["glcm_target"]))
    log("  ruido (0-255)   : %.2f -> %.2f" % (n0, n1))
    log("  delta medio     : %.2f niveis" % delta)
    log("  psnr            : %.2f dB" % psnr)
    log("  saida           : %s" % dst)

    print(json.dumps({
        "ok": True,
        "intensidade": nivel,
        "slope_antes": round(a0, 4), "slope_depois": round(a1, 4),
        "glcm_antes": round(glcm_before, 4), "glcm_depois": round(glcm_final, 4),
        "ruido_antes": round(n0, 3), "ruido_depois": round(n1, 3),
        "delta_medio": round(delta, 3), "psnr": round(psnr, 2),
    }), flush=True)


def main() -> int:
    if len(sys.argv) < 2:
        print("uso: image_cloaker.py <json>", file=sys.stderr)
        return 2
    try:
        process(json.loads(sys.argv[1]))
        return 0
    except Exception as exc:
        traceback.print_exc()
        print(json.dumps({"ok": False, "erro": str(exc)}), flush=True)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
