type ValidationOptions = {
    fieldLabel: string;
    allowEmpty?: boolean;
    minLength?: number;
    maxLength?: number;
};

const PROFANITY_PATTERNS = [
    /\bfuck(?:ing|er|ed|s)?\b/i,
    /\bshit(?:ty|ting|ted|s)?\b/i,
    /\bbitch(?:es|y)?\b/i,
    /\bcunt(?:s)?\b/i,
    /\bwanker(?:s)?\b/i,
    /\bslut(?:s)?\b/i,
    /\bwhore(?:s)?\b/i,
    /\btwat(?:s)?\b/i,
    /\bfag(?:got|gots)?\b/i,
    /\bnigg(?:er|ers|a|as)\b/i,
];

export function normalizeModerationText(value: string) {
    return value.replace(/\s+/g, " ").trim();
}

export function containsProfanity(value: string) {
    return PROFANITY_PATTERNS.some((pattern) => pattern.test(value));
}

export function looksLikeSpam(value: string) {
    const normalized = value.trim();

    if (!normalized) return false;

    const repeatedCharPattern = /(.)\1{5,}/i;
    const repeatedWordPattern = /\b(\w+)(?:\s+\1){3,}\b/i;
    const manyUrlsPattern = /((https?:\/\/|www\.)\S+\s*){2,}/i;
    const allCapsLongPattern = /^[A-Z0-9\s!?.-]{20,}$/;
    const symbolFloodPattern = /[!$%^&*()_+=~`|\\<>/?#@-]{8,}/;

    return (
        repeatedCharPattern.test(normalized) ||
        repeatedWordPattern.test(normalized) ||
        manyUrlsPattern.test(normalized) ||
        allCapsLongPattern.test(normalized) ||
        symbolFloodPattern.test(normalized)
    );
}

export function validateModeratedText(
    rawValue: string,
    options: ValidationOptions
): string | null {
    const value = normalizeModerationText(rawValue);

    if (!value) {
        return options.allowEmpty ? null : `${options.fieldLabel} is required.`;
    }

    if (options.minLength && value.length < options.minLength) {
        return `${options.fieldLabel} must be at least ${options.minLength} characters.`;
    }

    if (options.maxLength && value.length > options.maxLength) {
        return `${options.fieldLabel} must be ${options.maxLength} characters or less.`;
    }

    if (containsProfanity(value)) {
        return `${options.fieldLabel} contains blocked language.`;
    }

    if (looksLikeSpam(value)) {
        return `${options.fieldLabel} looks like spam.`;
    }

    return null;
}