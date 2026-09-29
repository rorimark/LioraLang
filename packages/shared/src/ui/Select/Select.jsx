import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiChevronDown, FiSearch } from "react-icons/fi";
import {
  filterSelectOptions,
  findTypeaheadIndex,
  readSelectOptions,
  stepSelectIndex,
} from "./selectOptions";
import "./Select.css";

// Phones get a sheet from the bottom of the screen: big rows within a
// thumb's reach. Everything else gets a list that drops from the field.
const SHEET_QUERY = "(max-width: 640px), (pointer: coarse) and (max-height: 540px)";
const SEARCH_THRESHOLD = 9;
const LIST_GAP = 6;
const LIST_MAX_HEIGHT = 320;
const TYPEAHEAD_RESET_MS = 700;

const useIsSheet = () => {
  const [isSheet, setIsSheet] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(SHEET_QUERY).matches
      : false,
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const query = window.matchMedia(SHEET_QUERY);
    const update = () => setIsSheet(query.matches);
    query.addEventListener?.("change", update);

    return () => query.removeEventListener?.("change", update);
  }, []);

  return isSheet;
};

// Where the dropped list goes: under the field, or over it when there is
// more room above, never past the edges of the window.
const measurePlacement = (triggerElement) => {
  const rect = triggerElement.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const spaceBelow = viewportHeight - rect.bottom - LIST_GAP - 8;
  const spaceAbove = rect.top - LIST_GAP - 8;
  const isAbove = spaceBelow < Math.min(LIST_MAX_HEIGHT, 200) && spaceAbove > spaceBelow;
  const width = Math.min(Math.max(rect.width, 200), viewportWidth - 16);
  const left = Math.min(Math.max(8, rect.left), viewportWidth - width - 8);

  return {
    left,
    width,
    maxHeight: Math.max(120, Math.min(LIST_MAX_HEIGHT, isAbove ? spaceAbove : spaceBelow)),
    ...(isAbove
      ? { bottom: viewportHeight - rect.top + LIST_GAP }
      : { top: rect.bottom + LIST_GAP }),
    isAbove,
  };
};

export const Select = memo(
  ({
    id,
    name,
    value,
    onChange,
    children,
    disabled = false,
    className = "",
    variant = "key",
    label = "",
    searchable,
    placeholder = "Choose...",
    "aria-label": ariaLabel,
  }) => {
    const options = useMemo(() => readSelectOptions(children), [children]);
    const selectedIndex = options.findIndex((option) => option.value === String(value ?? ""));
    const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;
    const isSearchable = searchable ?? options.length >= SEARCH_THRESHOLD;
    const isSheet = useIsSheet();

    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(-1);
    const [placement, setPlacement] = useState(null);
    const [labelText, setLabelText] = useState("");

    const baseId = useId();
    const listId = `${baseId}-list`;
    const triggerRef = useRef(null);
    const popupRef = useRef(null);
    const listRef = useRef(null);
    const searchRef = useRef(null);
    const typeaheadRef = useRef({ text: "", timer: 0 });

    const visibleOptions = useMemo(
      () => (isSearchable ? filterSelectOptions(options, query) : options),
      [isSearchable, options, query],
    );

    const emitChange = useCallback(
      (nextValue) => {
        if (nextValue === String(value ?? "")) {
          return;
        }

        const target = { name, value: nextValue, id };
        onChange?.({ target, currentTarget: target });
      },
      [id, name, onChange, value],
    );

    const open = useCallback(() => {
      if (disabled) {
        return;
      }

      setQuery("");
      setActiveIndex(Math.max(selectedIndex, 0));
      // The sheet shows what is being chosen; a field labelled by a
      // <label for> passes that text on.
      const labelElement = id
        ? document.querySelector(`label[for="${CSS.escape(id)}"]`)
        : triggerRef.current?.closest("label");
      setLabelText(labelElement?.textContent?.trim() || "");
      setIsOpen(true);
    }, [disabled, id, selectedIndex]);

    const close = useCallback((shouldRefocus = true) => {
      setIsOpen(false);
      setPlacement(null);

      if (shouldRefocus) {
        triggerRef.current?.focus({ preventScroll: true });
      }
    }, []);

    const choose = useCallback(
      (option) => {
        if (!option || option.disabled) {
          return;
        }

        emitChange(option.value);
        close();
      },
      [close, emitChange],
    );

    // Typing letters jumps to the next option that starts with them, the
    // way a native select does, whether the list is open or not.
    const typeahead = useCallback(
      (key, list, fromIndex) => {
        const state = typeaheadRef.current;
        window.clearTimeout(state.timer);
        state.text += key;
        state.timer = window.setTimeout(() => {
          state.text = "";
        }, TYPEAHEAD_RESET_MS);

        const start = state.text.length > 1 ? fromIndex - 1 : fromIndex;
        return findTypeaheadIndex(list, state.text, start);
      },
      [],
    );

    useLayoutEffect(() => {
      if (!isOpen || isSheet || !triggerRef.current) {
        return undefined;
      }

      const update = () => setPlacement(measurePlacement(triggerRef.current));
      update();
      window.addEventListener("resize", update);
      window.addEventListener("scroll", update, true);

      return () => {
        window.removeEventListener("resize", update);
        window.removeEventListener("scroll", update, true);
      };
    }, [isOpen, isSheet]);

    // Focus goes into the list (or its search field) once it is on screen;
    // the dropped list first needs its place measured.
    const isPopupShown = isOpen && (isSheet || placement !== null);

    useEffect(() => {
      if (!isPopupShown) {
        return;
      }

      // On a phone the search field waits for a tap: focusing it would pull
      // up the keyboard over half the list.
      const target = isSearchable && !isSheet ? searchRef.current : listRef.current;
      target?.focus({ preventScroll: true });
    }, [isPopupShown, isSearchable, isSheet]);

    // A press anywhere else closes it.
    useEffect(() => {
      if (!isOpen) {
        return undefined;
      }

      const handlePointerDown = (event) => {
        if (
          popupRef.current?.contains(event.target) ||
          triggerRef.current?.contains(event.target)
        ) {
          return;
        }

        close(false);
      };

      document.addEventListener("pointerdown", handlePointerDown, true);

      return () => document.removeEventListener("pointerdown", handlePointerDown, true);
    }, [close, isOpen]);

    // Keep the highlighted option in view.
    useEffect(() => {
      if (!isOpen || activeIndex < 0) {
        return;
      }

      const element = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
      element?.scrollIntoView?.({ block: "nearest" });
    }, [activeIndex, isOpen, visibleOptions]);

    useEffect(() => () => window.clearTimeout(typeaheadRef.current.timer), []);

    const handleTriggerKeyDown = (event) => {
      if (disabled) {
        return;
      }

      if (isOpen && event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        open();
        return;
      }

      if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const index = typeahead(event.key, options, selectedIndex);

        if (index >= 0) {
          event.preventDefault();
          emitChange(options[index].value);
        }
      }
    };

    const handleListKeyDown = (event) => {
      const lastIndex = visibleOptions.length - 1;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setActiveIndex((index) => stepSelectIndex(visibleOptions, Math.max(index, -1), 1));
          return;
        case "ArrowUp":
          event.preventDefault();
          setActiveIndex((index) =>
            stepSelectIndex(visibleOptions, index < 0 ? lastIndex + 1 : index, -1),
          );
          return;
        case "Home":
          if (event.target === listRef.current) {
            event.preventDefault();
            setActiveIndex(stepSelectIndex(visibleOptions, -1, 1));
          }
          return;
        case "End":
          if (event.target === listRef.current) {
            event.preventDefault();
            setActiveIndex(stepSelectIndex(visibleOptions, lastIndex + 1, -1));
          }
          return;
        case "Enter":
          event.preventDefault();
          choose(visibleOptions[activeIndex]);
          return;
        case " ":
          if (event.target === listRef.current) {
            event.preventDefault();
            choose(visibleOptions[activeIndex]);
          }
          return;
        case "Escape":
          event.preventDefault();
          event.stopPropagation();
          close();
          return;
        case "Tab":
          close(false);
          return;
        default:
          if (
            event.target === listRef.current &&
            event.key.length === 1 &&
            !event.metaKey &&
            !event.ctrlKey &&
            !event.altKey
          ) {
            const index = typeahead(event.key, visibleOptions, activeIndex);

            if (index >= 0) {
              setActiveIndex(index);
            }
          }
      }
    };

    const activeOption = visibleOptions[activeIndex];
    const activeOptionId = activeOption ? `${baseId}-option-${activeIndex}` : undefined;
    const title = label || ariaLabel || labelText;

    const list = (
      <ul
        ref={listRef}
        id={listId}
        className="ui-select__list"
        role="listbox"
        tabIndex={-1}
        aria-label={title || undefined}
        aria-activedescendant={isSearchable ? undefined : activeOptionId}
        onKeyDown={handleListKeyDown}
      >
        {visibleOptions.length === 0 ? (
          <li className="ui-select__empty" role="presentation">
            Nothing matches “{query.trim()}”.
          </li>
        ) : (
          visibleOptions.map((option, index) => {
            const isSelected = option.value === String(value ?? "");
            const optionClassName = [
              "ui-select__option",
              isSelected ? "is-selected" : "",
              index === activeIndex ? "is-active" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <li
                key={`${option.value}-${index}`}
                id={`${baseId}-option-${index}`}
                data-index={index}
                className={optionClassName}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                onPointerMove={() => setActiveIndex(index)}
                onClick={() => choose(option)}
              >
                <span>{option.label}</span>
                {isSelected ? <FiCheck aria-hidden="true" /> : null}
              </li>
            );
          })
        )}
      </ul>
    );

    const search = isSearchable ? (
      <label className="ui-select__search">
        <FiSearch aria-hidden="true" />
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleListKeyDown}
          placeholder="Search"
          aria-label={title ? `Search ${title}` : "Search options"}
          aria-controls={listId}
          aria-activedescendant={activeOptionId}
          autoComplete="off"
          spellCheck={false}
        />
      </label>
    ) : null;

    const rootClassName = [
      "ui-select",
      `ui-select--${variant}`,
      isOpen ? "is-open" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <span className={rootClassName}>
        <button
          ref={triggerRef}
          id={id}
          type="button"
          className="ui-select__trigger"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listId : undefined}
          aria-label={ariaLabel}
          disabled={disabled}
          onClick={() => (isOpen ? close() : open())}
          onKeyDown={handleTriggerKeyDown}
        >
          <span className={selectedOption ? "ui-select__value" : "ui-select__value is-placeholder"}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <FiChevronDown className="ui-select__chevron" aria-hidden="true" />
        </button>

        {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}

        {/* The open list lives on <body>: fixed positioning inside a
            container query or a transformed ancestor would be measured
            from that ancestor instead of the window. */}
        {isOpen && isSheet && typeof document !== "undefined" ? createPortal(
          <span className="ui-select__sheet-layer">
            <span className="ui-select__backdrop" aria-hidden="true" />
            <span
              ref={popupRef}
              className="ui-select__sheet"
              role="dialog"
              aria-modal="true"
              aria-label={title || "Choose an option"}
            >
              <span className="ui-select__handle" aria-hidden="true" />
              {title ? <strong className="ui-select__title">{title}</strong> : null}
              {search}
              {list}
            </span>
          </span>,
          document.body,
        ) : null}

        {isOpen && !isSheet && placement && typeof document !== "undefined" ? createPortal(
          <span
            ref={popupRef}
            className={
              placement.isAbove ? "ui-select__popover is-above" : "ui-select__popover"
            }
            style={{
              left: placement.left,
              width: placement.width,
              top: placement.top,
              bottom: placement.bottom,
              maxHeight: placement.maxHeight,
            }}
          >
            {search}
            {list}
          </span>,
          document.body,
        ) : null}
      </span>
    );
  },
);

Select.displayName = "Select";
