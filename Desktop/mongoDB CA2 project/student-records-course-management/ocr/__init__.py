# ocr/__init__.py
from .preprocess import preprocess_image, deskew_image
from .extractor import extract_text, extract_structured_data

__all__ = ["preprocess_image", "deskew_image", "extract_text", "extract_structured_data"]
