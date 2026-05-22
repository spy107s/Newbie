import os
import urllib.request
import json
import time

last_call_time = 0.0
MIN_CALL_INTERVAL = 8.0  # Minimum 8 seconds between API calls

def load_env():
    # Tìm tệp .env ở thư mục hiện tại hoặc tìm ngược lên các thư mục cha
    current_dir = os.path.dirname(os.path.abspath(__file__))
    for _ in range(4):
        env_path = os.path.join(current_dir, ".env")
        if os.path.exists(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            value = v.strip().strip("'").strip('"')
                            os.environ[k.strip()] = value
                if os.environ.get("GEMINI_API_KEY"):
                    break
            except Exception as e:
                print("Error reading .env file:", e)
        # Đi lên thư mục cha
        parent_dir = os.path.dirname(current_dir)
        if parent_dir == current_dir:
            break
        current_dir = parent_dir

# Tải cấu hình biến môi trường
load_env()

def get_gemini_api_key():
    return os.environ.get("GEMINI_API_KEY")

def get_retro_commentary(score, state):
    global last_call_time
    api_key = get_gemini_api_key()
    
    # Rate limit check to avoid 429
    now = time.time()
    if api_key and (now - last_call_time >= MIN_CALL_INTERVAL):
        use_api = True
    else:
        use_api = False
        
    # Danh sách thoại dự phòng khi lỗi mạng hoặc không có API Key
    if not api_key or not use_api:
        if state == 'START':
            return "Hãy chứng minh bạn không phải là quả chuối héo!"
        else:
            if score == 0:
                return "Chưa kịp bay đã rụng rồi sao chuối?"
            elif score < 5:
                return f"Được {score} điểm! Gà lắm chuối ơi."
            elif score < 15:
                return f"Khá đấy! {score} điểm. Cố lên chuối!"
            else:
                return f"Ghê thật! {score} điểm. Siêu chuối!"

    # Thiết lập prompt cho Gemini
    if state == 'START':
        prompt = (
            "Hãy viết 1 câu khích lệ cực ngắn (dưới 12 từ) bằng tiếng Việt "
            "để khuyến khích người chơi bắt đầu game Flappy Bird. Nhân vật là quả chuối công nghệ tên 'Gemini Nano Banana'. "
            "Phong cách retro game, vui nhộn hài hước. Không dùng markdown, dấu ngoặc kép hay định dạng đặc biệt."
        )
    else:
        prompt = (
            f"Người chơi vừa thua cuộc trong game Flappy Bird nhân vật quả chuối công nghệ với số điểm là {score}. "
            f"Hãy viết 1 câu bình luận cực ngắn (dưới 12 từ) bằng tiếng Việt "
            f"để trêu chọc nhẹ nhàng hoặc động viên họ tiếp tục chơi. Phong cách retro game 8-bit, dí dỏm. "
            f"Không dùng markdown, dấu ngoặc kép hay định dạng đặc biệt."
        )

    # API Endpoint của Gemini 2.5 Flash
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    
    last_call_time = now
    
    data = {
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    }
    
    # Tạo request với timeout ngắn
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=7) as response:
            res = json.loads(response.read().decode("utf-8"))
            text = res["candidates"][0]["content"]["parts"][0]["text"].strip()
            # Xử lý dọn dẹp các ký tự thừa
            text = text.replace('"', '').replace("'", "").replace('\n', ' ').strip()
            return text
    except Exception as e:
        print("Error connecting to Gemini API:", e)
        # Trả về câu thoại mặc định nếu lỗi kết nối
        if state == 'START':
            return "Hãy chứng minh bạn không phải là quả chuối héo!"
        else:
            if score == 0:
                return "Chưa kịp bay đã rụng rồi sao chuối?"
            elif score < 5:
                return f"Được {score} điểm! Gà lắm chuối ơi."
            elif score < 15:
                return f"Khá đấy! {score} điểm. Cố lên chuối!"
            else:
                return f"Ghê thật! {score} điểm. Siêu chuối!"
