(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const fileInput = $("fileInput");
  const dropzone = $("dropzone");
  const previewStage = $("previewStage");
  const previewImage = $("previewImage");
  const emptyState = $("emptyState");
  const processingOverlay = $("processingOverlay");
  const removeButton = $("removeButton");
  const resizeButton = $("resizeButton");
  const statusMessage = $("statusMessage");
  const widthInput = $("widthInput");
  const heightInput = $("heightInput");
  const keepRatio = $("keepRatio");
  const downloadButton = $("downloadButton");
  const outputDescription = $("outputDescription");
  const originalButton = $("showOriginal");
  const resultButton = $("showResult");

  let sourceFile = null;
  let sourceUrl = "";
  let sourceWidth = 0;
  let sourceHeight = 0;
  let aspectRatio = 1;
  let processedFilename = "";
  let baseProcessedFilename = "";
  let processedUrl = "";
  let originalOutputUrl = "";
  let showingResult = false;

  function message(text, type = "") {
    statusMessage.textContent = text;
    statusMessage.className = "status-message" + (type ? " " + type : "");
  }
  function setBusy(busy) {
    processingOverlay.classList.toggle("hidden", !busy);
    removeButton.disabled = busy || !sourceFile;
    resizeButton.disabled = busy || !processedFilename;
  }
  function setDimensionFields(width, height) {
    widthInput.value = width;
    heightInput.value = height;
  }
  function setDisplayImage(url, isResult) {
    previewImage.src = url;
    previewImage.classList.remove("hidden");
    emptyState.classList.add("hidden");
    showingResult = isResult;
    originalButton.classList.toggle("selected", !isResult);
    resultButton.classList.toggle("selected", isResult);
    outputDescription.textContent = isResult ? "Background removed · transparent PNG" : "Original image";
  }
  function setDownload(url, filename) {
    if (!url) {
      downloadButton.href = "#";
      downloadButton.classList.add("disabled");
      downloadButton.setAttribute("aria-disabled", "true");
      return;
    }
    downloadButton.href = url;
    downloadButton.download = filename || "clearcut-output.png";
    downloadButton.classList.remove("disabled");
    downloadButton.setAttribute("aria-disabled", "false");
  }
  function clearResult() {
    processedFilename = "";
    baseProcessedFilename = "";
    processedUrl = "";
    originalOutputUrl = "";
    setDownload("", "");
    resizeButton.disabled = true;
    resultButton.disabled = true;
    if (sourceUrl) setDisplayImage(sourceUrl, false);
    outputDescription.textContent = "No processed image yet";
  }
  function openFile(file) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      message("Choose a PNG, JPG, JPEG, or WEBP image.", "error");
      return;
    }
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    sourceFile = file;
    sourceUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      sourceWidth = image.naturalWidth;
      sourceHeight = image.naturalHeight;
      aspectRatio = sourceWidth / sourceHeight || 1;
      setDimensionFields(sourceWidth, sourceHeight);
      $("uploadTitle").textContent = file.name;
      $("uploadSubtitle").textContent = "Ready to remove the background";
      $("imageMeta").classList.remove("hidden");
      $("fileName").textContent = file.name;
      $("fileDimensions").textContent = sourceWidth + " × " + sourceHeight;
      removeButton.disabled = false;
      clearResult();
      message("Image loaded. Remove the background when ready.");
    };
    image.onerror = () => message("This image could not be previewed.", "error");
    image.src = sourceUrl;
  }
  async function removeBackground() {
    if (!sourceFile) return;
    setBusy(true);
    message("Processing image on the local CPU model...");
    try {
      const form = new FormData();
      form.append("file", sourceFile);
      const response = await fetch("/remove-background", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Background removal failed.");
      processedFilename = data.filename;
      baseProcessedFilename = data.filename;
      processedUrl = data.url;
      originalOutputUrl = data.url;
      resultButton.disabled = false;
      setDisplayImage(processedUrl, true);
      setDownload(processedUrl, "clearcut-transparent.png");
      setDimensionFields(data.width || sourceWidth, data.height || sourceHeight);
      resizeButton.disabled = false;
      message("Background removed successfully.", "success");
    } catch (error) {
      message(error.message || "Unable to process this image. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  }
  async function resizeImage() {
    if (!processedFilename) {
      message("Remove the background before resizing the output.", "error");
      return;
    }
    const width = Number.parseInt(widthInput.value, 10);
    const height = Number.parseInt(heightInput.value, 10);
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 12000 || height > 12000) {
      message("Enter width and height between 1 and 12,000 pixels.", "error");
      return;
    }
    setBusy(true);
    message("Resizing image...");
    try {
      const response = await fetch("/resize-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: baseProcessedFilename, width, height })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Image resizing failed.");
      processedFilename = data.filename;
      processedUrl = data.url;
      setDisplayImage(processedUrl, true);
      setDownload(processedUrl, "clearcut-" + width + "x" + height + ".png");
      message("Image resized to " + width + " × " + height + " pixels.", "success");
    } catch (error) {
      message(error.message || "Unable to resize this image.", "error");
    } finally {
      setBusy(false);
    }
  }

  dropzone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (event) => {
    openFile(event.target.files && event.target.files[0]);
    fileInput.value = "";
  });
  dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropzone.classList.add("drag-over");
  });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag-over"));
  dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropzone.classList.remove("drag-over");
    openFile(event.dataTransfer.files && event.dataTransfer.files[0]);
  });
  $("clearImage").addEventListener("click", () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    sourceFile = null;
    sourceUrl = "";
    sourceWidth = sourceHeight = 0;
    clearResult();
    previewImage.removeAttribute("src");
    previewImage.classList.add("hidden");
    emptyState.classList.remove("hidden");
    $("imageMeta").classList.add("hidden");
    $("uploadTitle").textContent = "Choose an image";
    $("uploadSubtitle").textContent = "or drag and drop it here";
    removeButton.disabled = true;
    resizeButton.disabled = true;
    setDimensionFields(1200, 1200);
    message("Choose an image to begin.");
  });
  removeButton.addEventListener("click", removeBackground);
  resizeButton.addEventListener("click", resizeImage);
  originalButton.addEventListener("click", () => {
    if (sourceUrl) setDisplayImage(sourceUrl, false);
  });
  resultButton.addEventListener("click", () => {
    if (processedUrl) setDisplayImage(processedUrl, true);
  });
  keepRatio.addEventListener("change", () => {
    message(keepRatio.checked ? "Aspect ratio locking is on." : "Width and height can be changed independently.");
  });
  widthInput.addEventListener("input", () => {
    const width = Number.parseInt(widthInput.value, 10);
    if (keepRatio.checked && width > 0 && aspectRatio > 0) heightInput.value = Math.max(1, Math.round(width / aspectRatio));
    document.querySelectorAll("[data-scale]").forEach(button => button.classList.remove("selected"));
  });
  heightInput.addEventListener("input", () => {
    const height = Number.parseInt(heightInput.value, 10);
    if (keepRatio.checked && height > 0 && aspectRatio > 0) widthInput.value = Math.max(1, Math.round(height * aspectRatio));
    document.querySelectorAll("[data-scale]").forEach(button => button.classList.remove("selected"));
  });
  document.querySelectorAll("[data-scale]").forEach(button => {
    button.addEventListener("click", () => {
      if (!sourceWidth || !sourceHeight) {
        message("Choose an image before selecting a scale.");
        return;
      }
      const scale = Number(button.dataset.scale) / 100;
      setDimensionFields(Math.max(1, Math.round(sourceWidth * scale)), Math.max(1, Math.round(sourceHeight * scale)));
      aspectRatio = sourceWidth / sourceHeight || 1;
      document.querySelectorAll("[data-scale]").forEach(item => item.classList.toggle("selected", item === button));
      message("Target size set to " + widthInput.value + " × " + heightInput.value + " pixels.");
    });
  });
  previewStage.addEventListener("dblclick", () => {
    previewStage.classList.toggle("solid-white");
    previewStage.classList.remove("solid-dark");
  });
  downloadButton.addEventListener("click", (event) => {
    if (downloadButton.classList.contains("disabled")) event.preventDefault();
  });
})();
