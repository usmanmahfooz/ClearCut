import os
import numpy as np
from PIL import Image, ImageOps
import onnxruntime as ort


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "model_quantized.onnx"
)


class BackgroundRemover:

    def __init__(self):
        print("Loading RMBG-1.4...")

        self.session = ort.InferenceSession(
            MODEL_PATH,
            providers=["CPUExecutionProvider"]
        )

        self.input_name = self.session.get_inputs()[0].name
        self.output_name = self.session.get_outputs()[0].name

        print("RMBG model loaded.")
        print("Input:", self.input_name)
        print("Output:", self.output_name)

    def remove(self, image: Image.Image) -> Image.Image:
        # Handle EXIF orientation
        image = ImageOps.exif_transpose(image)
        original_width, original_height = image.size

        # Prepare RGB input for RMBG model (requires 3 channels)
        if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
            converted_rgba = image.convert("RGBA")
            rgb_for_model = Image.new("RGB", (original_width, original_height), (255, 255, 255))
            rgb_for_model.paste(converted_rgba, mask=converted_rgba.split()[3])
            original = converted_rgba
        else:
            rgb_for_model = image.convert("RGB")
            original = image.convert("RGB")

        # RMBG-1.4 expects a 1024x1024 model input
        resized = rgb_for_model.resize((1024, 1024), Image.Resampling.BILINEAR)
        image_np = np.asarray(resized, dtype=np.float32)
        image_np = np.transpose(image_np, (2, 0, 1))
        image_np = np.expand_dims(image_np, axis=0)

        # RMBG preprocessing
        image_np = image_np / 255.0
        image_np = image_np - np.array(
            [0.5, 0.5, 0.5],
            dtype=np.float32
        ).reshape(1, 3, 1, 1)

        result = self.session.run(
            [self.output_name],
            {self.input_name: image_np}
        )[0]

        mask = result[0][0]
        mask_min = mask.min()
        mask_max = mask.max()
        mask = (mask - mask_min) / (mask_max - mask_min + 1e-8)
        mask = (mask * 255).clip(0, 255).astype(np.uint8)

        mask_image = Image.fromarray(mask, mode="L")
        mask_image = mask_image.resize(
            (original_width, original_height),
            Image.Resampling.LANCZOS
        )

        # Preserve existing transparency when the source already has alpha.
        if image.mode == "RGBA":
            orig_alpha = image.split()[3]
            combined_mask = np.minimum(np.asarray(orig_alpha), np.asarray(mask_image))
            mask_image = Image.fromarray(combined_mask, mode="L")

        output = original.convert("RGBA")
        output.putalpha(mask_image)
        return output
