import ytdl from "ytdl-core";
import MediaSplit from "media-split";
import fs from "fs";
import https from "https";
import xml2js from "xml2js";
import he from "he";

const streamToString = (stream) => {
 const chunks = [];
 return new Promise((resolve, reject) => {
  stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  stream.on("error", (err) => reject(err));
  stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
 });
};

function get_page(baseUrl, format) {
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

const lang = "en";
const DOWNLOADS = "./downloads";

// const allFileContents = fs.readFileSync("", "utf-8");
const FORMAT = "xml";

const getCaptions = async (xml) => {
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

const getFiles = async (linkOfVideo) => {
 console.log(linkOfVideo);
 let info = await ytdl.getInfo(linkOfVideo);
 const tracks =
  info.player_response.captions.playerCaptionsTracklistRenderer.captionTracks;
 const track = tracks.find((t) => t.languageCode == lang);
 const xmlpageStream = await get_page(track.baseUrl, FORMAT);
 const xml = await streamToString(xmlpageStream);
 const captions = await getCaptions(xml);

 const timeStamps = [];
 const title = info.videoDetails.title;
 const splitDescription = info.videoDetails.description.split(/\r?\n/);
 splitDescription.forEach((entry) => {
  if (entry.match(/^\d:[0-5]\d/)) {
   const [timeStamp] = entry.match(/^\d:[0-5]\d/);
   const [_, after] = entry.split(/^\d:[0-5]\d/);
   timeStamps.push(`[${timeStamp}] ${after}`);
  }
 });

 const folderName = title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
 const folderPath = `${DOWNLOADS}/${folderName}`;
 if (!fs.existsSync(folderPath)) {
  fs.mkdirSync(folderPath);
 }
 //  fs.mkdirSync(folderPath);
 let split = new MediaSplit({
  input: linkOfVideo,
  sections: timeStamps,
  output: folderPath,
  format: "mp3",
  audioonly: true,
 });
 const sections = await split.parse();
 for (let section of sections) {
  const stringList = [];
  const { start, end } = section;
  const [startMin, startSecond] = start ? start.split(":") : ["0", "0"];
  const [endMin, endSecond] = end ? end.split(":") : ["0", "9007199254740991"];
  const startTime = parseInt(startMin) * 60 + parseInt(startSecond);
  const endTime = parseInt(endMin) * 60 + parseInt(endSecond);

  let i = 0;
  while (i < captions.length && captions[i].start < endTime) {
   if (startTime <= Math.ceil(captions[i].start)) {
    stringList.push(captions[i].text);
   }
   i++;
  }
  const combinedString = stringList.join(". ");
  fs.appendFileSync(
   `${DOWNLOADS}/${folderName}/${section.name.split(".")[0]}.txt`,
   combinedString
  );
 }
};

const path = "./videos.txt";
const list = fs.readFileSync(path).toString().split("\n");
list.forEach((el) => {
 getFiles(el);
});
