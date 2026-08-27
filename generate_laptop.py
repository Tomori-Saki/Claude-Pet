import base64
import json
import mimetypes
from pathlib import Path
import requests


# ==================== API配置 ====================
API_URL = "https://botcf.com/v1/images/edits"
API_KEY = "sk-7DmC7b8CaFGtv1CR4vNQvhfAxqF8gdC6gYVlkDE3enQM44P2"
# ================================================

MODEL = "gpt-image-2"
REFERENCE_IMAGE = Path(__file__).parent / "reference" / "character_full.png"
OUTPUT_DIR = Path(__file__).parent / "reference"
OUTPUT_FILE = OUTPUT_DIR / "laptop_claude.png"
IMAGE_SIZE = "1024x1024"

PROMPT = """
忽略参考图的角色内容，仅绘制一个笔记本电脑的参考图，用于二次元动画场景。

视角设定：
- 摄像机位置在笔记本电脑的右前方45度角
- 从这个角度拍摄，能看到笔记本的右侧面和屏幕背面
- 笔记本电脑打开状态，屏幕背面（外壳）朝向摄像机
- 屏幕内容不可见或只能看到一小部分边缘

要求：
1. 笔记本电脑背面（屏幕外壳）印有Claude的橙色logo标志（圆形橙色图标），清晰可见
2. 能看到笔记本的右侧面、键盘区域的一部分
3. 风格：简洁的二次元动漫风格，线条清晰
4. 颜色：银灰色或白色机身，橙色Claude logo醒目
5. 纯透明背景（PNG格式）
6. 适合作为动画道具参考

从右前方45度角拍摄的笔记本电脑，能看到屏幕背面的Claude logo，透明背景。
""".strip()


def generate_laptop():
    print("正在生成笔记本电脑参考图...")

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
        if REFERENCE_IMAGE.is_file():
            file_handle = REFERENCE_IMAGE.open("rb")
            file_handles.append(file_handle)
            files.append(
                (
                    "image[]",
                    (REFERENCE_IMAGE.name, file_handle, mimetypes.guess_type(REFERENCE_IMAGE.name)[0] or "application/octet-stream"),
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

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_bytes(image_bytes)
    print(f"已保存：{OUTPUT_FILE}")


if __name__ == "__main__":
    generate_laptop()
