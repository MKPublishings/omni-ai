import base64


def encode_image(image_bytes: bytes) -> str:
    return base64.b64encode(image_bytes).decode("utf-8")


def decode_image(value: str) -> bytes:
    return base64.b64decode(value.encode("utf-8"))