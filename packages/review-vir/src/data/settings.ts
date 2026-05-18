import {LocalDbClient} from 'local-db-client';
import {assertValidShape, defineShape, exactShape, optionalShape} from 'object-shape-tester';
import {type ServiceAuthTokens} from './auth-tokens.js';

export enum UiColorMode {
    Dark = 'dark',
    Light = 'light',
    Auto = 'auto',
}

export type AppSettings = {
    authTokens: ServiceAuthTokens;
} & typeof nonTokenSettingsShape.runtimeType;

const nonTokenSettingsShape = defineShape({
    userSettings: {
        /** The other modes aren't supported yet. */
        uiColorMode: exactShape(UiColorMode.Light),
    },

    lastSelectedOrg: optionalShape('org name', {
        alsoUndefined: true,
    }),
});

const settingsClientPromise = LocalDbClient.createClient(
    {
        savedSettings: nonTokenSettingsShape,
    },
    {
        storeName: 'review-vir-settings',
    },
);

export async function loadSettings() {
    const client = await settingsClientPromise;
    return client.value.savedSettings || nonTokenSettingsShape.default;
}

export async function saveSettings(
    newSettings: Readonly<Omit<AppSettings, 'authTokens'>>,
): Promise<void> {
    assertValidShape(newSettings, nonTokenSettingsShape, {
        allowExtraKeys: true,
    });
    const client = await settingsClientPromise;
    await client.set.savedSettings(newSettings);
}
