import base64
import json
import mimetypes
from pathlib import Path

import requests


# ==================== 请在这里填写 ====================
API_URL = "https://botcf.com/v1/images/edits"  # 例如：https://api.example.com/v1/images/edits
API_KEY = "sk-7DmC7b8CaFGtv1CR4vNQvhfAxqF8gdC6gYVlkDE3enQM44P2"
# =====================================================

MODEL = "gpt-image-2"
REFERENCE_DIR = Path(__file__).parent / "claude_chan"
REFERENCE_IMAGE = REFERENCE_DIR / "claude_waiting.png"
OUTPUT_FILE = Path(__file__).parent / "character_full.png"
IMAGE_SIZE = "1024x1536"

# 完整角色绘制提示词
PROMPT = """
以上传的唯一参考图为绝对角色设定，绘制完整的正面全身立绘角色图。

要求：
1. 绘制完整角色：头部、五官、头发、贝雷帽、身体、双手、双腿
2. 正面站立姿势，居中构图
3. 保持参考图的所有特征：
   - 圆润可爱的脸型，琥珀色大眼，温柔笑容
   - 浅棕色蓬松短发，头顶呆毛
   - 奶油色贝雷帽，左侧花朵装饰
   - 奶油色宽松上衣，舒适休闲风格
4. 完整清晰的角色，二次元线稿风格，柔和平涂
5. 纯透明背景（PNG格式）
6. 全身比例协调，边缘清晰，无模糊

完整的正面角色立绘，透明背景，清晰边缘，适合后续在Photoshop中拆分。
""".strip()


def read_reference_images():
    """读取 reference 目录中的参考图并转换为 data URL。"""
    allowed_suffixes = {".png", ".jpg", ".jpeg", ".webp"}
    images = []

    for image_path in sorted(REFERENCE_DIR.iterdir()):
        if image_path.is_file() and image_path.suffix.lower() in allowed_suffixes:
            mime_type = {
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".webp": "image/webp",
            }[image_path.suffix.lower()]
            encoded = base64.b64encode(image_path.read_bytes()).decode("ascii")
            images.append(f"data:{mime_type};base64,{encoded}")

    if not images:
        raise FileNotFoundError(f"参考图目录为空：{REFERENCE_DIR}")

    return images


def generate_image():
    if API_URL.startswith("https://你的") or API_KEY == "在这里填写你的API密钥":
        raise ValueError("请先填写 API_URL 和 API_KEY。")

    headers = {"Authorization": f"Bearer {API_KEY}"}
    form_data = {
        "model": MODEL,
        "prompt": PROMPT,
        "size": IMAGE_SIZE,
        "quality": "high",
    }
    file_handles = []
    files = []

    try:
        for image_path in [REFERENCE_IMAGE]:
            if image_path.is_file() and image_path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}:
                file_handle = image_path.open("rb")
                file_handles.append(file_handle)
                files.append(
                    (
                        "image[]",
                        (image_path.name, file_handle, mimetypes.guess_type(image_path.name)[0] or "application/octet-stream"),
                    )
                )

        response = requests.post(
            API_URL,
            headers=headers,
            data=form_data,
            files=files,
            timeout=300,
        )
    finally:
        for file_handle in file_handles:
            file_handle.close()
    if not response.ok:
        raise RuntimeError(
            f"图片接口请求失败（HTTP {response.status_code}）：\n{response.text}"
        )
    result = response.json()

    image_data = result.get("data", [{}])[0]
    if image_data.get("b64_json"):
        image_bytes = base64.b64decode(image_data["b64_json"])
    elif image_data.get("url"):
        image_bytes = requests.get(image_data["url"], timeout=300).content
    else:
        raise RuntimeError("接口返回中没有找到 b64_json 或 url：\n" + json.dumps(result, ensure_ascii=False, indent=2))

    OUTPUT_FILE.write_bytes(image_bytes)
    print(f"图片已保存到：{OUTPUT_FILE}")


if __name__ == "__main__":
    generate_image()
