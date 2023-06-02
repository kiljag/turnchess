
export function getRandomString(): string {
    let randomId = "";
    for (let i = 0; i < 10; i++) {
        randomId += String.fromCharCode(97 + Math.floor(26 * Math.random()))
    }
    return randomId;
}