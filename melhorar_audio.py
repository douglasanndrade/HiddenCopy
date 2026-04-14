import numpy as np
import soundfile as sf
import librosa
import subprocess
import os

# ==================== CONFIGURAÇÕES ====================

# Caminho do FFmpeg - usa do sistema (Docker) ou local (Windows)
if os.name == 'nt':
    FFMPEG_PATH = r'D:\HiddenCopy\ffmpeg_temp\ffmpeg-8.1-essentials_build\bin\ffmpeg.exe'
else:
    FFMPEG_PATH = 'ffmpeg'

# Receber caminhos via argumentos da linha de comando (como sua dashboard chama)
import sys
if len(sys.argv) >= 3:
    input_file = sys.argv[1]
    output_file = sys.argv[2]
else:
    # Fallback caso rode manualmente
    base_path = r'D:\HiddenCopy\dashboard\public\uploads'
    input_file = os.path.join(base_path, '867a0381-9d4b-49eb-a729-8c817c212929_input.mp4')
    output_file = os.path.join(base_path, '867a0381-9d4b-49eb-a729-8c817c212929_output.mp4')

# Arquivos temporários (mesmo diretório do input)
temp_audio = input_file.replace('_input.mp4', '_temp.wav')
processed_audio = input_file.replace('_input.mp4', '_processed.wav')

# ==================== FUNÇÃO PARA EXECUTAR FFMPEG ====================
def run_ffmpeg(cmd_list):
    try:
        result = subprocess.run(cmd_list, check=True, capture_output=True, text=True)
        return result
    except subprocess.CalledProcessError as e:
        print("ERRO ao executar FFmpeg:")
        print(e.stderr)
        raise
    except FileNotFoundError:
        print("ERRO: FFmpeg não encontrado!")
        print(f"Caminho usado: {FFMPEG_PATH}")
        print("Verifique se o ffmpeg.exe existe nesse caminho.")
        raise

# ==================== PROCESSAMENTO ====================

print("Iniciando melhoria de áudio...")

# 1. Extrair áudio do vídeo
print("1/4 - Extraindo áudio do vídeo...")
run_ffmpeg([
    FFMPEG_PATH, '-y', '-i', input_file,
    '-vn', '-acodec', 'pcm_s16le', '-ar', '44100', '-ac', '2',
    temp_audio
])

# 2. Carregar e processar áudio
print("2/4 - Processando áudio com STFT...")
audio, sr = librosa.load(temp_audio, sr=44100, mono=False)

# Garantir que seja stereo
if audio.ndim == 1:
    audio = np.stack([audio, audio])

# Parâmetros STFT
n_fft = 2048
hop_length = 512
win_length = 2048

L_channel = audio[0]
R_channel = audio[1]

# STFT do canal L
stft_L = librosa.stft(L_channel, n_fft=n_fft, hop_length=hop_length, 
                      win_length=win_length, window='hann')
mag_L = np.abs(stft_L)
phase_L = np.angle(stft_L)
freqs = librosa.fft_frequencies(sr=sr, n_fft=n_fft)

# Máscaras de frequência
mask_vocal = (freqs >= 300) & (freqs <= 3400)
mask_low = freqs < 500

# Detecção adaptativa de fala
vocal_energy = np.sum(mag_L[mask_vocal, :], axis=0)
energy_smooth = np.convolve(vocal_energy, np.hanning(11)/np.hanning(11).sum(), mode='same')
threshold = np.percentile(energy_smooth, 40)
speech_mask = energy_smooth > threshold

from scipy.ndimage import gaussian_filter1d
speech_mask_smooth = gaussian_filter1d(speech_mask.astype(float), sigma=3) > 0.5

# Processamento adaptativo
mag_L_processed = mag_L.copy()
for frame_idx in range(mag_L.shape[1]):
    if speech_mask_smooth[frame_idx]:
        # Durante fala: suprimir formantes vocais
        suppression_factor = np.random.uniform(0.18, 0.24)
        mag_L_processed[mask_vocal, frame_idx] *= suppression_factor
    else:
        # Durante silêncio: amplificar baixas frequências
        boost_factor = np.random.uniform(1.85, 2.15)
        mag_L_processed[mask_low, frame_idx] *= boost_factor

# Reconstruir canal L
stft_L_processed = mag_L_processed * np.exp(1j * phase_L)
L_processed = librosa.istft(stft_L_processed, hop_length=hop_length, 
                            win_length=win_length, window='hann', 
                            length=len(L_channel))

# Canal R com fase invertida
R_processed = -L_processed

# Normalização
max_val = max(np.abs(L_processed).max(), np.abs(R_processed).max())
if max_val > 0:
    L_processed = L_processed / max_val * 0.95
    R_processed = R_processed / max_val * 0.95

# Combinar canais
stereo_output = np.stack([L_processed, R_processed])

# Salvar áudio processado
sf.write(processed_audio, stereo_output.T, sr, subtype='PCM_16')

# 3. Mesclar com vídeo original
print("3/4 - Mesclando áudio processado com o vídeo...")
run_ffmpeg([
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
])

# 4. Limpar temporários
print("4/4 - Limpando arquivos temporários...")
if os.path.exists(temp_audio):
    os.remove(temp_audio)
if os.path.exists(processed_audio):
    os.remove(processed_audio)

print("Processamento concluído com sucesso!")
print(f"Arquivo final: {output_file}")