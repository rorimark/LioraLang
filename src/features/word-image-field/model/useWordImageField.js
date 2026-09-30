import { useCallback, useRef, useState } from "react";
import { usePlatformService } from "@shared/providers";
import { normalizeWordImage } from "@shared/core/usecases/cardContent";
import { prepareCardImage } from "@shared/lib/media";
import { useI18n } from "@shared/lib/i18n";

// Choosing, replacing and removing a word's picture. A chosen file is
// resized and stored locally at once, so the form holds only a small
// reference ({ assetId, alt }) and the picture survives going offline,
// a reload, or the form being saved later.
//
// The same path takes a picture from anywhere: a file, a drop, a paste,
// and later a suggestion. Whatever the source, it becomes a stored asset.
export const useWordImageField = ({ value, onChange }) => {
  const mediaRepository = usePlatformService("mediaRepository");
  const { errorText } = useI18n();
  const image = normalizeWordImage(value);
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const requestRef = useRef(0);
  const imageAlt = image?.alt || "";

  const acceptFile = useCallback(
    async (file) => {
      if (!file) {
        return;
      }

      const requestId = requestRef.current + 1;
      requestRef.current = requestId;
      setStatus("processing");
      setErrorMessage("");

      try {
        const prepared = await prepareCardImage(file);
        const saved = await mediaRepository.saveImage(prepared);

        if (requestRef.current === requestId) {
          onChange({ assetId: saved.assetId, alt: imageAlt });
          setStatus("idle");
        }
      } catch (error) {
        if (requestRef.current === requestId) {
          setStatus("error");
          setErrorMessage(errorText(error, "media.errors.saveFailed"));
        }
      }
    },
    [errorText, imageAlt, mediaRepository, onChange],
  );

  const handleFileInputChange = useCallback(
    (event) => {
      const [file] = event.target.files || [];
      event.target.value = "";
      void acceptFile(file);
    },
    [acceptFile],
  );

  const handleDragOver = useCallback((event) => {
    if ([...(event.dataTransfer?.types || [])].includes("Files")) {
      event.preventDefault();
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      setIsDragOver(false);
      const [file] = event.dataTransfer?.files || [];
      void acceptFile(file);
    },
    [acceptFile],
  );

  const handlePaste = useCallback(
    (event) => {
      const file = [...(event.clipboardData?.files || [])].find((item) => item.type.startsWith("image/"));

      if (file) {
        event.preventDefault();
        void acceptFile(file);
      }
    },
    [acceptFile],
  );

  const removeImage = useCallback(() => {
    requestRef.current += 1;
    setStatus("idle");
    setErrorMessage("");
    onChange(null);
  }, [onChange]);

  const handleAltChange = useCallback(
    (event) => {
      if (image) {
        onChange({ ...image, alt: event.target.value });
      }
    },
    [image, onChange],
  );

  return {
    image,
    isProcessing: status === "processing",
    errorMessage,
    isDragOver,
    handleFileInputChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handlePaste,
    removeImage,
    handleAltChange,
  };
};
