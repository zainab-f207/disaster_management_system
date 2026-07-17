export function extractErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
    const data = err?.response?.data;
    if (!data) return fallback;
    if (typeof data === 'string') return data;
    if (Array.isArray(data)) return data[0] || fallback;
    if (data.message) return data.message;
    if (data.Message) return data.Message;
    if (data.error) return data.error;
    if (data.Error) return data.Error;
    return fallback;
}