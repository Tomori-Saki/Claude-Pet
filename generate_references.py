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
IMAGE_SIZE = "1024x1024"

# 3张参考图的配置
IMAGES_TO_GENERATE = [
    {
        "filename": "character_side.png",
        "prompt": """
基于参考图的角色，绘制侧面视角的半身立绘。

要求：
1. 保持角色特征：橙色长发、白色衬衫、橙色背心
2. 侧面45度角度，面部转向侧面，微笑表情
3. 半身构图（胸部以上）
4. 二次元动漫风格，线条清晰
5. 纯透明背景（PNG格式）
6. 适合作为动画参考的清晰角色侧面图

侧面角色立绘，透明背景，适合seedance2.5动画生成。
""".strip()
    },
    {
        "filename": "character_thinking.png",
        "prompt": """
基于参考图的角色，绘制双手托腮思考表情的立绘。

要求：
1. 保持角色特征：橙色长发、白色衬衫、橙色背心
2. 动作：双手托腮，手掌托着脸颊两侧
3. 表情：略微皱眉思考，眼神看向一侧，嘴角微翘
4. 半身构图（胸部以上）
5. 二次元动漫风格，线条清晰
6. 纯透明背景（PNG格式）
7. 适合表现"思考、考虑"状态的角色图

思考姿势的角色立绘，透明背景，适合seedance2.5动画生成。
""".strip()
    },
    {
        "filename": "character_talking.png",
        "prompt": """
基于参考图的角色，绘制面向观众说话微笑的立绘。

要求：
1. 保持角色特征：橙色长发、白色衬衫、橙色背心
2. 正面构图，面向观众
3. 表情：温柔微笑，嘴巴微张像在说话，眼神友善
4. 姿势：自然放松，可以一只手抬起做讲解手势
5. 半身构图（胸部以上）
6. 二次元动漫风格，线条清晰
7. 纯透明背景（PNG格式）
8. 适合表现"输出结果、说话、交流"状态的角色图

说话表情的角色立绘，透明背景，适合seedance2.5动画生成。
""".strip()
    }
]


def generate_single_image(config):
    """生成单张图片"""
    output_file = OUTPUT_DIR / config["filename"]
    prompt = config["prompt"]

    print(f"\n正在生成：{config['filename']}...")

    headers = {"Authorization": f"Bearer {API_KEY}"}
    form_data = {
        "model": MODEL,
        "prompt": prompt,
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

    output_file.write_bytes(image_bytes)
    print(f"已保存：{output_file}")


def main():
    if not REFERENCE_IMAGE.exists():
        raise FileNotFoundError(f"参考图不存在：{REFERENCE_IMAGE}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"基于参考图：{REFERENCE_IMAGE}")
    print(f"将生成 {len(IMAGES_TO_GENERATE)} 张参考图...")

    for config in IMAGES_TO_GENERATE:
        try:
            generate_single_image(config)
        except Exception as e:
            print(f"生成 {config['filename']} 失败：{e}")
            continue

    print("\n全部完成！")


if __name__ == "__main__":
    main()
