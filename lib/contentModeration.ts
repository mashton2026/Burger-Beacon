type ValidationOptions = {
    fieldLabel: string;
    allowEmpty?: boolean;
    minLength?: number;
    maxLength?: number;
};

const PROFANITY_PATTERNS: readonly RegExp[] = [
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

export function normalizeModerationText(value: string): string {
    return value.replace(/\s+/g, " ").trim();
}

export function containsProfanity(value: string): boolean {
    const normalized = normalizeModerationText(value);
    return PROFANITY_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function looksLikeSpam(value: string): boolean {
    const normalized = normalizeModerationText(value);

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

    if (typeof options.minLength === "number" && value.length < options.minLength) {
        return `${options.fieldLabel} must be at least ${options.minLength} characters.`;
    }

    if (typeof options.maxLength === "number" && value.length > options.maxLength) {
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