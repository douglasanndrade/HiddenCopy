#!/usr/bin/env python3
"""HiddenCopy — Cloaker de Criativo.

Pipeline unificado portado do app desktop. Recebe um JSON via argv[1]:

{
  "input": "path/to/input.mp4",
  "output": "path/to/output.mp4",
  "mode": "suave" | "oculto" | "clean",
  "oculto": "path/to/oculto.mp3 ou .mp4 ou null",
  "oculto_volume": 0.005,
  "start_sec": 0.0
}

Quando start_sec > 0, usa pipeline uniforme com crossfade Linear 1200ms
(mesmo comportamento do toggle "Padrão sonoro uniforme" do app desktop).
"""

from __future__ import annotations

import gc
import json
import os
import subprocess
import sys
import tempfile
import traceback
from pathlib import Path

import numpy as np
import soundfile as sf
import librosa
from scipy.ndimage import gaussian_filter1d


def find_ffmpeg() -> str:
    """ffmpeg do PATH (Linux/Docker) ou Windows comum."""
    try:
        subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
        return 'ffmpeg'
    except (FileNotFoundError, subprocess.CalledProcessError):
        pass
    if os.name == 'nt':
        for c in [
            r'C:\ffmpeg\bin\ffmpeg.exe',
            r'D:\HiddenCopy\ffmpeg_temp\ffmpeg-8.1-essentials_build\bin\ffmpeg.exe',
        ]:
            if os.path.isfile(c):
                return c
    raise RuntimeError('ffmpeg não encontrado no PATH ou caminhos comuns')


FFMPEG = find_ffmpeg()


def log(msg: str) -> None:
    print(msg, flush=True)


META_FLAGS = [
    '-map_metadata', '-1',
    '-map_metadata:s:v', '-1',
    '-map_metadata:s:a', '-1',
    '-map_chapters', '-1',
    '-fflags', '+bitexact',
    '-flags:v', '+bitexact',
    '-flags:a', '+bitexact',
    '-metadata:s:v:0', 'handler_name=',
    '-metadata:s:a:0', 'handler_name=',
    '-metadata:s:v:0', 'vendor_id=',
    '-metadata:s:a:0', 'vendor_id=',
]


def process_segment(segment_L: np.ndarray, sr: int, mode: str,
                    oculto_for_segment: np.ndarray | None) -> np.ndarray:
    """Processa só o segmento [start:fim] do canal L (sem padrão uniforme)."""
    n_fft, hop_length, win_length = 2048, 512, 2048

    stft_L = librosa.stft(segment_L.astype(np.float32, copy=False),
                          n_fft=n_fft, hop_length=hop_length,
                          win_length=win_length, window='hann').astype(np.complex64, copy=False)
    mag_L = np.abs(stft_L).astype(np.float32, copy=False)
    phase_L = np.angle(stft_L)

    freqs = librosa.fft_frequencies(sr=sr, n_fft=n_fft)
    mask_vocal = (freqs >= 300) & (freqs <= 3400)
    mask_low = freqs < 500

    vocal_energy = np.sum(mag_L[mask_vocal, :], axis=0)
    kernel = np.hanning(11) / np.hanning(11).sum()
    energy_smooth = np.convolve(vocal_energy, kernel, mode='same')
    threshold = np.percentile(energy_smooth, 40)
    speech_mask = energy_smooth > threshold
    speech_mask_smooth = gaussian_filter1d(speech_mask.astype(np.float32), sigma=3) > 0.5

    if mode == 'clean':
        supp_lo, supp_hi = 0.18, 0.24
        boost_lo, boost_hi = 1.85, 2.15
    else:  # 'suave' ou 'oculto'
        supp_lo, supp_hi = 0.55, 0.70
        boost_lo, boost_hi = 1.0, 1.0

    apply_boost = not (boost_lo == 1.0 and boost_hi == 1.0)

    mag_L_processed = mag_L.copy()
    for frame_idx in range(mag_L.shape[1]):
        if speech_mask_smooth[frame_idx]:
            mag_L_processed[mask_vocal, frame_idx] *= np.random.uniform(supp_lo, supp_hi)
        elif apply_boost:
            mag_L_processed[mask_low, frame_idx] *= np.random.uniform(boost_lo, boost_hi)

    stft_L_processed = mag_L_processed * np.exp(1j * phase_L)
    L_processed = librosa.istft(stft_L_processed, hop_length=hop_length,
                                win_length=win_length, window='hann',
                                length=len(segment_L)).astype(np.float32, copy=False)
    R_processed = -L_processed

    max_val = max(float(np.abs(L_processed).max()), float(np.abs(R_processed).max()))
    if max_val > 0:
        L_processed = L_processed / max_val * 0.95
        R_processed = R_processed / max_val * 0.95

    if mode == 'oculto' and oculto_for_segment is not None:
        n = min(len(L_processed), len(oculto_for_segment))
        L_processed[:n] = L_processed[:n] + oculto_for_segment[:n]
        R_processed[:n] = R_processed[:n] + oculto_for_segment[:n]

    return np.stack([L_processed, R_processed])


def process_uniform(audio: np.ndarray, sr: int, mode: str,
                    oculto_full: np.ndarray | None, start_sample: int) -> np.ndarray:
    """Pipeline em todo o áudio + crossfade Linear 1200ms no canal R no start.
    Usado quando start_sec > 0."""
    n_fft, hop_length, win_length = 2048, 512, 2048

    L = audio[0]
    total = len(L)

    stft_L = librosa.stft(L.astype(np.float32, copy=False),
                          n_fft=n_fft, hop_length=hop_length,
                          win_length=win_length, window='hann').astype(np.complex64, copy=False)
    mag_L = np.abs(stft_L).astype(np.float32, copy=False)

    freqs = librosa.fft_frequencies(sr=sr, n_fft=n_fft)
    mask_vocal = (freqs >= 300) & (freqs <= 3400)
    mask_low = freqs < 500

    vocal_energy = np.sum(mag_L[mask_vocal, :], axis=0)
    kernel = np.hanning(11) / np.hanning(11).sum()
    energy_smooth = np.convolve(vocal_energy, kernel, mode='same')
    threshold = np.percentile(energy_smooth, 40)
    speech_mask = energy_smooth > threshold
    speech_mask_smooth = gaussian_filter1d(speech_mask.astype(np.float32), sigma=3) > 0.5
    del vocal_energy, energy_smooth, speech_mask

    n_frames = mag_L.shape[1]

    if mode == 'clean':
        supp_target = 0.21
        boost_lo, boost_hi = 1.85, 2.15
    else:  # 'suave' ou 'oculto'
        supp_target = 0.62
        boost_lo, boost_hi = 1.0, 1.0

    apply_boost = not (boost_lo == 1.0 and boost_hi == 1.0)

    start_frame = int(round(start_sample / hop_length))
    start_frame = max(0, min(start_frame, n_frames))
    xfade_frames = 20

    supp_per_frame = np.ones(n_frames, dtype=np.float32)
    if start_frame < n_frames:
        xf_end = min(start_frame + xfade_frames, n_frames)
        if xf_end > start_frame:
            ramp = np.linspace(1.0, supp_target, xf_end - start_frame, dtype=np.float32)
            supp_per_frame[start_frame:xf_end] = ramp
        supp_per_frame[xf_end:] = supp_target

    scale_vocal = np.ones(n_frames, dtype=np.float32)
    scale_low = np.ones(n_frames, dtype=np.float32)
    for frame_idx in range(n_frames):
        if speech_mask_smooth[frame_idx]:
            f = supp_per_frame[frame_idx]
            if f < 0.99:
                f = f * np.random.uniform(0.95, 1.05)
            scale_vocal[frame_idx] = f
        elif apply_boost:
            scale_low[frame_idx] = np.random.uniform(boost_lo, boost_hi)

    ratio = np.ones_like(mag_L)
    ratio[mask_vocal, :] *= scale_vocal[np.newaxis, :]
    ratio[mask_low, :] *= scale_low[np.newaxis, :]
    del mag_L, scale_vocal, scale_low, supp_per_frame, speech_mask_smooth
    gc.collect()

    stft_L *= ratio
    del ratio
    gc.collect()

    L_processed = librosa.istft(stft_L, hop_length=hop_length,
                                win_length=win_length, window='hann',
                                length=total).astype(np.float32, copy=False)
    del stft_L
    gc.collect()

    # Canal R: +L pre, -L post, com crossfade Linear 1200ms centrado no start
    if start_sample <= 0:
        R_processed = -L_processed
    else:
        R_processed = np.empty_like(L_processed)
        R_processed[:start_sample] = L_processed[:start_sample]
        R_processed[start_sample:] = -L_processed[start_sample:]

        xfade_samples = int(1.2 * sr)
        xfade_samples = min(xfade_samples, 2 * (total - start_sample), 2 * start_sample)
        if xfade_samples > 1:
            half = xfade_samples // 2
            xf_start = start_sample - half
            xf_end = start_sample + half
            t = np.linspace(0.0, 1.0, xf_end - xf_start, dtype=np.float32)
            R_processed[xf_start:xf_end] = L_processed[xf_start:xf_end] * (1.0 - 2.0 * t)

    max_val = max(float(np.abs(L_processed).max()), float(np.abs(R_processed).max()))
    if max_val > 0:
        L_processed = L_processed / max_val * 0.95
        R_processed = R_processed / max_val * 0.95

    if mode == 'oculto' and oculto_full is not None:
        end = min(start_sample + len(oculto_full), len(L_processed))
        seg_len = end - start_sample
        if seg_len > 0:
            L_processed[start_sample:end] += oculto_full[:seg_len]
            R_processed[start_sample:end] += oculto_full[:seg_len]

    return np.stack([L_processed, R_processed])


def fmt_mmss(seconds: float) -> str:
    seconds = max(0.0, float(seconds))
    m = int(seconds // 60)
    s = seconds - m * 60
    return f'{m:02d}:{s:05.2f}'


def run(config: dict) -> None:
    input_file = config['input']
    output_file = config['output']
    mode = config.get('mode', 'suave')
    oculto_file = config.get('oculto')
    oculto_volume = float(config.get('oculto_volume', 0.005))
    start_sec = float(config.get('start_sec', 0.0))
    clean_metadata = bool(config.get('clean_metadata', True))
    compress_enabled = bool(config.get('compress', False))
    compress_pct = float(config.get('compress_pct', 30.0))

    if mode not in ('suave', 'oculto', 'clean'):
        raise ValueError(f'Modo inválido: {mode!r}')

    log(f'[cloaker] modo={mode}, start_sec={start_sec:.2f}, '
        f'oculto={"yes" if oculto_file else "no"}, vol={oculto_volume:.4f}, '
        f'clean_meta={clean_metadata}, compress={compress_enabled}'
        + (f' ({compress_pct:.0f}%)' if compress_enabled else ''))

    tmpdir = tempfile.mkdtemp(prefix='hiddencopy_')
    temp_audio = os.path.join(tmpdir, 'temp_extract.wav')
    processed_audio = os.path.join(tmpdir, 'processed.wav')
    oculto_extracted = os.path.join(tmpdir, 'oculto_extracted.wav')
    passlog = os.path.join(tmpdir, 'ffmpeg2pass')

    try:
        log('[cloaker] extraindo áudio do vídeo...')
        subprocess.run(
            [FFMPEG, '-y', '-i', input_file, '-vn',
             '-acodec', 'pcm_s16le', '-ar', '44100', '-ac', '2', temp_audio],
            check=True, capture_output=True
        )

        audio, sr = librosa.load(temp_audio, sr=44100, mono=False)
        if audio.ndim == 1:
            audio = np.stack([audio, audio])

        total_samples = audio.shape[1]
        start_sample = int(round(start_sec * sr))
        start_sample = max(0, min(start_sample, total_samples))

        if start_sample >= total_samples:
            raise RuntimeError('start_sec fora da duração do vídeo')

        oculto_segment = None
        if mode == 'oculto':
            if not oculto_file or not os.path.isfile(oculto_file):
                raise RuntimeError('Modo "oculto" requer arquivo oculto válido')

            oculto_load = oculto_file
            oc_ext = Path(oculto_file).suffix.lower()
            if oc_ext in ('.mp4', '.mov', '.mkv', '.webm', '.avi', '.m4v'):
                log(f'[cloaker] vídeo em oculto ({oc_ext}); extraindo trilha de áudio...')
                subprocess.run(
                    [FFMPEG, '-y', '-i', oculto_file, '-vn',
                     '-acodec', 'pcm_s16le', '-ar', str(sr), '-ac', '1', oculto_extracted],
                    check=True, capture_output=True
                )
                oculto_load = oculto_extracted

            log('[cloaker] carregando MP3 oculto...')
            oculto, _ = librosa.load(oculto_load, sr=sr, mono=True)
            interval_len = total_samples - start_sample
            oc_dur = len(oculto) / sr
            iv_dur = interval_len / sr
            if len(oculto) < interval_len:
                pad = np.zeros(interval_len - len(oculto), dtype=oculto.dtype)
                oculto = np.concatenate([oculto, pad])
                log(f'[cloaker] oculto ({oc_dur:.2f}s) menor que intervalo ({iv_dur:.2f}s); silêncio após o fim do MP3.')
            elif len(oculto) > interval_len:
                log(f'[cloaker] oculto ({oc_dur:.2f}s) maior que intervalo ({iv_dur:.2f}s); cortando.')
            oculto_segment = (oculto[:interval_len] * oculto_volume).astype(np.float32, copy=False)
            log(f'[cloaker] MP3 oculto (vol={oculto_volume:.4f}) será inserido a partir de {fmt_mmss(start_sec)}.')

        if start_sec > 0:
            log(f'[cloaker] padrão uniforme; supressão a partir de {fmt_mmss(start_sec)}, crossfade Linear 1200ms.')
            final = process_uniform(audio, sr, mode, oculto_segment, start_sample)
        else:
            log('[cloaker] processando vídeo inteiro (sem start time).')
            segment_L = audio[0, start_sample:]
            processed = process_segment(segment_L, sr, mode, oculto_segment)
            if start_sample > 0:
                pre = audio[:, :start_sample]
                final = np.concatenate([pre, processed], axis=1)
            else:
                final = processed

        sf.write(processed_audio, final.T, sr, subtype='PCM_16')

        meta_flags = META_FLAGS if clean_metadata else []

        if compress_enabled:
            in_size = os.path.getsize(input_file)
            duration_s = total_samples / sr
            target_bytes = in_size * (compress_pct / 100.0)
            audio_kbps = 192
            total_kbps = (target_bytes * 8) / duration_s / 1000.0
            video_kbps = max(100, total_kbps - audio_kbps)
            vbr = int(round(video_kbps))
            log(f'[cloaker] compressão {compress_pct:.0f}% -> video {vbr} kbps + audio {audio_kbps} kbps (libx264 2-pass)')

            log('[cloaker] pass 1/2...')
            subprocess.run(
                [FFMPEG, '-y', '-i', input_file,
                 '-c:v', 'libx264', '-preset', 'medium',
                 '-pix_fmt', 'yuv420p', '-profile:v', 'high',
                 '-b:v', f'{vbr}k', '-pass', '1', '-passlogfile', passlog,
                 '-an', '-f', 'mp4', os.devnull],
                check=True, capture_output=True
            )
            log('[cloaker] pass 2/2 (mesclando áudio processado)...')
            subprocess.run(
                [FFMPEG, '-y', '-i', input_file, '-i', processed_audio,
                 '-c:v', 'libx264', '-preset', 'medium',
                 '-pix_fmt', 'yuv420p', '-profile:v', 'high',
                 '-b:v', f'{vbr}k', '-pass', '2', '-passlogfile', passlog,
                 '-c:a', 'aac', '-b:a', f'{audio_kbps}k',
                 '-map', '0:v:0', '-map', '1:a:0', '-shortest',
                 *meta_flags,
                 '-movflags', '+faststart',
                 output_file],
                check=True, capture_output=True
            )
        else:
            log('[cloaker] mesclando áudio processado com vídeo (libx264 CRF 18 + yuv420p + faststart)...')
            subprocess.run(
                [FFMPEG, '-y', '-i', input_file, '-i', processed_audio,
                 '-c:v', 'libx264', '-preset', 'medium',
                 '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-crf', '18',
                 '-c:a', 'aac', '-b:a', '320k',
                 '-map', '0:v:0', '-map', '1:a:0', '-shortest',
                 *meta_flags,
                 '-movflags', '+faststart',
                 output_file],
                check=True, capture_output=True
            )

        in_size = os.path.getsize(input_file)
        out_size = os.path.getsize(output_file)
        log(f'[cloaker] tamanho: {in_size/1024/1024:.2f} MB -> {out_size/1024/1024:.2f} MB ({out_size/in_size*100:.1f}%)')
        log(f'[cloaker] OK: {output_file}')
    finally:
        cleanup = [temp_audio, processed_audio, oculto_extracted,
                   f'{passlog}-0.log', f'{passlog}-0.log.mbtree']
        for f in cleanup:
            try:
                if os.path.isfile(f):
                    os.remove(f)
            except OSError:
                pass
        try:
            os.rmdir(tmpdir)
        except OSError:
            pass


def main() -> int:
    if len(sys.argv) < 2:
        print('Uso: cloaker.py <json_config>', file=sys.stderr)
        return 1
    try:
        config = json.loads(sys.argv[1])
    except json.JSONDecodeError as e:
        print(f'JSON inválido: {e}', file=sys.stderr)
        return 1
    try:
        run(config)
    except subprocess.CalledProcessError as e:
        stderr = e.stderr.decode('utf-8', errors='ignore') if isinstance(e.stderr, (bytes, bytearray)) else str(e)
        print(f'ffmpeg falhou: {stderr}', file=sys.stderr)
        return 1
    except Exception as e:
        print(f'Erro: {e}', file=sys.stderr)
        traceback.print_exc()
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
