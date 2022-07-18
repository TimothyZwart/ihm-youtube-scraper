import https from "https";

export function getPage(baseUrl, format) {
 return new Promise((resolve, reject) => {
  let req = https.get(`${baseUrl}&fmt=${format !== "xml" ? format : ""}`);
  req.on("response", (res) => {
   resolve(res);
  });
  req.on("error", (err) => {
   reject(err);
  });
 });
}

export default getPage;
