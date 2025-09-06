
export const getSID = () => {
  const K = "paf.sid";
  let sid = localStorage.getItem(K);
  if (!sid) {
    sid = "sid_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(K, sid);
  }
  return sid;
};
