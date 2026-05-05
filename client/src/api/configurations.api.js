import { http } from "./http.js";

function unwrap(res) {
  if (res && res.success === false && res.error) throw new Error(res.error.message);
  return res;
}

export async function getConfig(key) {
  const res = unwrap(await http(`/api/configurations/${encodeURIComponent(key)}`));
  return res.data;
}
