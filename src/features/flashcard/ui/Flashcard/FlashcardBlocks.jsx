import { MathFormula, MathText } from "@shared/ui";
import { useI18n } from "@shared/lib/i18n";

// A card drawn from blocks (see buildCardPresentation): each block type is
// one of the card's common pieces. Which blocks a card has, and in what
// order, is the subject profile's business; nothing here knows the subject.

// A value on a scale shows where it sits as filled marks: ■■□ Medium.
const Scale = ({ step, steps }) => (
  <span className="flashcard__scale" aria-hidden="true">
    {Array.from({ length: steps }, (_, index) => (
      <i key={index} className={index < step ? "is-on" : ""} />
    ))}
  </span>
);

const MetaBlock = ({ block }) => {
  const { t } = useI18n();

  return (
    <span className="flashcard__meta">
      {block.items.map((item) => (
        <span key={item.kind} className={`flashcard__meta-item flashcard__meta-item--${item.kind}`}>
          {item.steps ? <Scale step={item.step} steps={item.steps} /> : null}
          {item.labelKey ? t(item.labelKey) : item.value}
        </span>
      ))}
    </span>
  );
};

const TextBlock = ({ block }) => (
  <strong
    className={[
      "flashcard__block-text",
      `flashcard__block-text--${block.role}`,
      block.emphasis ? `flashcard__block-text--${block.emphasis}` : "",
    ].filter(Boolean).join(" ")}
  >
    <MathText>{block.text}</MathText>
  </strong>
);

// Code is shown as text, never run or read as markup, with its line
// numbers in a gutter beside it. A button may only hold phrasing content,
// so the pane is made of spans set like <pre>.
const CodeBlock = ({ block }) => {
  const { t } = useI18n();
  const lines = block.text.split("\n");

  return (
    <span
      className={`flashcard__code flashcard__code--${block.emphasis}`}
      role="group"
      aria-label={t("flashcard.code")}
    >
      {block.labelKey ? <span className="flashcard__block-label">{t(block.labelKey)}</span> : null}
      <code translate="no">
        {lines.map((line, index) => (
          <span className="flashcard__code-line" key={index}>
            <span className="flashcard__code-gutter" aria-hidden="true">{index + 1}</span>
            <span className="flashcard__code-text">{line}{index < lines.length - 1 ? "\n" : ""}</span>
          </span>
        ))}
      </code>
    </span>
  );
};

const ListBlock = ({ block }) => (
  <span className={`flashcard__list flashcard__list--${block.role}`}>
    {block.items.map((item, index) => (
      <span key={`${index}-${item}`} className="flashcard__list-item">
        <MathText>{item}</MathText>
      </span>
    ))}
  </span>
);

const FormulaBlock = ({ block }) => <span className="flashcard__formula"><MathFormula value={block.text} /></span>;
const CalloutBlock = ({ block }) => {
  const { t } = useI18n();
  return <span className={`flashcard__callout flashcard__callout--${block.emphasis}`}>
    {block.labelKey ? <span className="flashcard__block-label">{t(block.labelKey)}</span> : null}
    <strong><MathText>{block.text}</MathText></strong>
  </span>;
};
const SequenceBlock = ({ block }) => {
  const { t } = useI18n();
  return <span className={`flashcard__sequence flashcard__sequence--${block.role}`}>
    {block.labelKey ? <span className="flashcard__block-label">{t(block.labelKey)}</span> : null}
    <span role="list">{block.items.map((item, index) => <span className="flashcard__sequence-item" role="listitem" key={index}>
      <span className="flashcard__sequence-number" aria-hidden="true">{index + 1}</span><span><MathText>{item}</MathText></span>
    </span>)}</span>
  </span>;
};
const BLOCKS = {
  formula: FormulaBlock,
  callout: CalloutBlock,
  sequence: SequenceBlock,
  meta: MetaBlock,
  text: TextBlock,
  code: CodeBlock,
  list: ListBlock,
};

const Blocks = ({ blocks }) =>
  blocks.map((block, index) => {
    const Block = BLOCKS[block.type];
    return Block ? <Block key={`${block.type}-${index}`} block={block} /> : null;
  });

// One face of a card laid out from blocks: its label and the meta blocks in
// the head, the other blocks in the body in order, and the foot every card
// has.
export const FlashcardBlockFace = ({ side, label, blocks = [], hint, isHidden }) => (
  <span className={`flashcard__face flashcard__face--${side}`} aria-hidden={isHidden}>
    <span className="flashcard__head">
      <span className="flashcard__label">{label}</span>
      <Blocks blocks={blocks.filter((block) => block.type === "meta")} />
    </span>
    <span className="flashcard__content flashcard__content--blocks">
      <Blocks blocks={blocks.filter((block) => block.type !== "meta")} />
    </span>
    <span className="flashcard__foot">
      <span className="flashcard__note" />
      <span className="flashcard__hint">{hint}</span>
    </span>
  </span>
);
