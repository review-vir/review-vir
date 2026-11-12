import type {Config} from 'pull-request-vir';

/** The repo owner is the `review-vir` org, which can't review, so the maintainer is named directly. */
const maintainer = 'electrovir';

export const config: Config = {
    assignToAuthor: true,
    blockNoMerge: true,
    ignoreDraft: true,
    reviewRules: [
        {
            autoAdd: true,
            users: [
                maintainer,
            ],
            required: 1,
            userOverrides: {
                [maintainer]: {
                    required: 0,
                },
            },
        },
    ],
};
