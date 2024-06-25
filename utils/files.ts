import fs from "fs";

export type Addresses = Record<string, Record<string, string>>;

export async function load<T>(path: string): Promise<T> {
    return new Promise((resolve, reject) => {
        fs.readFile(path, "utf8", (err, data) => {
            if (err) reject(err);
            resolve(JSON.parse(data));
        });
    });
}

export async function dump(path: string, addresses: object) {
    return new Promise<void>((resolve, reject) => {
        fs.writeFile(path, JSON.stringify(addresses), (err) => {
            if (err) reject(err);
            resolve();
        });
    });
}

export async function reshape(
    addresses: Record<string, Record<string, string>>,
    data: Record<string, string>,
    chainId: number,
) {
    const index = String(chainId);
    if (!addresses?.[index]) {
        addresses[index] = {};
    }

    addresses[index] = {
        ...addresses[index],
        ...data,
    };

    return addresses;
}
