import fetch from "node-fetch";

export type Credentials = {
    credential: string;
    approvedAt: number;
    address: string;
    fractalId: string;
    validUntil: number;
    proof: string;
};

export const fetchCredential = (message: string, signature: string) => {
    const encMessage = encodeURIComponent(message);
    const url = `https://credentials.next.fractal.id?message=${encMessage}&signature=${signature}`;
    return fetch(url);
};
