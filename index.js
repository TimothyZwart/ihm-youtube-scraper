import ytdl from "ytdl-core";
import MediaSplit from "media-split";
import fs from "fs";
import xml2js from "xml2js";
import he from "he";
import https from "https";

const streamToString = (stream) => {
 const chunks = [];
 return new Promise((resolve, reject) => {
  stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  stream.on("error", (err) => reject(err));
  stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
 });
};

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

const lang = "en";
const DOWNLOADS = "./downloads";
const FORMAT = "xml";

const getFiles = async (linkOfVideo) => {
 let info = await ytdl.getInfo(linkOfVideo);

 const title = info.videoDetails.title;
 const folderName = title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
 const folderPath = `${DOWNLOADS}/${folderName}`;
 if (!fs.existsSync(folderPath)) {
  fs.mkdirSync(folderPath);
 }

 if (
  info.player_response &&
  info.player_response.captions &&
  info.player_response.captions.playerCaptionsTracklistRenderer
 ) {
  const tracks =
   info.player_response.captions.playerCaptionsTracklistRenderer.captionTracks;
  const track = tracks.find((t) => t.languageCode == lang);
  if (track) {
   const xmlpageStream = await getPage(track.baseUrl, FORMAT);
   const xml = await streamToString(xmlpageStream);
   const captions = await getCaptions(xml);
   const textList = [];

   captions.forEach((cap) => {
    textList.push(cap.text);
   });

   const combinedCaptions = textList.join(". ");
   fs.appendFileSync(
    `${DOWNLOADS}/${folderName}/${title}.txt`,
    combinedCaptions
   );
  }
 }

 let split = new MediaSplit({
  input: linkOfVideo,
  sections: [`[00:00] ${title}`],
  output: folderPath,
  format: "wav",
  audioonly: true,
 });

 await split.parse();
};

const path = "./videos.txt";
const list = fs.readFileSync(path).toString().split("\n");
list.forEach((el) => {
 getFiles(el);
});
