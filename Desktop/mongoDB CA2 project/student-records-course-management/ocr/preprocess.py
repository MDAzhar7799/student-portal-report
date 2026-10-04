"""
=============================================================
preprocess.py — Image Preprocessing with OpenCV
=============================================================
Technology: Python + OpenCV (cv2)
Purpose: Enhance image quality before OCR text extraction.
         Improves pytesseract accuracy significantly.
=============================================================
"""

import cv2
import numpy as np
import os


def preprocess_image(image_path: str, output_suffix: str = "_processed") -> str:
    """
    Preprocess an image using OpenCV for optimal OCR performance.

    Steps:
    1. Load image with OpenCV
    2. Convert to grayscale
    3. Apply Gaussian blur to reduce noise
    4. Apply adaptive thresholding (binarization)
    5. Deskew (straighten) the image
    6. Remove borders/noise
    7. Save processed image

    Args:
        image_path: Path to original image
        output_suffix: Suffix for output filename

    Returns:
        Path to processed image
    """
    # Step 1: Load image with OpenCV
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not load image from: {image_path}")

    # Step 2: Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Step 3: Noise reduction using Gaussian blur
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # Step 4: Adaptive thresholding — binarizes the image
    # Better than simple threshold for varying lighting conditions
    binary = cv2.adaptiveThreshold(
        blurred,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        11,  # Block size
        2    # Constant subtracted from mean
    )

    # Step 5: Deskew (correct rotation)
    deskewed = _deskew(binary)

    # Step 6: Morphological operations to clean noise
    kernel = np.ones((1, 1), np.uint8)
    cleaned = cv2.morphologyEx(deskewed, cv2.MORPH_CLOSE, kernel)

    # Step 7: Scale up for better OCR accuracy
    h, w = cleaned.shape
    if h < 600:
        scale = 2.0
        cleaned = cv2.resize(cleaned, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)

    # Save processed image
    base, ext = os.path.splitext(image_path)
    output_path = f"{base}{output_suffix}{ext}"
    cv2.imwrite(output_path, cleaned)

    return output_path


def _deskew(image: np.ndarray) -> np.ndarray:
    """
    Deskew image using OpenCV moment-based method.
    Detects and corrects text rotation for better OCR accuracy.
    """
    try:
        # Find text coordinates using moments
        coords = np.column_stack(np.where(image > 0))
        if len(coords) == 0:
            return image

        angle = cv2.minAreaRect(coords)[-1]

        # Correct rotation angle
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle

        # Only deskew if angle is significant (> 0.5 degrees)
        if abs(angle) < 0.5:
            return image

        # Apply rotation correction
        (h, w) = image.shape
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(
            image, M, (w, h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE
        )
        return rotated
    except Exception:
        return image


def enhance_contrast(image: np.ndarray) -> np.ndarray:
    """Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)."""
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    return clahe.apply(image)


def remove_background_noise(image: np.ndarray, threshold: int = 128) -> np.ndarray:
    """Remove salt-and-pepper noise using median filter."""
    return cv2.medianBlur(image, 3)


def get_image_info(image_path: str) -> dict:
    """Get image metadata for debugging."""
    img = cv2.imread(image_path)
    if img is None:
        return {"error": "Could not load image"}

    h, w = img.shape[:2]
    channels = img.shape[2] if len(img.shape) == 3 else 1

    return {
        "width": w,
        "height": h,
        "channels": channels,
        "size_bytes": os.path.getsize(image_path),
        "aspect_ratio": round(w / h, 2),
    }
