import numpy as np
import soundfile as sf
import librosa
import subprocess
import os
import sys
from scipy.ndimage import gaussian_filter1d

# ==================== CONFIGURAÇÕES ====================
if os.name == 'nt':
    FFMPEG_PATH = r'D:\HiddenCopy\ffmpeg_temp\ffmpeg-8.1-essentials_build\bin\ffmpeg.exe'
else:
    FFMPEG_PATH = 'ffmpeg'

if len(sys.argv) < 4:
    print("Uso: python mesclar_audio.py <input_video.mp4> <music.mp3> <output.mp4>")
    sys.exit(1)

input_file = sys.argv[1]
music_file = sys.argv[2]
output_file = sys.argv[3]

base_path = os.path.dirname(output_file)
temp_audio = os.path.join(base_path, 'temp_extract.wav')
processed_audio = os.path.join(base_path, 'processed_audio.wav')

print("Processando:")
print(f"   Vídeo : {os.path.basename(input_file)}")
print(f"   Música: {os.path.basename(music_file)}")
print(f"   Saída : {os.path.basename(output_file)}")

# Verificar arquivos
if not os.path.exists(input_file):
    print(f"ERRO: Vídeo não encontrado: {input_file}")
    sys.exit(1)
if not os.path.exists(music_file):
    print(f"ERRO: Música não encontrada: {music_file}")
    sys.exit(1)

# ==================== EXTRAIR ÁUDIO DO VÍDEO ====================
print("Extraindo áudio do vídeo...")
subprocess.run([FFMPEG_PATH, '-y', '-i', input_file, '-vn', '-acodec', 'pcm_s16le', 
                '-ar', '44100', '-ac', '2', temp_audio], check=True, capture_output=True)

# Carregar áudios
audio, sr = librosa.load(temp_audio, sr=44100, mono=False)
if audio.ndim == 1:
    audio = np.stack([audio, audio])

oculto, _ = librosa.load(music_file, sr=sr, mono=True)

# Ajustar tamanho do áudio oculto
target_len = audio.shape[1]
if len(oculto) < target_len:
    repeticoes = int(np.ceil(target_len / len(oculto)))
    oculto = np.tile(oculto, repeticoes)
oculto = oculto[:target_len]

# ==================== PROCESSAMENTO DO ÁUDIO ORIGINAL ====================
print("Processando áudio (removendo voz)...")
n_fft = 2048
hop_length = 512
win_length = 2048

L_channel = audio[0]
stft_L = librosa.stft(L_channel, n_fft=n_fft, hop_length=hop_length, win_length=win_length, window='hann')
mag_L = np.abs(stft_L)
phase_L = np.angle(stft_L)

freqs = librosa.fft_frequencies(sr=sr, n_fft=n_fft)

mask_vocal = (freqs >= 300) & (freqs <= 3400)
mask_low = freqs < 500

vocal_energy = np.sum(mag_L[mask_vocal, :], axis=0)
energy_smooth = np.convolve(vocal_energy, np.hanning(11)/np.hanning(11).sum(), mode='same')

threshold = np.percentile(energy_smooth, 40)
speech_mask = energy_smooth > threshold
speech_mask_smooth = gaussian_filter1d(speech_mask.astype(float), sigma=3) > 0.5

mag_L_processed = mag_L.copy()

for frame_idx in range(mag_L.shape[1]):
    if speech_mask_smooth[frame_idx]:
        mag_L_processed[mask_vocal, frame_idx] *= np.random.uniform(0.42, 0.58)
    else:
        mag_L_processed[mask_low, frame_idx] *= np.random.uniform(1.12, 1.35)

stft_L_processed = mag_L_processed * np.exp(1j * phase_L)
L_processed = librosa.istft(stft_L_processed, hop_length=hop_length, win_length=win_length, 
                           window='hann', length=len(L_channel))

R_processed = -L_processed

# Normalização
max_val = max(np.abs(L_processed).max(), np.abs(R_processed).max())
if max_val > 0:
    L_processed = L_processed / max_val * 0.92
    R_processed = R_processed / max_val * 0.92

# ==================== MESCLAGEM DO ÁUDIO OCULTO ====================
print("Mesclando áudio oculto...")
oculto_level = 0.00085                    # Volume do áudio escondido

speech_mask_resized = np.interp(
    np.linspace(0, len(speech_mask_smooth)-1, target_len),
    np.arange(len(speech_mask_smooth)),
    speech_mask_smooth.astype(float)
)

ducking = 1.0 - (speech_mask_resized * 0.35)

oculto_adjusted = oculto * oculto_level * ducking

L_final = L_processed + oculto_adjusted
R_final = R_processed + oculto_adjusted

stereo_output = np.stack([L_final, R_final])
stereo_output = np.clip(stereo_output, -0.98, 0.98)

sf.write(processed_audio, stereo_output.T, sr, subtype='PCM_16')

# ==================== CRIAR VÍDEO FINAL ====================
print("Criando vídeo final...")
subprocess.run([
    FFMPEG_PATH, '-y',
    '-i', input_file,
    '-i', processed_audio,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '320k',
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-shortest',
    output_file
], check=True)

# Limpeza
for f in [temp_audio, processed_audio]:
    if os.path.exists(f):
        os.remove(f)

print("PROCESSO CONCLUÍDO COM SUCESSO!")
print(f"Arquivo final: {output_file}")