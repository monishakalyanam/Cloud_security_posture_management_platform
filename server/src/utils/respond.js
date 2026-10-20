// Every successful response has the same shape: { success: true, data: ... }
export const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
