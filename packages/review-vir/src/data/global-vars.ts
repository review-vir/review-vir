import {isValidShape} from 'object-shape-tester';
import {AuthTokensByService, authTokensByServiceShape} from './auth-tokens';

declare var VITE_INJECTED_SECRETS_FILE: {authTokens: AuthTokensByService} | undefined;
declare var VITE_INJECTED_ENCRYPTION_KEY: string | undefined;

const viteInjectedSecretsFile =
    typeof VITE_INJECTED_SECRETS_FILE === 'undefined' ? undefined : VITE_INJECTED_SECRETS_FILE;
const viteInjectedEncryptionKey =
    typeof VITE_INJECTED_ENCRYPTION_KEY === 'undefined' ? undefined : VITE_INJECTED_ENCRYPTION_KEY;

export const globalVars = {
    devAuthTokens: isValidShape(viteInjectedSecretsFile?.authTokens, authTokensByServiceShape)
        ? viteInjectedSecretsFile.authTokens
        : ({} as typeof authTokensByServiceShape.runTimeType),
    encryptionKey: viteInjectedEncryptionKey,
} as const;
