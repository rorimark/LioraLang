// A focused control owns its keys, including descendants such as icons.
// The flashcard remains part of the desk so configured study shortcuts work.
export const isInteractiveEventTarget = target => {
  if (target?.isContentEditable) return true;
  const control = target?.closest?.('input, textarea, select, option, button, a[href], [role="combobox"], [role="listbox"], [role="slider"], [role="textbox"], [contenteditable=""], [contenteditable="true"]');
  return Boolean(control && !control.matches("button.flashcard"));
};
