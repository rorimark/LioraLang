// The landing page's copy, loaded only by the web landing so the desktop
// app never carries it.
export default {
  "meta": {
    "title": "Liora: Flashcards for Languages, Code, Maths and History",
    "description": "Remember what you study with subject-specific flashcards, spaced repetition and AI drafts. Learn languages, programming, mathematics and history on web, desktop or phone."
  },
  "topbar": {
    "open": "Open app",
    "language": "Language"
  },
  "hero": {
    "title": "Turn what you study **into flashcards.**",
    "text": "Build cards for words, code, formulas or history. Liora schedules reviews from your answers.",
    "start": "Create a deck",
    "download": "Download app",
    "eyebrow": "Flashcards and spaced repetition",
    "note": "Your cards stay on your device. No account needed to start."
  },
  "try": {
    "title": "Try a card"
  },
  "demo": {
    "doneTitle": "Nice work.",
    "doneText": "Each card now has a next review. In the app it returns when it is due.",
    "answers": "Your answers",
    "backIn": "back in {interval}",
    "again": "Study them again",
    "reveal": "Show answer",
    "hintGrade": "How well did you know it? The time is when it comes back.",
    "hintThink": "Recall the answer, then check yourself.",
    "keysGrade": "{keys} grade",
    "keysReveal": "{key} shows the answer",
    "spaceKey": "Space",
    "samples": {
      "programming": {
        "question1": "What does this code return?",
        "answer1": "A new array with each value doubled: [2, 4, 6].",
        "question2": "What does const protect?",
        "answer2": "The binding cannot be reassigned. Properties of an object can still change."
      },
      "mathematics": {
        "question1": "Solve $x^2 = 4$.",
        "answer1": "Two solutions: $x = 2$ and $x = -2$.",
        "question2": "What is the area of a circle with radius $r$?",
        "answer2": "$A = \\pi r^2$."
      },
      "history": {
        "question1": "When was the Bastille stormed?",
        "answer1": "July 14, 1789.",
        "question2": "What did Gutenberg's press change in Europe?",
        "answer2": "It made books easier to reproduce and helped knowledge spread.",
        "context": "French Revolution"
      }
    }
  },
  "ai": {
    "title": "Draft a deck with AI",
    "text": "Choose a subject, context and answer language. AI drafts cards with code, formulas or explanations. Review, edit and select them before saving. An account, internet and remaining daily allowance are required.",
    "try": "Try the assistant",
    "tag": "travel",
    "take": "Fill in"
  },
  "memory": {
    "title": "A review schedule that adapts",
    "text": "Answer Good and a new card comes back in {first}, then {second}, then {third}. {reviews} spread across {span} in this example. The schedule adapts to your answers, so remembered material stops crowding your day.",
    "reviews": {
      "one": "{count} review",
      "other": "{count} reviews"
    },
    "months": {
      "one": "{count} month",
      "other": "{count} months"
    },
    "days": {
      "one": "{count} day",
      "other": "{count} days"
    },
    "years": {
      "one": "{count} year",
      "other": "{count} years"
    },
    "chartLabel": "Days between reviews of one card",
    "day": "day {day}"
  },
  "decks": {
    "title": "Create, import and share decks",
    "text": "Use words and examples, questions and code, problems and formulas, or dates and context. Each subject has its own fields and card design. Export a .lioradeck file to share or keep a copy.",
    "words": {
      "one": "{count} card",
      "other": "{count} cards"
    },
    "examples": {
      "travel": "Travel & Tourism",
      "falseFriends": "JavaScript",
      "business": "Mathematics"
    }
  },
  "hub": {
    "title": "Shared language decks",
    "text": "Find language decks shared by other learners and add them in a click. Programming, mathematics and history decks can be shared as files and synced privately; public Hub publishing currently supports language decks.",
    "browse": "Browse the hub",
    "import": "Import",
    "inLibrary": "In your library"
  },
  "anywhere": {
    "title": "Your library on web and desktop",
    "text": "Study in the browser, on macOS or Windows, or on your phone. Sign in, and your decks, pictures and progress follow you from one to the next.",
    "web": {
      "title": "Web",
      "text": "Any browser, nothing to install"
    },
    "desktop": {
      "title": "macOS & Windows",
      "text": "Desktop app, fully offline"
    },
    "phone": {
      "title": "Phone",
      "text": "Add to Home Screen"
    },
    "synced": "In sync"
  },
  "phone": {
    "title": "Study from your home screen",
    "text": "Add it to your home screen: its own icon, full screen, works offline.",
    "ios": {
      "title": "iPhone and iPad",
      "text": "Safari → Share → Add to Home Screen"
    },
    "android": {
      "title": "Android",
      "text": "Chrome → ⋮ → Install app"
    },
    "open": "Open the web app",
    "offline": "Works offline",
    "fullscreen": "Full screen"
  },
  "faq": {
    "title": "About Liora",
    "items": {
      "free": {
        "q": "Is Liora free?",
        "a": "Local decks and reviews are free and need no account. Account sync and desktop downloads are free too. AI currently allows {count} requests per account per UTC day, subject to provider availability."
      },
      "why": {
        "q": "Why Liora?",
        "a": "One place for different subjects, with fields and card layouts that suit the material. You choose what to learn, review AI drafts before saving, and let spaced repetition plan your reviews."
      },
      "srs": {
        "q": "What is spaced repetition?",
        "a": "Recall an answer, then rate it. Material you remember returns later; a missed card returns sooner. The same scheduling works across subjects."
      },
      "offline": {
        "q": "Does it work offline?",
        "a": "Local cards, editing and reviews work offline. Open the web app online first to cache it. Sync, Hub and AI need internet."
      },
      "languages": {
        "q": "Which languages can I learn?",
        "a": "Any two of these: {languages}."
      },
      "subjects": {
        "q": "What can I study?",
        "a": "Languages, programming, mathematics and history currently have their own fields and card designs. The subject catalog can grow; programming accepts any technology."
      }
    }
  },
  "cta": {
    "title": "Create your first deck"
  },
  "footer": {
    "madeBy": "Made by {name}",
    "github": "GitHub",
    "issues": "Issues",
    "contact": "Contact"
  }
};
