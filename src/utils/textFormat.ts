export function capitalizeFirst(input: string): string {
    const str = input?.trim();
    if (!str) return "";
    return str[0].toUpperCase() + str.slice(1);
}
