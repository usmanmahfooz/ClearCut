# Third-party model licensing

ClearCut application code is licensed under the MIT License. That license does not apply to the RMBG-1.4 model weights.

RMBG-1.4 was developed by BRIA AI. The model card identifies a separate `bria-rmbg-1.4` license and states that use is non-commercial unless a separate commercial agreement applies. Review the current terms and obtain any required access or permissions before using the model:

- Official model card: https://huggingface.co/briaai/RMBG-1.4
- License information: https://bria.ai/bria-huggingface-model-license-agreement/
- Quantized ONNX model mirror used by the Docker build: https://huggingface.co/JCTN/RMBG-1.4/tree/main/onnx

The Dockerfile downloads the model at build time. Building or deploying an image that contains the model does not change its license. Do not use the model commercially unless your agreement permits it.

This file is an informational summary, not legal advice.
