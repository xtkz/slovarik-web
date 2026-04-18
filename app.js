import { DICT, UPDATED_AT } from './dict.js';

const WORD_COUNT = 20;
const TAIL_WORD_COUNT = 3;
const STORAGE_KEYS = {
    selection: 'slovarik.selection',
    states: 'slovarik.states',
};

const grid = document.querySelector('#grid');
const resetButton = document.querySelector('#reset-button');
const updatedAt = document.querySelector('#updated-at');

function getRandomUniqueWords(arr, count) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, Math.min(count, arr.length));
}

function getSelectionWithTailWords(arr, count, tailCount) {
    const safeTailCount = Math.min(tailCount, count, arr.length);
    const tailWords = arr.slice(-safeTailCount);
    const remainingCount = Math.max(0, count - tailWords.length);
    const pool = arr.slice(0, Math.max(0, arr.length - tailWords.length));
    const randomWords = getRandomUniqueWords(pool, remainingCount);

    return [...randomWords, ...tailWords];
}

function readJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function removeAppState() {
    localStorage.clear();
}

function isValidSelection(selection) {
    const tailWords = DICT.slice(-TAIL_WORD_COUNT);
    return (
        Array.isArray(selection) &&
        selection.length === WORD_COUNT &&
        new Set(selection).size === WORD_COUNT &&
        selection.every((word) => DICT.includes(word)) &&
        tailWords.every((word) => selection.includes(word))
    );
}

function createFreshState() {
    return {
        selection: getSelectionWithTailWords(DICT, WORD_COUNT, TAIL_WORD_COUNT),
        states: {},
    };
}

function loadState() {
    const storedSelection = readJson(STORAGE_KEYS.selection, null);
    const storedStates = readJson(STORAGE_KEYS.states, {});

    if (!isValidSelection(storedSelection)) {
        const fresh = createFreshState();
        saveState(fresh.selection, fresh.states);
        return fresh;
    }

    const selectionSet = new Set(storedSelection);
    const sanitizedStates = {};
    for (const [word, status] of Object.entries(storedStates)) {
        if (selectionSet.has(word) && (status === 'active' || status === 'crossed')) {
            sanitizedStates[word] = status;
        }
    }

    return {
        selection: storedSelection,
        states: sanitizedStates,
    };
}

function saveState(selection, states) {
    writeJson(STORAGE_KEYS.selection, selection);
    writeJson(STORAGE_KEYS.states, states);
}

function renderWord(word, status) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = ['word', status ? `word--${status}` : ''].filter(Boolean).join(' ');
    button.textContent = word;
    button.dataset.word = word;
    button.setAttribute('aria-pressed', status ? 'true' : 'false');

    return button;
}

function renderGrid(state) {
    grid.replaceChildren();
    updatedAt.textContent = UPDATED_AT;

    state.selection.forEach((word) => {
        const status = state.states[word] || '';
        const button = renderWord(word, status);

        button.addEventListener('click', () => {
            const currentStatus = state.states[word];

            if (currentStatus === 'crossed') {
                return;
            }

            const nextStates = { ...state.states };

            if (currentStatus === 'active') {
                nextStates[word] = 'crossed';
            } else {
                nextStates[word] = 'active';
            }

            state.states = nextStates;
            saveState(state.selection, state.states);
            renderGrid(state);
        });

        grid.appendChild(button);
    });
}

function bootstrap() {
    const state = loadState();

    resetButton.addEventListener('click', () => {
        removeAppState();
        const nextState = createFreshState();
        saveState(nextState.selection, nextState.states);
        renderGrid(nextState);
    });

    renderGrid(state);
}

bootstrap();
