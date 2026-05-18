import {check} from '@augment-vir/assert';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const algorithmName = 'AES-GCM';

async function importKey(key: Uint8Array<ArrayBuffer>) {
    const hashedKey = await crypto.subtle.digest('SHA-256', key);
    return await crypto.subtle.importKey('raw', hashedKey, algorithmName, true, [
        'encrypt',
        'decrypt',
    ]);
}

export async function encrypt({
    data,
    secretEncryptionKey,
}: {
    data: string | Uint8Array;
    secretEncryptionKey: string | Uint8Array;
}) {
    const publicInitVector = globalThis.crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
        {
            name: algorithmName,
            iv: publicInitVector,
        },
        await importKey(ensureUint8Array(secretEncryptionKey)),
        ensureUint8Array(data),
    );

    return {
        encryptedData: new Uint8Array(encrypted),
        publicInitVector,
    };
}

export async function decrypt({
    encryptedData,
    secretEncryptionKey,
    publicInitVector,
}: {
    encryptedData: string | Uint8Array;
    secretEncryptionKey: string | Uint8Array;
    publicInitVector: string | Uint8Array;
}): Promise<string> {
    const decrypted = await crypto.subtle.decrypt(
        {
            name: algorithmName,
            iv: ensureUint8Array(publicInitVector),
        },
        await importKey(ensureUint8Array(secretEncryptionKey)),
        ensureUint8Array(encryptedData),
    );
    const decoded = textDecoder.decode(decrypted);
    return decoded;
}

function ensureUint8Array(input: string | Uint8Array): Uint8Array<ArrayBuffer> {
    if (check.isString(input)) {
        return Uint8Array.from(textEncoder.encode(input));
    } else {
        return Uint8Array.from(input);
    }
}
