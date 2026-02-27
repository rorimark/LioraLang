import { memo } from "react";
import { useRuntimeErrorModal } from "../../model";
import { RuntimeErrorModal } from "../RuntimeErrorModal/RuntimeErrorModal";

export const RuntimeErrorPresenter = memo(() => {
  const {
    isOpen,
    title,
    message,
    details,
    closeModal,
  } = useRuntimeErrorModal();

  return (
    <RuntimeErrorModal
      isOpen={isOpen}
      title={title}
      message={message}
      details={details}
      onClose={closeModal}
    />
  );
});

RuntimeErrorPresenter.displayName = "RuntimeErrorPresenter";
