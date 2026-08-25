import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(__dirname, "memory-plugin-demo.html"), "utf8");
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];

const store = {};
globalThis.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => {
    store[k] = String(v);
  },
};
function el() {
  return {
    addEventListener() {},
    innerHTML: "",
    textContent: "",
    value: "",
    style: {},
    disabled: false,
    classList: { add() {}, remove() {}, toggle() {} },
    title: "",
    scrollIntoView() {},
    closest() {
      return null;
    },
    appendChild() {},
    remove() {},
    parentNode: null,
    focus() {},
    setSelectionRange() {},
    getAttribute() {
      return null;
    },
  };
}
const els = {};
globalThis.document = {
  getElementById(id) {
    if (!els[id]) els[id] = el();
    return els[id];
  },
  createElement() {
    return el();
  },
};
globalThis.window = globalThis;
globalThis.SpeechRecognition = undefined;
globalThis.webkitSpeechRecognition = undefined;

eval(
  script +
    `\n;globalThis.MH = {
  parseMemories,
  retrieve,
  makeAnswer,
  resolveStates,
  looksLikeQuery,
  clarifyCardHtml,
  captureAsk,
  ASK_IT,
  ASK_THING,
  reset() {
    memories.length = 0;
    currentState = {};
    store["memory-hook-v16"] = JSON.stringify([]);
  },
  record(text) {
    const list = parseMemories(text);
    list.forEach((memory) => memories.unshift(memory));
    resolveStates();
    return JSON.parse(JSON.stringify(list));
  },
  ask(q) {
    const r = retrieve(q);
    return {
      answer: makeAnswer(r.intent, r.results, r.current) || "",
      intent: r.intent,
      current: r.current,
    };
  },
};`
);

function wait() {
  const t = Date.now() + 3;
  while (Date.now() < t) {}
}
function has(a, e) {
  return String(a).replace(/\s/g, "").includes(String(e).replace(/\s/g, ""));
}

function run(id, inputs, query, check) {
  MH.reset();
  const parsed = [];
  for (const t of inputs) {
    parsed.push(...MH.record(t));
    wait();
  }
  const got = MH.ask(query);
  return { id, pass: check(got, parsed), answer: got.answer, parsed, current: got.current };
}

const checks = [
  ["01", ["我的钥匙放在玄关柜上了。"], "我的钥匙在哪？", (g) => has(g.answer, "玄关柜")],
  [
    "02",
    ["我把红色钥匙放在客厅茶几下面第二个抽屉里了。"],
    "红色钥匙在哪？",
    (g) => has(g.answer, "第二个抽屉"),
  ],
  ["03", ["AirPods 放在卧室床头柜上。"], "我的耳机在哪？", (g) => has(g.answer, "床头柜")],
  [
    "04",
    ["我刚刚顺手把充电线扔书桌左边那个小盒子里了。"],
    "充电线在哪？",
    (g, p) => p[0].type !== "general" && has(g.answer, "小盒子"),
  ],
  [
    "05",
    ["我把它放到电视柜里面了。"],
    "刚才那个东西在哪？",
    (g, p) => p[0].uncertain && /不确定|哪件/.test(g.answer),
  ],
  [
    "06",
    ["钥匙放在茶几上。", "我把钥匙拿到玄关柜了。"],
    "我的钥匙在哪？",
    (g) => has(g.answer, "玄关柜") && !has(g.answer, "茶几"),
  ],
  [
    "07",
    ["钥匙在茶几。", "我把钥匙放到玄关柜。", "刚才又把钥匙放书桌上了。"],
    "我的钥匙在哪？",
    (g) => has(g.answer, "书桌"),
  ],
  [
    "08",
    ["钥匙放茶几。", "AirPods 放床头柜。", "钥匙后来放玄关柜。"],
    "我的 AirPods 在哪？",
    (g) => has(g.answer, "床头柜"),
  ],
  [
    "09",
    ["钥匙放在茶几。", "后来我把钥匙放玄关柜。"],
    "我的钥匙以前放在哪？",
    (g) => has(g.answer, "以前") && has(g.answer, "茶几"),
  ],
  ["10", ["我的充电宝借给小王了。"], "我的充电宝借给谁了？", (g) => has(g.answer, "小王")],
  [
    "11",
    ["充电宝放在书桌上。", "我把充电宝借给小王了。"],
    "充电宝现在在哪？",
    (g) => has(g.answer, "小王") && !has(g.answer, "书桌"),
  ],
  [
    "12",
    ["充电宝借给小王了。", "小王把充电宝还给我了，我放在书桌上。"],
    "充电宝现在在哪？",
    (g) => has(g.answer, "书桌"),
  ],
  [
    "13",
    ["钥匙和钱包都放在玄关柜上。"],
    "我的钱包在哪？",
    (g, p) => p.length === 2 && has(g.answer, "钱包") && has(g.answer, "玄关柜"),
  ],
  [
    "14",
    ["我的黑色 AirPods 放在卧室床头柜第二层。"],
    "黑色耳机在哪？",
    (g) => has(g.answer, "床头柜") && has(g.answer, "第二层"),
  ],
  [
    "15",
    ["黑色钥匙放玄关柜。", "银色钥匙放茶几。"],
    "银色钥匙在哪？",
    (g) => has(g.answer, "茶几") && !has(g.answer, "玄关柜"),
  ],
  ["16", ["我刚刚把钥匙放在玄关柜了。"], "我刚才把钥匙放哪了？", (g) => has(g.answer, "玄关柜")],
  [
    "17",
    ["昨天晚上我把身份证放在书桌抽屉里了。"],
    "我昨天把身份证放哪了？",
    (g) => has(g.answer, "书桌抽屉"),
  ],
  [
    "18",
    ["昨天钥匙放茶几。", "今天我把钥匙放玄关柜。"],
    "我的钥匙现在在哪？",
    (g) => has(g.answer, "玄关柜") && !has(g.answer, "茶几"),
  ],
  [
    "19",
    [
      "我刚回家，顺手把昨天买的那个白色充电宝放到了客厅电视柜最右边的第二个抽屉里面，免得明天出门的时候找不到。",
    ],
    "白色充电宝在哪？",
    (g, p) =>
      p[0].object === "白色充电宝" &&
      !(p[0].location.raw || "").includes("免得") &&
      has(g.answer, "电视柜"),
  ],
  [
    "20",
    ["那个东西应该还在我昨天放的地方。"],
    "那个东西在哪？",
    (g, p) => p[0].uncertain && /不确定|哪件|足够/.test(g.answer),
  ],

  // New: possession transfer
  [
    "21-possession-passive",
    ["护照被妈妈拿走了"],
    "我的护照在哪？",
    (g, p) =>
      p[0].object === "护照" &&
      p[0].person === "妈妈" &&
      p[0].event === "possession_transfer" &&
      p[0].status === "with_person" &&
      has(g.answer, "妈妈那里") &&
      !has(g.answer, "借给"),
  ],
  [
    "22-possession-active",
    ["妈妈拿走我的护照了"],
    "我的护照在哪？",
    (g, p) =>
      p[0].object === "护照" &&
      p[0].person === "妈妈" &&
      p[0].event === "possession_transfer" &&
      has(g.answer, "妈妈那里"),
  ],
  [
    "23-possession-agent",
    ["小王把充电宝拿走了"],
    "充电宝现在在哪？",
    (g, p) =>
      p[0].object === "充电宝" &&
      p[0].person === "小王" &&
      p[0].event === "possession_transfer" &&
      p[0].status === "with_person" &&
      has(g.answer, "小王那里") &&
      !has(g.answer, "借给"),
  ],
  [
    "24-lend-vs-take",
    ["我把充电宝借给小王了"],
    "充电宝现在在哪？",
    (g, p) =>
      p[0].event === "lend" &&
      p[0].status === "lent" &&
      has(g.answer, "借给小王") &&
      !has(g.answer, "那里"),
  ],
];

const R = checks.map((c) => run(...c));

// Clarify: one bubble + one clarify-card; ask text not duplicated in card body
function count(re, s) {
  return (String(s).match(re) || []).length;
}
const clarifyHtml = MH.clarifyCardHtml(MH.ASK_IT);
const clarifyPass =
  count(/class="bubble"/g, clarifyHtml) === 1 &&
  count(/clarify-card/g, clarifyHtml) === 1 &&
  count(/CLARIFY/g, clarifyHtml) === 1 &&
  count(/我可以帮你记/g, clarifyHtml) === 1 &&
  !/我可以帮你记/.test(clarifyHtml.split("clarify-card")[1] || "");

R.push({
  id: "25-clarify-once",
  pass: clarifyPass,
  answer: clarifyPass ? "one bubble + one card" : clarifyHtml,
});

// Voice flow source guard: recognition must not auto-submit
const voiceBlock = script.slice(script.indexOf("recognition.onresult"));
const onresultBlock = voiceBlock.slice(0, voiceBlock.indexOf("recognition.onerror"));
const voicePass =
  /enterVoiceDraft|setVoiceDraftActive\(true\)|voiceDraft/.test(onresultBlock) &&
  !/requestSubmit\(/.test(onresultBlock) &&
  /voiceRetry/.test(script) &&
  /voiceConfirm/.test(script) &&
  /确认发送/.test(html) &&
  /重新录音/.test(html);

R.push({
  id: "26-voice-no-autosubmit",
  pass: voicePass,
  answer: voicePass ? "draft then confirm" : "voice auto-submit still present",
});

R.forEach((c) => {
  console.log(c.id, c.pass ? "PASS" : "FAIL", c.answer || "");
  if (!c.pass && c.parsed) {
    console.log(
      "  parsed",
      JSON.stringify(
        c.parsed.map((m) => ({
          o: m.object,
          p: m.person,
          e: m.event,
          s: m.status,
          u: m.uncertain,
        }))
      )
    );
  }
});

const passed = R.filter((c) => c.pass).length;
console.log("COUNT", `${passed}/${R.length}`);
process.exit(passed === R.length ? 0 : 1);
