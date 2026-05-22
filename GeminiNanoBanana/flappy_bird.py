import pygame
import sys
import os
import random
import json
import math
import struct
import threading

# 1. Khởi tạo Pygame và Mixer (22050Hz, 16-bit, Mono)
pygame.init()
pygame.mixer.init(frequency=22050, size=-16, channels=1)

# Cấu hình kích thước cửa sổ (Tỷ lệ màn hình dọc Flappy Bird)
WIDTH, HEIGHT = 400, 600
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Gemini Nano Banana - Retro Flappy Bird")
clock = pygame.time.Clock()
FPS = 60

# Đường dẫn thư mục tài nguyên
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BG_PATH = os.path.join(BASE_DIR, "gemini_cosmic_background.png")
BANANA_PATH = os.path.join(BASE_DIR, "gemini_banana_player.png")
HIGHSCORE_PATH = os.path.join(BASE_DIR, "highscore.json")

# Định nghĩa hằng số game
GROUND_Y = HEIGHT - 64  # Vị trí mặt đất dựa trên ảnh nền

# 2. Các hàm sinh âm thanh Retro dạng 8-bit/16-bit (Giả lập MIDI/Chiptune)
def to_varlen(val):
    if val == 0:
        return b'\x00'
    res = bytearray()
    while val > 0:
        res.append((val & 0x7f) | 0x80)
        val >>= 7
    res[0] &= 0x7f
    res.reverse()
    return bytes(res)

def create_midi_file(filepath):
    # SMF Format 1, 3 tracks, 96 ticks per quarter note
    # Header: Format=1, Tracks=3, Division=96 (0x0060)
    header = b'MThd\x00\x00\x00\x06\x00\x01\x00\x03\x00\x60'
    
    # --- Track 1: Conductor (Tempo, Track Name) ---
    t1_data = bytearray()
    t1_data.extend(b'\x00\xFF\x03\x0cGemini Music')  # Name
    # Set Tempo: 125 BPM -> 480000 microseconds per beat -> 0x075300
    t1_data.extend(b'\x00\xFF\x51\x03\x07\x53\x00')
    t1_data.extend(b'\x00\xFF\x2F\x00')  # End of Track
    t1_chunk = b'MTrk' + struct.pack('>I', len(t1_data)) + t1_data
    
    # --- Track 2: Lead Melody (Channel 0) ---
    t2_data = bytearray()
    t2_data.extend(b'\x00\xFF\x03\x0bGemini Lead')
    t2_data.extend(b'\x00\xC0\x50')  # Program Change: Square Lead (80 = 0x50)
    
    # Melody notes (Note, Duration, rest_after)
    # 96 ticks = 1 beat (quarter note), 48 ticks = 1/2 beat (eighth note)
    melody = [
        # Measure 1
        (67, 48), (70, 48), (72, 96),
        # Measure 2
        (67, 48), (70, 48), (72, 48), (75, 48),
        # Measure 3
        (74, 96), (67, 48), (65, 48),
        # Measure 4
        (67, 96), (0, 96),
        
        # Measure 5
        (72, 48), (75, 48), (77, 96),
        # Measure 6
        (79, 48), (77, 48), (75, 48), (72, 48),
        # Measure 7
        (74, 96), (70, 48), (67, 48),
        # Measure 8
        (72, 96), (0, 96)
    ]
    
    current_delta = 0
    for note, duration in melody:
        if note == 0:
            current_delta += duration
        else:
            # Note On (Channel 0, note, velocity 90)
            t2_data.extend(to_varlen(current_delta))
            t2_data.extend(bytes([0x90, note, 90]))
            
            # Note Off (Channel 0, note, velocity 0)
            t2_data.extend(to_varlen(duration))
            t2_data.extend(bytes([0x90, note, 0]))
            
            current_delta = 0
            
    t2_data.extend(b'\x00\xFF\x2F\x00')  # End of Track
    t2_chunk = b'MTrk' + struct.pack('>I', len(t2_data)) + t2_data
    
    # --- Track 3: Synth Bass (Channel 1) ---
    t3_data = bytearray()
    t3_data.extend(b'\x00\xFF\x03\x0bGemini Bass')
    t3_data.extend(b'\x00\xC1\x26')  # Program Change: Synth Bass 1 (38 = 0x26)
    
    # Bassline notes (Note, Duration)
    # Repeating driving rhythm in C minor scale (C, Eb, G, F)
    # Playing lower octave (notes 48, 51, 55, 53)
    bass = [
        # Measure 1 (C)
        (48, 48), (48, 48), (48, 48), (48, 48),
        # Measure 2 (Eb)
        (51, 48), (51, 48), (51, 48), (51, 48),
        # Measure 3 (G)
        (55, 48), (55, 48), (55, 48), (55, 48),
        # Measure 4 (F)
        (53, 48), (53, 48), (53, 48), (53, 48),
        
        # Measure 5 (C)
        (48, 48), (48, 48), (48, 48), (48, 48),
        # Measure 6 (Eb)
        (51, 48), (51, 48), (51, 48), (51, 48),
        # Measure 7 (Bb)
        (46, 48), (46, 48), (46, 48), (46, 48),
        # Measure 8 (C)
        (48, 48), (48, 48), (48, 48), (48, 48)
    ]
    
    current_delta = 0
    for note, duration in bass:
        # Note On (Channel 1, note, velocity 80)
        t3_data.extend(to_varlen(current_delta))
        t3_data.extend(bytes([0x91, note, 80]))
        
        # Note Off (Channel 1, note, velocity 0)
        t3_data.extend(to_varlen(duration))
        t3_data.extend(bytes([0x91, note, 0]))
        
        current_delta = 0
        
    t3_data.extend(b'\x00\xFF\x2F\x00')  # End of Track
    t3_chunk = b'MTrk' + struct.pack('>I', len(t3_data)) + t3_data
    
    # Write to file
    with open(filepath, 'wb') as f:
        f.write(header)
        f.write(t1_chunk)
        f.write(t2_chunk)
        f.write(t3_chunk)

def generate_jump_sound():
    sample_rate = 22050
    duration = 0.12
    num_samples = int(sample_rate * duration)
    samples = []
    for i in range(num_samples):
        t = float(i) / sample_rate
        # Âm vực tăng dần nhanh chóng từ 450Hz đến 900Hz (Hiệu ứng bay nhảy)
        freq = 450 + 450 * (t / duration)
        # Sử dụng sóng vuông (square wave) tạo cảm giác âm thanh NES cổ điển
        val = 1.0 if math.sin(2 * math.pi * freq * t) >= 0 else -1.0
        val = int(val * 3500)  # Cân chỉnh âm lượng vừa phải
        samples.append(val)
    byte_data = struct.pack(f"<{len(samples)}h", *samples)
    return pygame.mixer.Sound(buffer=byte_data)

def generate_score_sound():
    sample_rate = 22050
    duration1 = 0.08
    duration2 = 0.18
    samples = []
    
    # Nốt thứ nhất (B5 - 987.77 Hz)
    for i in range(int(sample_rate * duration1)):
        t = float(i) / sample_rate
        val = 1.0 if math.sin(2 * math.pi * 987.77 * t) >= 0 else -1.0
        val = int(val * 3500)
        samples.append(val)
        
    # Nốt thứ hai cao hơn (E6 - 1318.51 Hz) - Giống tiếng ăn xu của Mario
    for i in range(int(sample_rate * duration2)):
        t = float(i) / sample_rate
        val = 1.0 if math.sin(2 * math.pi * 1318.51 * t) >= 0 else -1.0
        val = int(val * 3500)
        samples.append(val)
        
    byte_data = struct.pack(f"<{len(samples)}h", *samples)
    return pygame.mixer.Sound(buffer=byte_data)

def generate_gameover_sound():
    sample_rate = 22050
    duration = 0.5
    num_samples = int(sample_rate * duration)
    samples = []
    for i in range(num_samples):
        t = float(i) / sample_rate
        # Âm vực giảm dần trầm xuống từ 500Hz về 60Hz (Hiệu ứng đâm/thua cuộc)
        freq = max(60, 500 - 440 * (t / duration))
        # Sử dụng sóng tam giác (triangle wave) cho âm thanh trầm ấm hơn
        val = 2.0 * abs(2.0 * (freq * t - math.floor(freq * t + 0.5))) - 1.0
        # Giảm dần âm lượng (Fade-out)
        volume = 6000 * (1.0 - t / duration)
        val = int(val * volume)
        samples.append(val)
    byte_data = struct.pack(f"<{len(samples)}h", *samples)
    return pygame.mixer.Sound(buffer=byte_data)
# Hỗ trợ lấy câu thoại AI động từ Gemini
ai_quote = "Hãy chứng minh bạn không phải là quả chuối héo!"
ai_quote_loading = False

def fetch_ai_quote_async(score, state):
    global ai_quote, ai_quote_loading
    if ai_quote_loading:
        return
    def run():
        global ai_quote, ai_quote_loading
        ai_quote_loading = True
        try:
            from gemini_helper import get_retro_commentary
            res = get_retro_commentary(score, state)
            if res:
                ai_quote = res
        except Exception as e:
            print("Error loading AI commentary:", e)
        finally:
            ai_quote_loading = False
    threading.Thread(target=run, daemon=True).start()

# 3. Lớp nhân vật chính (Gemini Nano Banana)
class BananaPlayer:
    def __init__(self, x, y, image_path):
        # Nạp ảnh gốc và thiết lập colorkey (nền đen trong suốt)
        raw_img = pygame.image.load(image_path).convert_alpha()
        
        # Căn chỉnh kích thước chuối (50x35)
        self.original_image = pygame.transform.scale(raw_img, (50, 35))
        self.image = self.original_image.copy()
        
        self.x = x
        self.y = y
        self.rect = self.image.get_rect(center=(x, y))
        
        # Vật lý
        self.velocity = 0
        self.gravity = 0.4
        self.jump_strength = -7.5
        self.max_fall_speed = 9
        self.angle = 0

    def update(self):
        # Áp dụng trọng lực
        self.velocity += self.gravity
        if self.velocity > self.max_fall_speed:
            self.velocity = self.max_fall_speed
            
        self.y += self.velocity
        self.rect.centery = int(self.y)
        
        # Đảm bảo chuối không bay vượt quá đỉnh màn hình
        if self.y < 0:
            self.y = 0
            self.velocity = 0
            self.rect.centery = int(self.y)

        # Tính góc quay dựa trên vận tốc
        target_angle = -self.velocity * 5
        # Giới hạn góc để nhìn mượt mà hơn
        if target_angle > 30: target_angle = 30
        if target_angle < -60: target_angle = -60
        
        # Chuyển góc quay mượt mà sang target_angle
        self.angle += (target_angle - self.angle) * 0.2
        
        # Xoay ảnh quả chuối
        self.image = pygame.transform.rotate(self.original_image, self.angle)
        self.rect = self.image.get_rect(center=(self.x, int(self.y)))

    def jump(self):
        self.velocity = self.jump_strength

    def draw(self, surface):
        surface.blit(self.image, self.rect)

    def get_mask(self):
        return pygame.mask.from_surface(self.image)

# Lớp hạt phát sáng dạng ngôi sao 4 cánh (Gemini Spark Trail)
class StarParticle:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.size = random.uniform(3.0, 6.0)
        self.decay = random.uniform(0.12, 0.22)
        self.color = random.choice([
            (0, 240, 255),    # Cyan phát sáng
            (255, 0, 200),    # Magenta phát sáng
            (200, 100, 255),  # Light Purple
            (255, 255, 255)   # White
        ])
        self.vx = random.uniform(-2.5, -1.0)
        self.vy = random.uniform(-0.8, 0.8)

    def update(self):
        self.x += self.vx
        self.y += self.vy
        self.size -= self.decay

    def draw(self, surface):
        if self.size > 0:
            s = int(self.size)
            # Vẽ hình chữ thập ngôi sao retro (+)
            pygame.draw.line(surface, self.color, (int(self.x), int(self.y - s)), (int(self.x), int(self.y + s)), 2)
            pygame.draw.line(surface, self.color, (int(self.x - s), int(self.y)), (int(self.x + s), int(self.y)), 2)

# Hàm vẽ bảng kính mờ (Glassmorphism Panel) phát sáng viền Neon
def draw_glass_panel(surface, x, y, width, height, bg_color=(20, 15, 35, 170), border_color=(0, 240, 255), border_width=3):
    panel_surf = pygame.Surface((width, height), pygame.SRCALPHA)
    panel_surf.fill(bg_color)
    pygame.draw.rect(panel_surf, border_color, (0, 0, width, height), border_width)
    surface.blit(panel_surf, (x, y))

# Hàm vẽ ngôi sao 4 cánh vector (Gemini Sparkle Symbol)
def draw_gemini_star(surface, cx, cy, size, color=(0, 240, 255)):
    points = [
        (cx, cy - size),
        (cx + size // 3, cy - size // 3),
        (cx + size, cy),
        (cx + size // 3, cy + size // 3),
        (cx, cy + size),
        (cx - size // 3, cy + size // 3),
        (cx - size, cy),
        (cx - size // 3, cy - size // 3)
    ]
    pygame.draw.polygon(surface, color, points)

# 4. Lớp cột ống nước (Mario Style Pipe)
class MarioPipe:
    def __init__(self, x, speed):
        self.x = x
        self.speed = speed
        self.width = 75
        self.gap = 140  # Khoảng cách để chuối chui qua
        
        # Chiều cao ống ngẫu nhiên
        self.top_height = random.randint(50, HEIGHT - self.gap - 120)
        self.bottom_height = HEIGHT - self.gap - self.top_height - 64  # Trừ đi mặt đất (64px)
        
        self.passed = False
        
        # Tạo bề mặt (Surfaces) cho ống trên và ống dưới để vẽ chi tiết pixel art
        self.top_surface = self.create_pipe_surface(self.width, self.top_height, is_top=True)
        self.bottom_surface = self.create_pipe_surface(self.width, self.bottom_height, is_top=False)
        
        # Rect va chạm
        self.top_rect = pygame.Rect(self.x, 0, self.width, self.top_height)
        self.bottom_rect = pygame.Rect(self.x, HEIGHT - 64 - self.bottom_height, self.width, self.bottom_height)

    def create_pipe_surface(self, width, height, is_top):
        # Tạo surface hỗ trợ kênh alpha
        pipe_surf = pygame.Surface((width, height), pygame.SRCALPHA)
        pipe_surf.fill((0, 0, 0, 0))  # Trong suốt
        
        # Màu sắc phong cách Mario truyền thống (Classic Green Pipe)
        GREEN_BODY = (115, 191, 46)      # Màu xanh lá chính
        GREEN_LIGHT = (184, 248, 24)     # Vệt sáng màu xanh nhạt
        GREEN_DARK = (54, 114, 15)        # Viền tối/bóng
        BLACK = (0, 0, 0)                # Viền đen sắc nét
        
        # 1. Vẽ thân ống chính
        body_y = 0 if not is_top else 26
        body_h = height - 26
        if is_top:
            body_y = 0
            body_h = height - 26

        # Vẽ nền thân ống màu xanh lá
        pygame.draw.rect(pipe_surf, GREEN_BODY, (4, body_y, width - 8, body_h))
        # Viền đen xung quanh
        pygame.draw.rect(pipe_surf, BLACK, (4, body_y, width - 8, body_h), 2)
        
        # Vẽ các vệt sáng/tối dọc thân để tạo khối tròn 3D của Mario
        # Vệt sáng lớn bên trái
        pygame.draw.rect(pipe_surf, GREEN_LIGHT, (8, body_y + 1, 6, body_h - 2))
        # Vệt sáng nhỏ hơn kế bên
        pygame.draw.rect(pipe_surf, GREEN_LIGHT, (16, body_y + 1, 3, body_h - 2))
        # Bóng tối bên phải
        pygame.draw.rect(pipe_surf, GREEN_DARK, (width - 20, body_y + 1, 8, body_h - 2))
        pygame.draw.rect(pipe_surf, GREEN_DARK, (width - 12, body_y + 1, 4, body_h - 2))

        # 2. Vẽ phần đầu gờ ống (Pipe Cap)
        cap_y = height - 26 if is_top else 0
        cap_h = 26
        
        # Nền gờ ống màu xanh lá
        pygame.draw.rect(pipe_surf, GREEN_BODY, (0, cap_y, width, cap_h))
        # Viền đen gờ ống
        pygame.draw.rect(pipe_surf, BLACK, (0, cap_y, width, cap_h), 2)
        
        # Vệt sáng gờ ống bên trái (đồng bộ với thân)
        pygame.draw.rect(pipe_surf, GREEN_LIGHT, (4, cap_y + 2, 8, cap_h - 4))
        pygame.draw.rect(pipe_surf, GREEN_LIGHT, (14, cap_y + 2, 3, cap_h - 4))
        # Bóng tối gờ ống bên phải
        pygame.draw.rect(pipe_surf, GREEN_DARK, (width - 22, cap_y + 2, 8, cap_h - 4))
        pygame.draw.rect(pipe_surf, GREEN_DARK, (width - 12, cap_y + 2, 6, cap_h - 4))
        
        return pipe_surf

    def update(self):
        self.x -= self.speed
        self.top_rect.x = int(self.x)
        self.bottom_rect.x = int(self.x)

    def draw(self, surface):
        surface.blit(self.top_surface, self.top_rect)
        surface.blit(self.bottom_surface, self.bottom_rect)

    def collides_with(self, banana):
        # Trả về True nếu xảy ra va chạm Pixel-Perfect bằng mask
        banana_mask = banana.get_mask()
        top_mask = pygame.mask.from_surface(self.top_surface)
        bottom_mask = pygame.mask.from_surface(self.bottom_surface)
        
        # Tính offset
        top_offset = (self.top_rect.x - banana.rect.x, self.top_rect.y - banana.rect.y)
        bottom_offset = (self.bottom_rect.x - banana.rect.x, self.bottom_rect.y - banana.rect.y)
        
        # Kiểm tra đè lên nhau
        top_collision = banana_mask.overlap(top_mask, top_offset)
        bottom_collision = banana_mask.overlap(bottom_mask, bottom_offset)
        
        return top_collision or bottom_collision

# 5. Các hàm phụ trợ
def load_high_score():
    if os.path.exists(HIGHSCORE_PATH):
        try:
            with open(HIGHSCORE_PATH, 'r') as f:
                data = json.load(f)
                return data.get("high_score", 0)
        except:
            return 0
    return 0

def save_high_score(score):
    try:
        with open(HIGHSCORE_PATH, 'w') as f:
            json.dump({"high_score": score}, f)
    except Exception as e:
        print("Error saving high score:", e)

def draw_text_retro(surface, text, font, size, x, y, color=(255, 255, 255), align="center"):
    # Hỗ trợ danh sách font để tối ưu hiển thị tiếng Việt Unicode
    font_list = [font, "Segoe UI", "Arial", "Calibri", "sans-serif"]
    font_obj = pygame.font.SysFont(font_list, size, bold=True)
    # Tạo chữ bóng mờ (Drop Shadow) để giống retro pixel
    shadow_offset = 2
    shadow_surface = font_obj.render(text, True, (0, 0, 0))
    text_surface = font_obj.render(text, True, color)
    
    shadow_rect = shadow_surface.get_rect()
    text_rect = text_surface.get_rect()
    
    if align == "center":
        shadow_rect.center = (x + shadow_offset, y + shadow_offset)
        text_rect.center = (x, y)
    elif align == "left":
        shadow_rect.topleft = (x + shadow_offset, y + shadow_offset)
        text_rect.topleft = (x, y)
        
    surface.blit(shadow_surface, shadow_rect)
    surface.blit(text_surface, text_rect)

# 6. Vòng lặp Game chính
def main():
    # Nạp ảnh nền pixel art
    raw_bg = pygame.image.load(BG_PATH).convert()
    bg_image = pygame.transform.scale(raw_bg, (WIDTH, HEIGHT))
    
    # Khởi tạo âm thanh retro
    jump_sound = generate_jump_sound()
    score_sound = generate_score_sound()
    gameover_sound = generate_gameover_sound()
    
    # Tạo và phát nhạc nền MIDI
    midi_path = os.path.join(BASE_DIR, "bgm.mid")
    try:
        create_midi_file(midi_path)
        pygame.mixer.music.load(midi_path)
        pygame.mixer.music.play(-1)  # Phát lặp vô hạn
    except Exception as e:
        print("Error initializing MIDI background music:", e)
    
    # Quản lý điểm cao nhất
    high_score = load_high_score()
    
    # Các biến trạng thái game
    # Trạng thái: 'START', 'PLAYING', 'GAMEOVER'
    state = 'START'
    score = 0
    
    # Khởi tạo đối tượng
    banana = BananaPlayer(100, HEIGHT // 2, BANANA_PATH)
    pipes = []
    particles = []
    
    # Cuộn nền
    bg_x = 0
    bg_speed = 1.5
    
    # Quản lý tạo ống
    pipe_spawn_timer = 0
    pipe_spawn_delay = 100  # Spawn ống nước sau mỗi khoảng 100 frames (~1.6s)
    pipe_speed = 3
    
    # Hiệu ứng rung màn hình
    shake_timer = 0
    shake_intensity = 0

    # Kích hoạt tải câu thoại AI đầu tiên cho màn hình START
    fetch_ai_quote_async(0, 'START')
    
    running = True
    while running:
        # Nhận sự kiện
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
                
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False
                    
                if event.key == pygame.K_SPACE:
                    if state == 'START':
                        state = 'PLAYING'
                        banana.jump()
                        jump_sound.play()
                    elif state == 'PLAYING':
                        banana.jump()
                        jump_sound.play()
                    elif state == 'GAMEOVER':
                        # Chơi lại game
                        state = 'PLAYING'
                        banana = BananaPlayer(100, HEIGHT // 2, BANANA_PATH)
                        pipes = []
                        particles = []
                        score = 0
                        jump_sound.play()
                        try:
                            pygame.mixer.music.play(-1)
                        except:
                            pass
                        
                if event.key == pygame.K_r:
                    if state == 'GAMEOVER':
                        state = 'PLAYING'
                        banana = BananaPlayer(100, HEIGHT // 2, BANANA_PATH)
                        pipes = []
                        particles = []
                        score = 0
                        jump_sound.play()
                        try:
                            pygame.mixer.music.play(-1)
                        except:
                            pass

            # Hỗ trợ click chuột để nhảy
            if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                if state == 'START':
                    state = 'PLAYING'
                    banana.jump()
                    jump_sound.play()
                elif state == 'PLAYING':
                    banana.jump()
                    jump_sound.play()
                elif state == 'GAMEOVER':
                    state = 'PLAYING'
                    banana = BananaPlayer(100, HEIGHT // 2, BANANA_PATH)
                    pipes = []
                    particles = []
                    score = 0
                    jump_sound.play()
                    try:
                        pygame.mixer.music.play(-1)
                    except:
                        pass

        # CẬP NHẬT TRẠNG THÁI GAME
        if state == 'START':
            # Quả chuối dập dềnh bay nhẹ theo hình sin ở màn hình chờ
            banana.y = (HEIGHT // 2) + math.sin(pygame.time.get_ticks() * 0.007) * 12
            banana.rect.centery = int(banana.y)
            banana.angle = 0
            
            # Cuộn nền chậm rãi
            bg_x -= bg_speed
            if bg_x <= -WIDTH:
                bg_x = 0
                
        elif state == 'PLAYING':
            # Cập nhật nhân vật
            banana.update()
            
            # Tạo hiệu ứng hạt vệt sao (Star Trail) từ đuôi chuối
            if random.random() < 0.45:
                particles.append(StarParticle(banana.x - 20, banana.y))
                
            for p in particles[:]:
                p.update()
                if p.size <= 0:
                    particles.remove(p)
            
            # Cuộn nền
            bg_x -= bg_speed
            if bg_x <= -WIDTH:
                bg_x = 0
                
            # Cập nhật các ống nước
            pipe_spawn_timer += 1
            if pipe_spawn_timer >= pipe_spawn_delay:
                pipes.append(MarioPipe(WIDTH + 50, pipe_speed))
                pipe_spawn_timer = 0
                
            for pipe in pipes[:]:
                pipe.update()
                
                # Kiểm tra va chạm ống nước
                if pipe.collides_with(banana):
                    state = 'GAMEOVER'
                    fetch_ai_quote_async(score, 'GAMEOVER')
                    try:
                        pygame.mixer.music.stop()
                    except:
                        pass
                    gameover_sound.play()
                    shake_timer = 15  # Kích hoạt rung màn hình 15 frames
                    shake_intensity = 8
                    if score > high_score:
                        high_score = score
                        save_high_score(high_score)
                        
                # Tính điểm khi chuối vượt qua ống
                if not pipe.passed and pipe.x + pipe.width < banana.x:
                    pipe.passed = True
                    score += 1
                    score_sound.play()
                    
                # Xóa ống khi ra khỏi màn hình
                if pipe.x < -pipe.width:
                    pipes.remove(pipe)
            
            # Kiểm tra va chạm với mặt đất
            if banana.rect.bottom >= GROUND_Y:
                banana.rect.bottom = GROUND_Y
                state = 'GAMEOVER'
                fetch_ai_quote_async(score, 'GAMEOVER')
                try:
                    pygame.mixer.music.stop()
                except:
                    pass
                gameover_sound.play()
                shake_timer = 15
                shake_intensity = 8
                if score > high_score:
                    high_score = score
                    save_high_score(high_score)

        elif state == 'GAMEOVER':
            # Quả chuối rơi tự do xuống đất khi thua
            if banana.rect.bottom < GROUND_Y:
                banana.update()
            else:
                banana.rect.bottom = GROUND_Y

        # Xử lý hiệu ứng rung màn hình
        offset_x, offset_y = 0, 0
        if shake_timer > 0:
            offset_x = random.randint(-shake_intensity, shake_intensity)
            offset_y = random.randint(-shake_intensity, shake_intensity)
            shake_timer -= 1

        # VẼ ĐỒ HỌA LÊN MÀN HÌNH
        game_surf = pygame.Surface((WIDTH, HEIGHT))
        
        # Vẽ nền cuộn
        game_surf.blit(bg_image, (bg_x, 0))
        game_surf.blit(bg_image, (bg_x + WIDTH, 0))
        
        # Vẽ ống nước
        for pipe in pipes:
            pipe.draw(game_surf)
            
        # Vẽ các hạt phát sáng
        for p in particles:
            p.draw(game_surf)
            
        # Vẽ nhân vật quả chuối
        banana.draw(game_surf)
        
        # Hiển thị UI theo trạng thái
        if state == 'START':
            # Chữ tiêu đề lấp lánh màu chuyển sắc (Chroma Gradient) của Gemini
            t_blend = (pygame.time.get_ticks() % 2000) / 2000.0
            r = int(0 * (1 - t_blend) + 255 * t_blend)
            g = int(240 * (1 - t_blend) + 0 * t_blend)
            b = int(255 * (1 - t_blend) + 200 * t_blend)
            title_color = (r, g, b)
            draw_text_retro(game_surf, "GEMINI NANO BANANA", "Impact", 32, WIDTH // 2, HEIGHT // 3 - 35, title_color)
            
            # Khung đối thoại kính mờ chứa câu thoại AI
            draw_glass_panel(game_surf, 30, 215, 340, 50, bg_color=(25, 20, 45, 170), border_color=(0, 240, 255), border_width=2)
            draw_gemini_star(game_surf, 50, 240, 7, color=(0, 240, 255))
            draw_text_retro(game_surf, f'"{ai_quote}"', "Arial", 12, WIDTH // 2 + 10, 240, (173, 216, 230))
            
            # Bảng điều khiển/hướng dẫn kính mờ
            draw_glass_panel(game_surf, 50, 290, 300, 150, bg_color=(20, 15, 35, 190), border_color=(255, 0, 200), border_width=2)
            draw_text_retro(game_surf, "HUONG DAN CHOI", "Impact", 20, WIDTH // 2, 320, (255, 255, 255))
            draw_text_retro(game_surf, "SPACE / Click: Nhay len", "Courier New", 15, WIDTH // 2, 360, (200, 200, 200))
            draw_text_retro(game_surf, f"Diem Cao Nhat: {high_score}", "Impact", 22, WIDTH // 2, 405, (255, 215, 0))
            
        elif state == 'PLAYING':
            # Hiển thị điểm số hiện tại ở góc trên
            draw_text_retro(game_surf, str(score), "Impact", 45, WIDTH // 2, 50, (255, 255, 255))
            
        elif state == 'GAMEOVER':
            # Bảng điểm Game Over màu đỏ neon phát sáng
            draw_text_retro(game_surf, "GAME OVER", "Impact", 46, WIDTH // 2, HEIGHT // 4 - 30, (255, 50, 50))
            
            # Khung đối thoại kính mờ chứa câu thoại AI động từ Gemini
            draw_glass_panel(game_surf, 30, 160, 340, 50, bg_color=(25, 20, 45, 170), border_color=(255, 215, 0), border_width=2)
            draw_gemini_star(game_surf, 50, 185, 7, color=(255, 215, 0))
            draw_text_retro(game_surf, f'"{ai_quote}"', "Arial", 12, WIDTH // 2 + 10, 185, (255, 255, 150))
            
            # Bảng hiển thị điểm số phong cách phi thuyền tương lai
            draw_glass_panel(game_surf, WIDTH // 2 - 120, HEIGHT // 2 - 70, 240, 140, bg_color=(20, 15, 35, 195), border_color=(0, 240, 255), border_width=3)
            
            # Vẽ các đường trạng thái neon trang trí
            pygame.draw.line(game_surf, (0, 240, 255), (WIDTH // 2 - 100, HEIGHT // 2), (WIDTH // 2 + 100, HEIGHT // 2), 1)
            
            draw_text_retro(game_surf, "DIEM SO", "Arial", 16, WIDTH // 2, HEIGHT // 2 - 45, (200, 200, 200))
            draw_text_retro(game_surf, str(score), "Impact", 28, WIDTH // 2, HEIGHT // 2 - 20, (255, 255, 255))
            
            draw_text_retro(game_surf, "DIEM CAO", "Arial", 16, WIDTH // 2, HEIGHT // 2 + 15, (200, 200, 200))
            draw_text_retro(game_surf, str(high_score), "Impact", 28, WIDTH // 2, HEIGHT // 2 + 40, (255, 215, 0))
            
            draw_text_retro(game_surf, "Nhan SPACE hoac R de choi lai", "Courier New", 15, WIDTH // 2, HEIGHT // 2 + 105, (255, 255, 255))
            draw_text_retro(game_surf, "ESC: Thoat", "Courier New", 14, WIDTH // 2, HEIGHT // 2 + 135, (200, 200, 200))

        # Áp dụng rung lắc màn hình bằng cách lệch tọa độ blit
        screen.blit(game_surf, (offset_x, offset_y))
        
        pygame.display.flip()
        clock.tick(FPS)

    pygame.quit()
    sys.exit()

if __name__ == "__main__":
    main()
