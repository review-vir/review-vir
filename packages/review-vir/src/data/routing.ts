import {check} from '@augment-vir/assert';
import {type FullSpaRoute, SpaRouter} from 'spa-router-vir';

export enum ReviewVirMainPath {
    Settings = 'settings',
    CodeReview = 'code-review',
    AnnualReview = 'annual-review',
}

export type ValidReviewVirPaths =
    | [ReviewVirMainPath.Settings]
    | [ReviewVirMainPath.AnnualReview]
    | [
          ReviewVirMainPath.CodeReview,
          /** Organization name. */ string,
      ]
    | [ReviewVirMainPath.CodeReview];

export type ReviewVirFullRoute = Required<
    Readonly<FullSpaRoute<ValidReviewVirPaths, undefined, undefined>>
>;

export const defaultReviewVirFullRoute: Readonly<ReviewVirFullRoute> = {
    hash: undefined,
    paths: [
        ReviewVirMainPath.CodeReview,
    ],
    search: undefined,
} as const;

export function createReviewVirRouter() {
    return new SpaRouter<ValidReviewVirPaths, undefined, undefined>({
        basePath: 'review-vir',
        sanitizeRoute(rawRoute) {
            const sanitizedPaths = sanitizePaths(rawRoute.paths);

            return {
                paths: sanitizedPaths,
                hash: undefined,
                search: undefined,
            };
        },
    });
}

export type ReviewVirRouter = ReturnType<typeof createReviewVirRouter>;

function sanitizePaths(rawPaths: ReadonlyArray<string>): ValidReviewVirPaths {
    const mainPath = rawPaths[0];
    if (mainPath === ReviewVirMainPath.CodeReview) {
        if (rawPaths[1]) {
            return [
                ReviewVirMainPath.CodeReview,
                rawPaths[1],
            ];
        } else {
            return [
                ReviewVirMainPath.CodeReview,
            ];
        }
    } else if (check.isEnumValue(mainPath, ReviewVirMainPath)) {
        return [
            mainPath,
        ];
    } else {
        return defaultReviewVirFullRoute.paths;
    }
}
