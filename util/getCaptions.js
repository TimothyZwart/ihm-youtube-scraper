import xml2js from "xml2js";
import he from "he";

export const getCaptions = async (xml) => {
 const result = await new Promise((resolve, reject) => {
  xml2js.parseString(xml, (err, result) => {
   if (err) {
    reject(err);
   } else {
    resolve(result);
   }
  });
 });

 const list = [];
 result.transcript.text.forEach((el) => {
  const text = el["_"];
  const time = el["$"];
  const start = parseFloat(time.start);
  const end = parseFloat(time.dur) + start;
  list.push({
   text: he.decode(text),
   start: parseFloat(time.start),
   end: end,
  });
 });
 list.sort((a, b) => a.start - b.start);
 return list;
};

export default getCaptions;
